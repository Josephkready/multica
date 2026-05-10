import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  DEFAULT_PROJECT_SORT,
  defaultDirectionFor,
  type ProjectSort,
  type ProjectSortKey,
} from "./sort";
import {
  createWorkspaceAwareStorage,
  registerForWorkspaceRehydration,
} from "../platform/workspace-storage";
import { defaultStorage } from "../platform/storage";

interface ProjectsViewStore {
  sort: ProjectSort;
  setSort: (sort: ProjectSort) => void;
  toggleSort: (key: ProjectSortKey) => void;
}

export const useProjectsViewStore = create<ProjectsViewStore>()(
  persist(
    (set) => ({
      sort: DEFAULT_PROJECT_SORT,
      setSort: (sort) => set({ sort }),
      toggleSort: (key) =>
        set((s) => ({
          sort:
            s.sort.key === key
              ? { key, direction: s.sort.direction === "asc" ? "desc" : "asc" }
              : { key, direction: defaultDirectionFor(key) },
        })),
    }),
    {
      name: "multica_projects_view",
      storage: createJSONStorage(() => createWorkspaceAwareStorage(defaultStorage)),
      partialize: (state) => ({ sort: state.sort }),
    },
  ),
);

registerForWorkspaceRehydration(() => useProjectsViewStore.persist.rehydrate());
