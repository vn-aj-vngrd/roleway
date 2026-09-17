import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  articleBlocks,
  helpTopics,
  matchesHelpQuery,
  topicForArticle,
} from "./catalog";

describe("Help Center", () => {
  it("keeps every curated guide backed by migration content", () => {
    const folder = "../../supabase/migrations";
    const sql = readdirSync(folder)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFileSync(`${folder}/${name}`, "utf8"))
      .join("\n");
    const slugs = helpTopics.flatMap((topic) => [...topic.slugs]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(sql).toContain(`'${slug}'`);
  });
  it("matches multiple search words regardless of order or case", () => {
    expect(
      matchesHelpQuery(
        {
          title: "Create a task",
          summary: "Use Agent",
          body: "Approve changes",
        },
        "AGENT task",
      ),
    ).toBe(true);
    expect(
      matchesHelpQuery(
        { title: "Task", summary: "", body: "" },
        "task interview",
      ),
    ).toBe(false);
    expect(topicForArticle("custom-support-article")).toBeUndefined();
  });
  it("renders structured steps and retains legacy plain text", () => {
    expect(
      articleBlocks(
        "## Steps\n1. Open Agent\n2. Review\n\nLegacy paragraph\nwith another line",
      ),
    ).toEqual([
      {
        id: "section-0",
        heading: "Steps",
        kind: "ordered",
        lines: ["Open Agent", "Review"],
      },
      {
        id: "section-1",
        heading: null,
        kind: "paragraph",
        lines: ["Legacy paragraph", "with another line"],
      },
    ]);
    expect(
      articleBlocks("## Troubleshooting\n- Retry\n- Get help")[0]?.kind,
    ).toBe("unordered");
  });
});
