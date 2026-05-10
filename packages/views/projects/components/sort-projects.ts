import type { Project } from "@multica/core/types";
import {
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS_ORDER,
} from "@multica/core/projects/config";
import {
  DEFAULT_PROJECT_SORT,
  defaultDirectionFor,
  type ProjectSort,
  type ProjectSortKey,
  type SortDirection,
} from "@multica/core/projects/sort";

export {
  DEFAULT_PROJECT_SORT,
  defaultDirectionFor,
  type ProjectSort,
  type ProjectSortKey,
  type SortDirection,
};

const PRIORITY_RANK: Record<string, number> = Object.fromEntries(
  PROJECT_PRIORITY_ORDER.map((p, i) => [p, i]),
);
const STATUS_RANK: Record<string, number> = Object.fromEntries(
  PROJECT_STATUS_ORDER.map((s, i) => [s, i]),
);

// Rows that should always sort to the bottom regardless of direction:
// projects with no lead (when sorting by lead) and projects with no issues
// (no progress ratio to compare). Partitioning these out before the sort
// keeps "blank" entries pinned at the end whether the user picked asc or
// desc, instead of flipping to the top after .reverse().
function isSentinel(p: Project, key: ProjectSortKey): boolean {
  if (key === "lead") return !p.lead_type || !p.lead_id;
  if (key === "progress") return p.issue_count <= 0;
  return false;
}

export function sortProjects(
  projects: Project[],
  sort: ProjectSort,
  getActorName: (type: string, id: string) => string,
): Project[] {
  const { key, direction } = sort;
  const real: Project[] = [];
  const sentinel: Project[] = [];
  for (const p of projects) {
    (isSentinel(p, key) ? sentinel : real).push(p);
  }

  real.sort((a, b) => {
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
        return a.done_count / a.issue_count - b.done_count / b.issue_count;
      case "lead": {
        const la = getActorName(a.lead_type!, a.lead_id!).toLocaleLowerCase();
        const lb = getActorName(b.lead_type!, b.lead_id!).toLocaleLowerCase();
        return la.localeCompare(lb);
      }
      case "created":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }
  });
  if (direction === "desc") real.reverse();
  return [...real, ...sentinel];
}
