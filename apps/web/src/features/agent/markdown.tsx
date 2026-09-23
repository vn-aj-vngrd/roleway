import React from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a: ({
    href,
    children,
    id,
    title,
    "aria-label": label,
    "aria-describedby": description,
  }) => (
    <a
      href={href}
      id={id}
      title={title}
      aria-label={label}
      aria-describedby={description}
      target={href?.startsWith("#") ? undefined : "_blank"}
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div
      className="agent-markdown-table"
      tabIndex={0}
      role="region"
      aria-label="Table"
    >
      <table>{children}</table>
    </div>
  ),
  img: ({ src, alt, title }) =>
    src ? (
      // Model-supplied images use the browser directly, never the server image proxy.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span>{alt}</span>
    ),
};

/** Provider output is untrusted: keep raw HTML disabled and the safe URL transform. */
export function AgentMarkdown({
  content,
  idPrefix = "message",
}: {
  content: string;
  idPrefix?: string;
}) {
  return (
    <div className="agent-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{ clobberPrefix: `agent-${idPrefix}-` }}
        skipHtml
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
}
