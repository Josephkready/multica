package handler

import (
	"net/http"
)

// BootstrapResponse is the coalesced shape of /api/me + /api/config +
// /api/workspaces. Exists to collapse the page-load phase A waterfall
// described in #19 into a single round trip — every dashboard page needs all
// three before it can fan out into the rest of its data.
type BootstrapResponse struct {
	User       UserResponse        `json:"user"`
	Workspaces []WorkspaceResponse `json:"workspaces"`
	Config     AppConfig           `json:"config"`
}

// GetBootstrap handles GET /api/bootstrap. Returns the same payloads as
// /api/me, /api/workspaces, and /api/config in one response so the client
// can seed its auth store + workspace cache + config cache without paying
// three sequential RTTs on first load.
//
// Auth-gated (same middleware as /api/me), so it never exposes more than
// the caller could already read endpoint-by-endpoint.
func (h *Handler) GetBootstrap(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUserID(w, r)
	if !ok {
		return
	}

	user, err := h.Queries.GetUser(r.Context(), parseUUID(userID))
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	workspaces, err := h.Queries.ListWorkspaces(r.Context(), parseUUID(userID))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list workspaces")
		return
	}
	wsResp := make([]WorkspaceResponse, len(workspaces))
	for i, ws := range workspaces {
		wsResp[i] = workspaceToResponse(ws)
	}

	writeJSON(w, http.StatusOK, BootstrapResponse{
		User:       userToResponse(user),
		Workspaces: wsResp,
		Config:     h.buildAppConfig(),
	})
}
