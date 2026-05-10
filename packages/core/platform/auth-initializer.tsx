"use client";

import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApi } from "../api";
import { useAuthStore } from "../auth";
import {
  captureSignupSource,
  identify as identifyAnalytics,
  initAnalytics,
  resetAnalytics,
} from "../analytics";
import { configStore } from "../config";
import { workspaceKeys } from "../workspace/queries";
import { createLogger } from "../logger";
import { defaultStorage } from "./storage";
import { setCurrentWorkspace } from "./workspace-storage";
import type { ClientIdentity } from "./types";
import type { StorageAdapter } from "../types/storage";

const logger = createLogger("auth");

export function AuthInitializer({
  children,
  onLogin,
  onLogout,
  storage = defaultStorage,
  cookieAuth,
  identity,
}: {
  children: ReactNode;
  onLogin?: () => void;
  onLogout?: () => void;
  storage?: StorageAdapter;
  cookieAuth?: boolean;
  identity?: ClientIdentity;
}) {
  const qc = useQueryClient();

  useEffect(() => {
    const api = getApi();

    // Stamp attribution before anything else — the signup event (server-side)
    // reads this cookie, so it has to be present before the user hits submit.
    captureSignupSource();

    type BootstrapPayload = Awaited<ReturnType<typeof api.getBootstrap>>;

    const applyConfig = (cfg: BootstrapPayload["config"]) => {
      if (cfg.cdn_domain) configStore.getState().setCdnDomain(cfg.cdn_domain);
      configStore.getState().setAuthConfig({
        allowSignup: cfg.allow_signup,
        googleClientId: cfg.google_client_id,
        singleUser: cfg.single_user === true,
      });
      if (cfg.posthog_key) {
        initAnalytics({
          key: cfg.posthog_key,
          host: cfg.posthog_host || "",
          appVersion: identity?.version,
          environment: cfg.analytics_environment,
        });
      }
    };

    const applyBootstrap = ({ user, workspaces, config }: BootstrapPayload) => {
      applyConfig(config);
      onLogin?.();
      useAuthStore.setState({ user, isLoading: false });
      identifyAnalytics(user.id, { email: user.email, name: user.name });
      // Seed React Query cache so the URL-driven layout can resolve the slug
      // without a second fetch.
      qc.setQueryData(workspaceKeys.list(), workspaces);
    };

    const onAuthFailure = () => {
      onLogout?.();
      resetAnalytics();
      useAuthStore.setState({ user: null, isLoading: false });
    };

    // If the bootstrap call succeeds, config rides along on the auth payload —
    // no second round trip. If it fails (e.g. session expired or backend
    // unavailable), config still loads independently so the public landing /
    // login UI can render correctly.
    const ensureConfigLoaded = () =>
      api
        .getConfig()
        .then((cfg) => applyConfig(cfg))
        .catch(() => {
          /* config is optional — legacy file card matching degrades gracefully */
        });

    if (cookieAuth) {
      // Cookie mode: the HttpOnly cookie is sent automatically by the
      // browser. One round trip returns user + workspaces + config.
      api
        .getBootstrap()
        .then(applyBootstrap)
        .catch((err) => {
          logger.error("cookie auth init failed", err);
          onAuthFailure();
          // Bootstrap is auth-gated, so a failure here is most often
          // "unauthenticated" — config still has to load for the login UI.
          ensureConfigLoaded();
        });
      return;
    }

    // Token mode: read from localStorage (Electron / legacy).
    const token = storage.getItem("multica_token");
    if (!token) {
      onLogout?.();
      useAuthStore.setState({ isLoading: false });
      ensureConfigLoaded();
      return;
    }

    api.setToken(token);

    api
      .getBootstrap()
      .then(applyBootstrap)
      .catch((err) => {
        logger.error("auth init failed", err);
        api.setToken(null);
        setCurrentWorkspace(null, null);
        storage.removeItem("multica_token");
        onAuthFailure();
        ensureConfigLoaded();
      });
  }, []);

  return <>{children}</>;
}
