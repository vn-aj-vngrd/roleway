import { describe, expect, it } from "vitest";
import { richTextForEditor, richTextToPlainText, sanitizeRichText } from "./rich-text";

describe("rich text", () => {
  it("keeps supported formatting and removes executable markup", () => {
    expect(sanitizeRichText('<p>Hello <strong>there</strong><script>alert(1)</script><a href="javascript:alert(1)">bad link</a></p>')).toBe('<p>Hello <strong>there</strong><a target="_blank" rel="noreferrer">bad link</a></p>');
  });

  it("converts legacy plain descriptions for the editor", () => {
    expect(richTextForEditor("First paragraph\n\nSecond line")).toBe("<p>First paragraph</p><p>Second line</p>");
  });

  it("returns readable text for excerpts and AI context", () => {
    expect(richTextToPlainText("<p>Role summary</p><ul><li>Design systems</li><li>Research</li></ul>")).toBe("Role summary\nDesign systems\nResearch");
  });
});
