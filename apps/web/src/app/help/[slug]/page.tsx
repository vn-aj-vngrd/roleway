import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import {
  articleBlocks,
  helpActions,
  topicForArticle,
} from "@/features/help/catalog";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, supabase] = await Promise.all([params, createClient()]);
  const topic = topicForArticle(slug);
  const [result, related] = await Promise.all([
    supabase
      .from("help_articles")
      .select("title,summary,body,updated_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle(),
    supabase
      .from("help_articles")
      .select("slug,title")
      .eq("published", true)
      .in("slug", topic ? [...topic.slugs] : [])
      .neq("slug", slug)
      .order("title")
      .limit(4),
  ]);
  const { data, error } = result;
  if (error)
    return (
      <div className="help-content">
        <p role="alert">This article could not be loaded. Please try again.</p>
        <Link href="/help">Back to help</Link>
      </div>
    );
  if (!data) notFound();
  const blocks = articleBlocks(String(data.body));
  const action = helpActions[slug];
  return (
    <article className="help-content help-article help-guide">
      <nav className="help-breadcrumb" aria-label="Breadcrumb">
        <Link href="/help">Help Center</Link>
        {topic ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/help?category=${topic.id}`}>{topic.title}</Link>
          </>
        ) : null}
      </nav>
      <header>
        <h1>{data.title}</h1>
        <p className="help-summary">{data.summary}</p>
      </header>
      <div className="help-reading-layout">
        <div className="help-guide-body">
          {blocks.map((block) => (
            <section id={block.id} key={block.id}>
              {block.heading ? <h2>{block.heading}</h2> : null}
              {block.kind === "ordered" ? (
                <ol>
                  {block.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
              ) : block.kind === "unordered" ? (
                <ul>
                  {block.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : block.lines.length ? (
                <p className="preserve-lines">{block.lines.join("\n")}</p>
              ) : null}
            </section>
          ))}
          {action ? (
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={action.href}
            >
              {action.label}
            </Link>
          ) : null}
        </div>
        <aside className="help-article-reference">
          {blocks.some((block) => block.heading) ? (
            <nav aria-label="On this page">
              <h2>On this page</h2>
              {blocks
                .filter((block) => block.heading)
                .map((block) => (
                  <a href={`#${block.id}`} key={block.id}>
                    {block.heading}
                  </a>
                ))}
            </nav>
          ) : null}
          {related.data?.length ? (
            <section>
              <h2>Related guides</h2>
              {related.data.map((item) => (
                <Link href={`/help/${item.slug}`} key={item.slug}>
                  {item.title}
                </Link>
              ))}
            </section>
          ) : null}
          <Link href="/help">Browse all guides</Link>
        </aside>
      </div>
      <footer>
        Updated{" "}
        <time dateTime={data.updated_at}>
          {new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(new Date(data.updated_at))}
        </time>{" "}
        · Roleway product and support
      </footer>
    </article>
  );
}
