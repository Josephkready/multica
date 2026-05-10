package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestCreateProjectInvalidStatus reproduces the regression from the bug
// report: a status outside the project_status_check enum used to surface
// as a generic 500 with no logged context. After the fix, the handler
// must map the CHECK violation to a 400 with a field-named message.
func TestCreateProjectInvalidStatus(t *testing.T) {
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects", map[string]any{
		"title":  "bad-status project",
		"status": "active", // not in (planned|in_progress|paused|completed|cancelled)
	})
	testHandler.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("invalid status: expected 400, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if !strings.Contains(body["error"], "status") {
		t.Errorf("error message %q should mention the offending field", body["error"])
	}
}

// TestCreateProjectInvalidPriority covers the same path for the priority
// CHECK constraint, added in migration 035.
func TestCreateProjectInvalidPriority(t *testing.T) {
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects", map[string]any{
		"title":    "bad-priority project",
		"priority": "blocker", // not in (urgent|high|medium|low|none)
	})
	testHandler.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("invalid priority: expected 400, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if !strings.Contains(body["error"], "priority") {
		t.Errorf("error message %q should mention the offending field", body["error"])
	}
}

// TestCreateProjectValidStillSucceeds guards the happy path so the new
// CHECK-violation branch can't accidentally swallow valid creates.
func TestCreateProjectValidStillSucceeds(t *testing.T) {
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects", map[string]any{
		"title":  "happy-path project",
		"status": "planned",
	})
	testHandler.CreateProject(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("valid create: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var project ProjectResponse
	if err := json.NewDecoder(w.Body).Decode(&project); err != nil {
		t.Fatalf("decode project: %v", err)
	}
	t.Cleanup(func() {
		req := newRequest("DELETE", "/api/projects/"+project.ID, nil)
		req = withURLParam(req, "id", project.ID)
		testHandler.DeleteProject(httptest.NewRecorder(), req)
	})
}

// TestUpdateProjectInvalidStatus exercises the same translation in the
// update path — historically the same drop-the-error pattern lived here.
func TestUpdateProjectInvalidStatus(t *testing.T) {
	// Seed a project we can update.
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects", map[string]any{
		"title": "update-bad-status project",
	})
	testHandler.CreateProject(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("seed CreateProject: expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var project ProjectResponse
	if err := json.NewDecoder(w.Body).Decode(&project); err != nil {
		t.Fatalf("decode seed: %v", err)
	}
	t.Cleanup(func() {
		req := newRequest("DELETE", "/api/projects/"+project.ID, nil)
		req = withURLParam(req, "id", project.ID)
		testHandler.DeleteProject(httptest.NewRecorder(), req)
	})

	w = httptest.NewRecorder()
	req = newRequest("PATCH", "/api/projects/"+project.ID, map[string]any{
		"status": "active", // bad
	})
	req = withURLParam(req, "id", project.ID)
	testHandler.UpdateProject(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("invalid status update: expected 400, got %d: %s", w.Code, w.Body.String())
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if !strings.Contains(body["error"], "status") {
		t.Errorf("error message %q should mention status", body["error"])
	}
}
