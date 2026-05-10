package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestGetBootstrapReturnsUserWorkspacesAndConfig — the bootstrap endpoint
// has to match the byte-for-byte shape of /api/me + /api/workspaces +
// /api/config, since the frontend uses the combined response to seed its
// auth store + workspace cache + config without follow-up calls.
func TestGetBootstrapReturnsUserWorkspacesAndConfig(t *testing.T) {
	w := httptest.NewRecorder()
	req := newRequest("GET", "/api/bootstrap", nil)
	testHandler.GetBootstrap(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp BootstrapResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if resp.User.ID != testUserID {
		t.Errorf("bootstrap returned wrong user id: %q (want %q)", resp.User.ID, testUserID)
	}
	if resp.User.Email != handlerTestEmail {
		t.Errorf("bootstrap returned wrong email: %q", resp.User.Email)
	}

	found := false
	for _, ws := range resp.Workspaces {
		if ws.ID == testWorkspaceID {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("bootstrap omitted the test workspace; got %+v", resp.Workspaces)
	}

	// Config must be exactly what /api/config returns. Comparing a known field
	// is enough — the handler shares the builder so divergence would have to
	// be deliberate.
	if resp.Config.SingleUser != testHandler.buildAppConfig().SingleUser {
		t.Errorf("bootstrap config drifted from /api/config: single_user mismatch")
	}
}
