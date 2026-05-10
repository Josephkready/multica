export type ProjectSortKey =
  | "name"
  | "priority"
  | "status"
  | "progress"
  | "lead"
  | "created";

export type SortDirection = "asc" | "desc";

export interface ProjectSort {
  key: ProjectSortKey;
  direction: SortDirection;
}

export const DEFAULT_PROJECT_SORT: ProjectSort = {
  key: "created",
  direction: "desc",
};

// Direction applied when a column is clicked for the first time. Picks the
// reading the user most likely wants: A-Z for text, urgent-first for
// priority, planned-first for status, most-progress-first for progress,
// newest-first for created.
export function defaultDirectionFor(key: ProjectSortKey): SortDirection {
  switch (key) {
    case "progress":
    case "created":
      return "desc";
    default:
      return "asc";
  }
}
