package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// TestLatestCliVersionStoreCachesAndRefreshes — locks in the central promise
// of the store: a hot cache serves stale values without ever touching the
// upstream, and a TTL-expired entry triggers exactly one refresh regardless
// of how many concurrent Get() calls land.
func TestLatestCliVersionStoreCachesAndRefreshes(t *testing.T) {
	var calls int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"tag_name": "v1.2.3"})
	}))
	t.Cleanup(server.Close)

	s := NewLatestCliVersionStore()
	s.url = server.URL

	// Cold cache: first Get returns "" while a background refresh fires.
	if v := s.Get(); v != "" {
		t.Errorf("cold cache should be empty, got %q", v)
	}
	if err := waitFor(func() bool { return atomic.LoadInt64(&calls) == 1 }, time.Second); err != nil {
		t.Fatalf("refresh never fired: %v", err)
	}
	if err := waitFor(func() bool { return s.Get() == "v1.2.3" }, time.Second); err != nil {
		t.Fatalf("cache never populated: %v", err)
	}

	// Hot cache: repeated Gets must not re-hit the upstream.
	before := atomic.LoadInt64(&calls)
	for i := 0; i < 20; i++ {
		if v := s.Get(); v != "v1.2.3" {
			t.Errorf("hot cache changed value mid-test: %q", v)
		}
	}
	if got := atomic.LoadInt64(&calls); got != before {
		t.Errorf("hot cache leaked %d upstream calls (expected 0)", got-before)
	}

	// Expire the cache and verify exactly one refresh fires for a burst of
	// concurrent reads. The single-flight guard is the only reason this
	// store is safe to call from every page-load handler.
	s.mu.Lock()
	s.fetchedAt = time.Now().Add(-2 * latestCliVersionTTL)
	s.mu.Unlock()

	before = atomic.LoadInt64(&calls)
	done := make(chan struct{})
	for i := 0; i < 10; i++ {
		go func() {
			s.Get()
			done <- struct{}{}
		}()
	}
	for i := 0; i < 10; i++ {
		<-done
	}
	if err := waitFor(func() bool {
		s.mu.RLock()
		defer s.mu.RUnlock()
		return !s.refreshing
	}, time.Second); err != nil {
		t.Fatalf("refresh never completed: %v", err)
	}
	if got := atomic.LoadInt64(&calls) - before; got != 1 {
		t.Errorf("expected single-flight refresh, got %d upstream calls", got)
	}
}

// TestLatestCliVersionStoreDisabledNeverCallsUpstream — when
// MULTICA_DISABLE_RELEASE_CHECK is on, Get must short-circuit before doing
// anything. This is the air-gapped / restricted-egress self-host promise:
// the server never reaches out to api.github.com no matter how often the
// handler is called.
func TestLatestCliVersionStoreDisabledNeverCallsUpstream(t *testing.T) {
	t.Setenv("MULTICA_DISABLE_RELEASE_CHECK", "1")
	var calls int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"tag_name": "v1.2.3"})
	}))
	t.Cleanup(server.Close)

	s := NewLatestCliVersionStore()
	s.url = server.URL

	for i := 0; i < 5; i++ {
		if v := s.Get(); v != "" {
			t.Errorf("disabled store should always return empty, got %q", v)
		}
	}
	// Give any (mistakenly) launched goroutine a moment to fire before we check.
	time.Sleep(50 * time.Millisecond)
	if got := atomic.LoadInt64(&calls); got != 0 {
		t.Errorf("disabled store leaked %d upstream call(s)", got)
	}
}

// TestGetLatestCliVersionHandlerReturnsNullOnColdCache — the handler is the
// only path the frontend takes, so it has to render the null-when-unknown
// shape that runtimeKeys.latestVersion treats as "no update prompt".
func TestGetLatestCliVersionHandlerReturnsNullOnColdCache(t *testing.T) {
	store := NewLatestCliVersionStore()
	store.disabled = true // skip upstream lookup; cold cache stays empty
	h := &Handler{LatestCliVersion: store}

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/cli/latest-version", nil)
	h.GetLatestCliVersion(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp struct {
		Version *string `json:"version"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Version != nil {
		t.Errorf("expected null version on cold/disabled cache, got %v", *resp.Version)
	}
}

// TestLatestCliVersionStoreUpstreamFailureKeepsStaleValue — when GitHub is
// unreachable or rate-limits us, we keep serving the last good value rather
// than flipping back to "". This is what makes the frontend prompt stable
// even when self-host deploys lose internet for a minute.
func TestLatestCliVersionStoreUpstreamFailureKeepsStaleValue(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	t.Cleanup(server.Close)

	s := NewLatestCliVersionStore()
	s.url = server.URL
	s.mu.Lock()
	s.version = "v9.9.9"
	s.fetchedAt = time.Now().Add(-2 * latestCliVersionTTL)
	s.mu.Unlock()

	got := s.Get()
	if got != "v9.9.9" {
		t.Errorf("expected stale value to survive upstream 5xx, got %q", got)
	}
	if err := waitFor(func() bool {
		s.mu.RLock()
		defer s.mu.RUnlock()
		return !s.refreshing
	}, time.Second); err != nil {
		t.Fatalf("refresh never completed: %v", err)
	}
	// Version unchanged after the failed refresh.
	if s.Get() != "v9.9.9" {
		t.Errorf("failed refresh clobbered cached value")
	}
}

func waitFor(cond func() bool, d time.Duration) error {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if cond() {
			return nil
		}
		time.Sleep(5 * time.Millisecond)
	}
	return errWaitTimeout
}

var errWaitTimeout = &timeoutError{}

type timeoutError struct{}

func (*timeoutError) Error() string { return "timeout waiting for condition" }
