"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

function TagList({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-sm text-slate-500">None detected.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function providerLabel(metadata: any) {
  if (!metadata) return "heuristic";
  return [metadata.provider || "heuristic", metadata.status || "unknown"].filter(Boolean).join(" / ");
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ProviderStrip({ metadata }: { metadata: any }) {
  if (!metadata) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      <span className="rounded-full bg-slate-100 px-3 py-1">{providerLabel(metadata)}</span>
      {metadata.model && <span className="rounded-full bg-slate-100 px-3 py-1">{metadata.model}</span>}
      {metadata.truth_status && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{metadata.truth_status}</span>}
    </div>
  );
}

function ArticleSide({ label, article }: { label: string; article: any }) {
  const sourceLabel =
    article.domain ||
    article.source ||
    [article.country, article.language].filter(Boolean).join(" / ");

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-950">
        {article.title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{article.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {sourceLabel && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {sourceLabel}
          </span>
        )}
        {article.similarity?.score !== undefined && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {Math.round(article.similarity.score * 100)}% similar
          </span>
        )}
        {article.report_id && (
          <a
            href={`/reports/${article.report_id}`}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white"
          >
            Open report
          </a>
        )}
      </div>
    </article>
  );
}

export function CompareClient() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("articleId") || "";
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!leftUrl.trim() || !rightUrl.trim()) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiPost("/api/v1/compare", {
        left_url: leftUrl.trim(),
        right_url: rightUrl.trim(),
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Compare failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!articleId) return;

    setLoading(true);
    setError("");

    apiGet(`/api/v1/compare/${encodeURIComponent(articleId)}`)
      .then((data) => {
        if (mounted) setResult(data);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Could not load article comparison.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [articleId]);

  const isArticleCompare = Boolean(result?.base_article);

  const overlapScore =
    isArticleCompare
      ? `${result?.comparison?.shared_claims?.length || 0} shared`
      : result?.claim_overlap?.score === undefined
        ? "Unknown"
        : `${Math.round(result.claim_overlap.score * 100)}%`;
  const divergenceScore =
    isArticleCompare
      ? result?.comparison?.confidence === undefined
        ? "Unknown"
        : `${Math.round(result.comparison.confidence * 100)}% confidence`
      : result?.framing?.divergence_score === undefined
        ? "Unknown"
        : `${Math.round(result.framing.divergence_score * 100)}%`;
  const sharedClaims = isArticleCompare
    ? result?.comparison?.shared_claims || []
    : result?.claim_overlap?.shared || [];
  const firstUnique = isArticleCompare
    ? result?.comparison?.unique_claims_by_source?.[0]?.claims || []
    : result?.claim_overlap?.left_unique || [];
  const secondUnique = isArticleCompare
    ? result?.comparison?.unique_claims_by_source?.flatMap((item: any, index: number) => index === 0 ? [] : item.claims || []) || []
    : result?.claim_overlap?.right_unique || [];
  const framing = isArticleCompare
    ? {
        shared: result?.comparison?.framing_differences?.flatMap((item: any) => item.shared_frames || []) || [],
        left_only: result?.comparison?.framing_differences?.flatMap((item: any) => item.base_only || []) || [],
        right_only: result?.comparison?.framing_differences?.flatMap((item: any) => item.comparison_only || []) || [],
      }
    : result?.framing || {};
  const entities = result?.entities || { shared: [] };

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Parallax
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Compare coverage
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Compare article URLs or inspect similar coverage for an ingested story.
        </p>
      </header>

      {articleId && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          Loading persisted comparison for article id <span className="font-mono">{articleId}</span>.
        </section>
      )}

      <form
        onSubmit={submit}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              First article
            </span>
            <input
              value={leftUrl}
              onChange={(e) => setLeftUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Second article
            </span>
            <input
              value={rightUrl}
              onChange={(e) => setRightUrl(e.target.value)}
              placeholder="https://..."
              disabled={loading}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !leftUrl.trim() || !rightUrl.trim()}
          className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </form>

      {result && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <ProviderStrip metadata={result.provider_metadata} />
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <ArticleSide label={isArticleCompare ? "Base article" : "First article"} article={isArticleCompare ? result.base_article : result.left} />
            <ArticleSide label={isArticleCompare ? "Closest match" : "Second article"} article={isArticleCompare ? result.similar_articles?.[0] || {} : result.right} />
          </div>

          {isArticleCompare && result.similar_articles?.length > 1 && (
            <Section title="Similar Articles">
              <div className="space-y-3">
                {result.similar_articles.slice(1).map((article: any) => (
                  <article key={article.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                        {Math.round((article.similarity?.score || 0) * 100)}%
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                        {article.source || "Unknown source"}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950">{article.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{article.summary}</p>
                  </article>
                ))}
              </div>
            </Section>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Claim overlap
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {overlapScore}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Framing divergence
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {divergenceScore}
              </p>
            </div>
          </div>

          <Section title="Shared Claims">
            {sharedClaims.length ? (
              <div className="space-y-3">
                {sharedClaims.map((item: any, index: number) => (
                  <div
                    key={`${item.left_claim || item.base_claim}-${index}`}
                    className="rounded-2xl bg-slate-50 p-3"
                  >
                    <p className="text-sm leading-6 text-slate-700">
                      {item.left_claim || item.base_claim}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Matched with: {item.right_claim || item.comparison_claim}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No close claim overlap detected.
              </p>
            )}
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Unique to First">
              <TagList items={firstUnique} />
            </Section>
            <Section title="Unique to Second">
              <TagList items={secondUnique} />
            </Section>
          </div>

          <Section title="Framing">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Shared
                </p>
                <TagList items={framing.shared || []} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  First only
                </p>
                <TagList items={framing.left_only || []} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Second only
                </p>
                <TagList items={framing.right_only || []} />
              </div>
            </div>
          </Section>

          <Section title="Shared Entities">
            <TagList items={entities.shared || []} />
          </Section>

          {isArticleCompare && (
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Timeline">
                <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(result.comparison.timeline_difference || [], null, 2)}</pre>
              </Section>
              <Section title="Source Difference">
                <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(result.comparison.source_difference || [], null, 2)}</pre>
              </Section>
            </div>
          )}

          <Section title="Limitations">
            <ul className="space-y-2">
              {(result.limitations || []).map((item: string) => (
                <li key={item} className="text-sm leading-6 text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </main>
  );
}
