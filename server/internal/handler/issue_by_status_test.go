package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// byStatusBucket mirrors the inline struct in the handler — kept here as a
// minimal decode target so the test doesn't depend on the handler's private
// type.
type byStatusBucket struct {
	Issues []IssueResponse `json:"issues"`
	Total  int64           `json:"total"`
}

type byStatusResponse struct {
	ByStatus map[string]byStatusBucket `json:"by_status"`
}

// TestListIssuesByStatusBucketsByRequestedStatuses — happy path: requesting
// statuses=a,b returns exactly those two buckets, each populated with the
// matching issues. This is the core promise of the endpoint: collapse N
// /api/issues?status=X round trips into one without changing payloads.
func TestListIssuesByStatusBucketsByRequestedStatuses(t *testing.T) {
	todoA := createTestIssue(t, "bs-todo A", "todo", "low")
	t.Cleanup(func() { deleteTestIssue(t, todoA) })
	todoB := createTestIssue(t, "bs-todo B", "todo", "low")
	t.Cleanup(func() { deleteTestIssue(t, todoB) })
	inProg := createTestIssue(t, "bs-in_progress", "in_progress", "low")
	t.Cleanup(func() { deleteTestIssue(t, inProg) })
	// Existence-only: confirms the response is filtered to the requested
	// statuses and doesn't leak unrelated buckets.
	done := createTestIssue(t, "bs-done", "done", "low")
	t.Cleanup(func() { deleteTestIssue(t, done) })

	w := httptest.NewRecorder()
	req := newRequest("GET", "/api/issues/by-status?statuses=todo,in_progress&limit=50", nil)
	testHandler.ListIssuesByStatus(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp byStatusResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if _, ok := resp.ByStatus["done"]; ok {
		t.Errorf("response leaked a bucket for an unrequested status: done")
	}
	todoBucket, ok := resp.ByStatus["todo"]
	if !ok {
		t.Fatalf("missing 'todo' bucket: %v", resp.ByStatus)
	}
	if todoBucket.Total < 2 {
		t.Errorf("expected total >= 2 for todo, got %d", todoBucket.Total)
	}
	if !containsIssueID(todoBucket.Issues, todoA) || !containsIssueID(todoBucket.Issues, todoB) {
		t.Errorf("todo bucket missing one of the seeded issues; got %d items", len(todoBucket.Issues))
	}

	inProgBucket, ok := resp.ByStatus["in_progress"]
	if !ok {
		t.Fatalf("missing 'in_progress' bucket: %v", resp.ByStatus)
	}
	if !containsIssueID(inProgBucket.Issues, inProg) {
		t.Errorf("in_progress bucket missing seeded issue")
	}
	for _, item := range inProgBucket.Issues {
		if item.Status != "in_progress" {
			t.Errorf("bucket contamination: in_progress bucket contained status=%q", item.Status)
		}
	}
}

func containsIssueID(issues []IssueResponse, id string) bool {
	for _, i := range issues {
		if i.ID == id {
			return true
		}
	}
	return false
}

// TestListIssuesByStatusRequiresStatuses — without the statuses param the
// handler must 400, not silently return every issue. Locks in the bound on
// worst-case DB work per request.
func TestListIssuesByStatusRequiresStatuses(t *testing.T) {
	cases := []string{
		"/api/issues/by-status",
		"/api/issues/by-status?statuses=",
		"/api/issues/by-status?statuses=,,,",
	}
	for _, path := range cases {
		t.Run(path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := newRequest("GET", path, nil)
			testHandler.ListIssuesByStatus(w, req)
			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400 for %q, got %d", path, w.Code)
			}
		})
	}
}
