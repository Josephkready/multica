import type { Project } from "@multica/core/types";
import {
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS_ORDER,
} from "@multica/core/projects/config";

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

const PRIORITY_RANK: Record<string, number> = Object.fromEntries(
  PROJECT_PRIORITY_ORDER.map((p, i) => [p, i]),
);
const STATUS_RANK: Record<string, number> = Object.fromEntries(
  PROJECT_STATUS_ORDER.map((s, i) => [s, i]),
);

function progressRatio(p: Project): number {
  if (p.issue_count <= 0) return -1;
  return p.done_count / p.issue_count;
}

function leadKey(
  p: Project,
  getActorName: (type: string, id: string) => string,
): string | null {
  if (!p.lead_type || !p.lead_id) return null;
  return getActorName(p.lead_type, p.lead_id).toLocaleLowerCase();
}

export function sortProjects(
  projects: Project[],
  sort: ProjectSort,
  getActorName: (type: string, id: string) => string,
): Project[] {
  const { key, direction } = sort;
  const sorted = [...projects].sort((a, b) => {
    switch (key) {
      case "name":
        return a.title.localeCompare(b.title);
      case "priority":
        return (
          (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99)
        );
      case "status":
        return (
          (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99)
        );
      case "progress":
        return progressRatio(a) - progressRatio(b);
      case "lead": {
        const la = leadKey(a, getActorName);
        const lb = leadKey(b, getActorName);
        if (la === null && lb === null) return 0;
        if (la === null) return 1;
        if (lb === null) return -1;
        return la.localeCompare(lb);
      }
      case "created":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}
