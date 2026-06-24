import { describe, it, expect } from "bun:test";
import { installRepoList } from "../webhook-events";

describe("installRepoList", () => {
  it("reads `repositories` for an installation event", () => {
    const payload = {
      action: "created",
      repositories: [{ full_name: "acme/a" }, { full_name: "acme/b" }],
    };
    expect(installRepoList("installation", payload)).toEqual(["acme/a", "acme/b"]);
  });

  it("reads `repositories_added` for an installation_repositories event", () => {
    const payload = { action: "added", repositories_added: [{ full_name: "acme/c" }] };
    expect(installRepoList("installation_repositories", payload)).toEqual(["acme/c"]);
  });

  it("returns [] when absent / malformed", () => {
    expect(installRepoList("installation", {})).toEqual([]);
    expect(installRepoList("installation", { repositories: [{}, { full_name: "" }] })).toEqual([]);
  });
});
