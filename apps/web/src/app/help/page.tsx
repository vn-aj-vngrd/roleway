import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import type { HelpArticle } from "@/features/billing/types";
import {
  helpTopics,
  matchesHelpQuery,
  topicForArticle,
} from "@/features/help/catalog";

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [supabase, params] = await Promise.all([createClient(), searchParams]);
  const [articles, contact] = await Promise.all([
    supabase
      .from("help_articles")
      .select("*")
      .eq("published", true)
      .order("title"),
    supabase.rpc("support_contact"),
  ]);
  const all = (articles.data ?? []) as HelpArticle[];
  const q = (params.q || "").slice(0, 120).trim();
  const topic = helpTopics.find((item) => item.id === params.category);
  const visible = all.filter(
    (article) =>
      matchesHelpQuery(article, q) &&
      (!topic || (topic.slugs as readonly string[]).includes(article.slug)),
  );
  const groups = [
    ...helpTopics,
    {
      id: "more",
      title: "More guides",
      description: "Additional guidance from Roleway support.",
      slugs: [],
    },
  ];
  return (
    <div className="help-content help-center">
      <header className="help-intro">
        <h1>Your guide to Roleway</h1>
        <p>
          From your first saved Job to your next career move. Learn the
          workflow, find a feature, or get unstuck.
        </p>
      </header>
      <form className="management-search" role="search">
        <label htmlFor="help-query" className="sr-only">
          Search help articles
        </label>
        <Input
          id="help-query"
          name="q"
          defaultValue={q}
          maxLength={120}
          placeholder="Search tasks, interviews, Agent, payments…"
        />
        {topic ? (
          <input type="hidden" name="category" value={topic.id} />
        ) : null}
        <Button type="submit">
          <Search aria-hidden />
          Search
        </Button>
      </form>
      <div className="help-guide-layout">
        <nav className="help-topic-nav" aria-label="Help topics">
          <Link href="/help" aria-current={!topic ? "page" : undefined}>
            All topics
          </Link>
          {helpTopics.map((item) => (
            <Link
              key={item.id}
              href={`/help?category=${item.id}`}
              aria-current={topic?.id === item.id ? "page" : undefined}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="help-results">
          {!q &&
          !topic &&
          all.some((article) => article.slug === "search-walkthrough") ? (
            <section className="help-start">
              <h2>New to Roleway?</h2>
              <p>
                Follow one Job through capture, preparation, application,
                interview, and outcome.
              </p>
              <Link href="/help/search-walkthrough">
                Start the walkthrough <ArrowRight aria-hidden />
              </Link>
            </section>
          ) : null}
          {q || topic ? (
            <div className="help-results-heading">
              <h2>{topic?.title ?? "Search results"}</h2>
              <p>
                {visible.length} {visible.length === 1 ? "guide" : "guides"}
                {q ? ` matching “${q}”` : ""}
              </p>
              <Link href="/help">Clear search and filters</Link>
            </div>
          ) : null}
          {articles.error ? (
            <p role="alert">
              Articles are temporarily unavailable. Please try again shortly.
            </p>
          ) : !visible.length ? (
            <p role="status">
              No matching articles. Try fewer words or browse all topics.
            </p>
          ) : (
            groups.map((group) => {
              const items = visible.filter(
                (article) =>
                  (topicForArticle(article.slug)?.id ?? "more") === group.id,
              );
              return items.length ? (
                <section className="help-topic-section" key={group.id}>
                  {!topic ? (
                    <>
                      <h2>{group.title}</h2>
                      <p>{group.description}</p>
                    </>
                  ) : null}
                  <div className="help-article-list">
                    {items.map((article) => (
                      <Link href={`/help/${article.slug}`} key={article.slug}>
                        <div>
                          <h3>{article.title}</h3>
                          <p>{article.summary}</p>
                        </div>
                        <ArrowRight aria-hidden />
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null;
            })
          )}
        </div>
      </div>
      <section className="help-contact">
        <h2>Still need a hand?</h2>
        <p>
          Tell us which page you were using, what you expected, and what
          happened. Leave passwords, API keys, and payment credentials out of
          your message.
        </p>
        {contact.data ? (
          <a
            className={buttonVariants({ variant: "outline" })}
            href={`mailto:${contact.data}`}
          >
            Contact support
          </a>
        ) : (
          <p>Direct support details will appear here when available.</p>
        )}
      </section>
    </div>
  );
}
