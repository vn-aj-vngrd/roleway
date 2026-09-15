import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, supabase] = await Promise.all([params, createClient()]);
  const { data, error } = await supabase
    .from("help_articles")
    .select("title,summary,body,updated_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error)
    return (
      <div className="help-content">
        <p role="alert">This article could not be loaded. Please try again.</p>
        <Link href="/help">Back to help</Link>
      </div>
    );
  if (!data) notFound();
  return (
    <article className="help-content help-article">
      <Button variant="outline" render={<Link href="/help" />}>
        All help articles
      </Button>
      <h1>{data.title}</h1>
      <p className="help-summary">{data.summary}</p>
      {String(data.body)
        .split(/\n\s*\n/)
        .map((text, i) => (
          <p className="preserve-lines" key={i}>
            {text}
          </p>
        ))}
      <footer>Updated {new Date(data.updated_at).toLocaleDateString()}</footer>
    </article>
  );
}
