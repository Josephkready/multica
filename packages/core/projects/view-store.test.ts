import { beforeEach, describe, expect, it } from "vitest";
import { useProjectsViewStore } from "./view-store";
import { DEFAULT_PROJECT_SORT } from "./sort";

describe("projects view store", () => {
  beforeEach(() => {
    useProjectsViewStore.setState({ sort: DEFAULT_PROJECT_SORT });
  });

  it("starts at the default sort", () => {
    expect(useProjectsViewStore.getState().sort).toEqual(DEFAULT_PROJECT_SORT);
  });

  it("toggleSort on a new key uses that key's default direction", () => {
    useProjectsViewStore.getState().toggleSort("name");
    // name's default direction is asc (A-Z)
    expect(useProjectsViewStore.getState().sort).toEqual({
      key: "name",
      direction: "asc",
    });
  });

  it("toggleSort on the active key flips the direction", () => {
    const { toggleSort } = useProjectsViewStore.getState();
    toggleSort("name");
    toggleSort("name");
    expect(useProjectsViewStore.getState().sort).toEqual({
      key: "name",
      direction: "desc",
    });
    toggleSort("name");
    expect(useProjectsViewStore.getState().sort).toEqual({
      key: "name",
      direction: "asc",
    });
  });

  it("setSort overwrites both key and direction", () => {
    useProjectsViewStore.getState().setSort({ key: "priority", direction: "desc" });
    expect(useProjectsViewStore.getState().sort).toEqual({
      key: "priority",
      direction: "desc",
    });
  });
});
