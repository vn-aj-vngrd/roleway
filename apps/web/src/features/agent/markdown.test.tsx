import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentMarkdown } from "./markdown";

const render = (content: string) =>
  renderToStaticMarkup(<AgentMarkdown content={content} />);

describe("Agent Markdown", () => {
  it("renders structured responses, including GFM tables and task lists", () => {
    const html = render(
      "## Plan\n\n**Prepare** and *review*.\n\n- First\n  - Nested\n\n1. Next\n\n> Grounded advice\n\n| Role | Action |\n| --- | --- |\n| Engineer | Prepare |\n\n- [x] Read\n- [ ] Draft\n\n~~Old~~ `code`\n\n```ts\nconst value = 1;\n```\n\nSee https://example.com and a note.[^one]\n\n[^one]: Source\n\n---",
    );
    for (const tag of [
      "<h2>",
      "<strong>",
      "<em>",
      "<ul>",
      "<ol>",
      "<blockquote>",
      "<table>",
      "<del>",
      "<pre>",
      "<code>",
    ])
      expect(html).toContain(tag);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('class="footnotes"');
  });

  it("does not execute model-supplied HTML or unsafe link protocols", () => {
    const html = render(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[Unsafe](javascript:alert%281%29)\n\n![Unsafe](data:text/html,attack)\n\n[Safe](https://example.com)',
    );
    expect(html).not.toMatch(/<script|onerror|javascript:|data:text\/html/);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("keeps code literal and tables in a keyboard-accessible scroll region", () => {
    const html = render(
      "```html\n<script>alert(1)</script>\n```\n\n| Name | Value |\n| --- | --- |\n| Long | Content |",
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('tabindex="0" role="region" aria-label="Table"');
  });
});
