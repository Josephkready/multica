import { describe, expect, it } from "vitest";
import type { Project } from "@multica/core/types";
import {
  DEFAULT_PROJECT_SORT,
  defaultDirectionFor,
  sortProjects,
} from "./sort-projects";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: overrides.id ?? "p",
    workspace_id: "ws",
    title: "Project",
    description: null,
    icon: null,
    status: "planned",
    priority: "medium",
    lead_type: null,
    lead_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    issue_count: 0,
    done_count: 0,
    resource_count: 0,
    ...overrides,
  };
}

const noActor = () => "";

describe("sortProjects", () => {
  it("sorts by name ascending then descending", () => {
    const projects = [
      makeProject({ id: "a", title: "Charlie" }),
      makeProject({ id: "b", title: "alpha" }),
      makeProject({ id: "c", title: "Bravo" }),
    ];
    const asc = sortProjects(projects, { key: "name", direction: "asc" }, noActor);
    expect(asc.map((p) => p.id)).toEqual(["b", "c", "a"]);

    const desc = sortProjects(projects, { key: "name", direction: "desc" }, noActor);
    expect(desc.map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by priority with urgent first when ascending", () => {
    const projects = [
      makeProject({ id: "low", priority: "low" }),
      makeProject({ id: "urgent", priority: "urgent" }),
      makeProject({ id: "none", priority: "none" }),
      makeProject({ id: "high", priority: "high" }),
    ];
    const asc = sortProjects(projects, { key: "priority", direction: "asc" }, noActor);
    expect(asc.map((p) => p.id)).toEqual(["urgent", "high", "low", "none"]);
  });

  it("sorts by status with planned first when ascending", () => {
    const projects = [
      makeProject({ id: "done", status: "completed" }),
      makeProject({ id: "plan", status: "planned" }),
      makeProject({ id: "active", status: "in_progress" }),
    ];
    const asc = sortProjects(projects, { key: "status", direction: "asc" }, noActor);
    expect(asc.map((p) => p.id)).toEqual(["plan", "active", "done"]);
  });

  it("sorts by progress ratio and pins zero-issue projects to the bottom in both directions", () => {
    const projects = [
      makeProject({ id: "empty", issue_count: 0, done_count: 0 }),
      makeProject({ id: "half", issue_count: 4, done_count: 2 }),
      makeProject({ id: "full", issue_count: 4, done_count: 4 }),
      makeProject({ id: "low", issue_count: 4, done_count: 1 }),
    ];
    const desc = sortProjects(projects, { key: "progress", direction: "desc" }, noActor);
    expect(desc.map((p) => p.id)).toEqual(["full", "half", "low", "empty"]);

    const asc = sortProjects(projects, { key: "progress", direction: "asc" }, noActor);
    expect(asc.map((p) => p.id)).toEqual(["low", "half", "full", "empty"]);
  });

  it("sorts by lead name and pins unassigned leads to the bottom in both directions", () => {
    const getActorName = (_type: string, id: string) =>
      ({ u1: "Alice", u2: "bob", u3: "Charlie" })[id] ?? "Unknown";
    const projects = [
      makeProject({ id: "none", lead_type: null, lead_id: null }),
      makeProject({ id: "charlie", lead_type: "member", lead_id: "u3" }),
      makeProject({ id: "alice", lead_type: "member", lead_id: "u1" }),
      makeProject({ id: "bob", lead_type: "agent", lead_id: "u2" }),
    ];
    const asc = sortProjects(projects, { key: "lead", direction: "asc" }, getActorName);
    expect(asc.map((p) => p.id)).toEqual(["alice", "bob", "charlie", "none"]);

    const desc = sortProjects(projects, { key: "lead", direction: "desc" }, getActorName);
    expect(desc.map((p) => p.id)).toEqual(["charlie", "bob", "alice", "none"]);
  });

  it("sorts by created timestamp", () => {
    const projects = [
      makeProject({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
      makeProject({ id: "new", created_at: "2026-03-01T00:00:00Z" }),
      makeProject({ id: "mid", created_at: "2026-02-01T00:00:00Z" }),
    ];
    const desc = sortProjects(projects, { key: "created", direction: "desc" }, noActor);
    expect(desc.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the input array", () => {
    const projects = [
      makeProject({ id: "b", title: "B" }),
      makeProject({ id: "a", title: "A" }),
    ];
    const snapshot = projects.map((p) => p.id);
    sortProjects(projects, { key: "name", direction: "asc" }, noActor);
    expect(projects.map((p) => p.id)).toEqual(snapshot);
  });
});

describe("defaultDirectionFor", () => {
  it("uses desc for progress and created, asc for everything else", () => {
    expect(defaultDirectionFor("progress")).toBe("desc");
    expect(defaultDirectionFor("created")).toBe("desc");
    expect(defaultDirectionFor("name")).toBe("asc");
    expect(defaultDirectionFor("priority")).toBe("asc");
    expect(defaultDirectionFor("status")).toBe("asc");
    expect(defaultDirectionFor("lead")).toBe("asc");
  });

  it("matches the default sort", () => {
    expect(defaultDirectionFor(DEFAULT_PROJECT_SORT.key)).toBe(
      DEFAULT_PROJECT_SORT.direction,
    );
  });
});
