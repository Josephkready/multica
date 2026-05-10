package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"
)

// latestCliVersionURL is the public GitHub Releases endpoint we proxy through.
// Hardcoded to upstream — forks that want their own release feed can override
// at the handler-construction site (NewLatestCliVersionStore takes a refresher
// fn so tests don't actually call out to github.com).
const latestCliVersionURL = "https://api.github.com/repos/multica-ai/multica/releases/latest"

// latestCliVersionTTL is how long a cached value is considered fresh. 24h is a
// deliberate floor: the runtime-update prompt is purely informational, and the
// CLI itself self-updates on launch. Hitting GitHub more often than once per
// day per server would burn the 60/hr unauthenticated rate limit on shared-IP
// self-host deploys for no UX benefit.
const latestCliVersionTTL = 24 * time.Hour

// latestCliVersionFetchTimeout caps any single outbound call. Issue #19 saw
// the foreground page wait ~210ms for this; we still want a hard bound now
// that the call is backgrounded.
const latestCliVersionFetchTimeout = 5 * time.Second

// LatestCliVersionStore fronts the GitHub Releases lookup with an in-memory
// cache. Exists to fix the every-page-load WAN call documented in #19: the
// release tag drives a runtime-update prompt that updates at most once per
// release cycle, so caching it 24h is plenty.
//
// Refresh is lazy + non-blocking: callers get whatever is cached (possibly
// the empty string on a cold start) and a stale entry triggers exactly one
// background refresh. The handler must never wait on GitHub.
type LatestCliVersionStore struct {
	mu         sync.RWMutex
	version    string
	fetchedAt  time.Time
	refreshing bool

	disabled bool
	url      string
	client   *http.Client
}

// NewLatestCliVersionStore reads MULTICA_DISABLE_RELEASE_CHECK once at
// construction; "1" / "true" makes Get always return "". Self-host operators
// who don't want their server reaching out to api.github.com can flip this
// off without touching code.
func NewLatestCliVersionStore() *LatestCliVersionStore {
	v := os.Getenv("MULTICA_DISABLE_RELEASE_CHECK")
	disabled := v == "1" || v == "true"
	return &LatestCliVersionStore{
		disabled: disabled,
		url:      latestCliVersionURL,
		client:   &http.Client{Timeout: latestCliVersionFetchTimeout},
	}
}

// Get returns the cached version tag, kicking off a background refresh if
// the entry is missing or older than the TTL. The caller never blocks on
// GitHub — a cold-start request just returns "" until the first refresh
// lands, which the frontend already treats as "unknown, no prompt".
func (s *LatestCliVersionStore) Get() string {
	if s.disabled {
		return ""
	}
	s.mu.RLock()
	v := s.version
	age := time.Since(s.fetchedAt)
	refreshing := s.refreshing
	s.mu.RUnlock()

	// Trigger one async refresh when the cache is stale and nobody else is
	// already mid-fetch. Two checks under the write lock guard against the
	// classic read-then-write race when many requests pile in at startup.
	if !refreshing && age > latestCliVersionTTL {
		s.mu.Lock()
		if !s.refreshing && time.Since(s.fetchedAt) > latestCliVersionTTL {
			s.refreshing = true
			go s.refresh()
		}
		s.mu.Unlock()
	}
	return v
}

func (s *LatestCliVersionStore) refresh() {
	defer func() {
		s.mu.Lock()
		s.refreshing = false
		s.mu.Unlock()
	}()

	ctx, cancel := context.WithTimeout(context.Background(), latestCliVersionFetchTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.url, nil)
	if err != nil {
		return
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := s.client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return
	}
	var payload struct {
		TagName string `json:"tag_name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return
	}
	if payload.TagName == "" {
		return
	}
	s.mu.Lock()
	s.version = payload.TagName
	s.fetchedAt = time.Now()
	s.mu.Unlock()
}

// GetLatestCliVersion handles GET /api/cli/latest-version. Returns the
// cached upstream release tag; `version` is null when unknown (cold start,
// disabled, or upstream unreachable). The frontend treats null the same as
// "no update prompt" so this never gates a render.
func (h *Handler) GetLatestCliVersion(w http.ResponseWriter, r *http.Request) {
	v := ""
	if h.LatestCliVersion != nil {
		v = h.LatestCliVersion.Get()
	}
	var out *string
	if v != "" {
		out = &v
	}
	writeJSON(w, http.StatusOK, map[string]any{"version": out})
}
