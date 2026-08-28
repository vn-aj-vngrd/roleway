import sanitizeHtml from "sanitize-html";

const allowedTags = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a"];

export function sanitizeRichText(value: string) {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      b: "strong",
      i: "em",
      a: (_tagName, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noreferrer" } }),
    },
  }).trim();
}

export function richTextForEditor(value: string) {
  if (!value.trim()) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return sanitizeRichText(value);
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${sanitizeHtml(paragraph, { allowedTags: [], allowedAttributes: {} }).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export function richTextToPlainText(value: string) {
  return sanitizeHtml(
    value.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li)>/gi, "\n"),
    { allowedTags: [], allowedAttributes: {} },
  ).replace(/\n{3,}/g, "\n\n").trim();
}
