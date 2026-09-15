import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { HelpArticle } from "@/features/billing/types";
export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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
  const q = (params.q || "").slice(0, 120).toLowerCase();
  const visible = ((articles.data ?? []) as HelpArticle[]).filter((a) =>
    `${a.title} ${a.summary} ${a.body}`.toLowerCase().includes(q),
  );
  return (
    <div className="help-content">
      <h1>How can we help?</h1>
      <p>
        Practical guides for a focused job search, from your first Workspace to
        plan and payment questions.
      </p>
      <form className="management-search">
        <label htmlFor="help-query" className="sr-only">
          Search help articles
        </label>
        <Input
          id="help-query"
          name="q"
          defaultValue={params.q}
          maxLength={120}
          placeholder="Search Workspaces, payments, documents…"
        />
        <Button type="submit">
          <Search aria-hidden />
          Search
        </Button>
      </form>
      {articles.error ? (
        <p role="alert">
          Articles are temporarily unavailable. Please try again shortly.
        </p>
      ) : (
        <div className="help-article-list">
          {visible.map((a) => (
            <Link href={`/help/${a.slug}`} key={a.slug}>
              <div>
                <h2>{a.title}</h2>
                <p>{a.summary}</p>
              </div>
              <ArrowRight aria-hidden />
            </Link>
          ))}
          {!visible.length ? (
            <p>No matching articles. Try “Workspace”, “payment”, or “Agent”.</p>
          ) : null}
        </div>
      )}
      <section className="help-contact">
        <h2>Need more help?</h2>
        <p>
          Include the page you were using and what you expected to happen. Never
          send passwords, API keys, or full payment credentials.
        </p>
        {contact.data ? (
          <Button
            variant="outline"
            render={<a href={`mailto:${contact.data}`} />}
          >
            Contact support
          </Button>
        ) : (
          <p>
            Direct support contact details will be published here when
            available.
          </p>
        )}
      </section>
    </div>
  );
}
