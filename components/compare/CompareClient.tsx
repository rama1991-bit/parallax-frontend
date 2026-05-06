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

function percentLabel(value: any) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unknown";
  return `${Math.round(number * 100)}%`;
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

function TitleDifferenceList({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-slate-500">No title differences detected.</p>;

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item: any, index: number) => {
        const baseTerms = Array.isArray(item.base_terms) ? item.base_terms : [];
        const comparisonTerms = Array.isArray(item.comparison_terms) ? item.comparison_terms : [];
        return (
          <article key={`${item.comparison_article_id || index}-title`} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                {Math.round((item.title_similarity || 0) * 100)}% title overlap
              </span>
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Base</p>
            <p className="mt-1 text-sm leading-6 text-slate-800">{item.base_title || "Untitled"}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Match</p>
            <p className="mt-1 text-sm leading-6 text-slate-800">{item.comparison_title || "Untitled"}</p>
            {(baseTerms.length > 0 || comparisonTerms.length > 0) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Base emphasis</p>
                  <TagList items={baseTerms} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Match emphasis</p>
                  <TagList items={comparisonTerms} />
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ClaimGroupCards({ groups, empty }: { groups: any[]; empty: string }) {
  if (!groups?.length) return <p className="text-sm text-slate-500">{empty}</p>;

  return (
    <div className="space-y-3">
      {groups.slice(0, 8).map((group: any, index: number) => {
        const claims = Array.isArray(group.claims) ? group.claims : [];
        return (
          <article key={`${group.comparison_article_id || group.article_id || index}-claims`} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                {group.comparison_source || group.source || "Unknown source"}
              </span>
              {claims.length > 0 && (
                <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                  {claims.length} claims
                </span>
              )}
            </div>
            {claims.length ? (
              <ul className="mt-3 space-y-2">
                {claims.slice(0, 6).map((claim: string, claimIndex: number) => (
                  <li key={`${claim}-${claimIndex}`} className="text-sm leading-6 text-slate-700">
                    {claim}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No claims listed.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function CoverageGapList({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-slate-500">No coverage gaps detected in the selected matches.</p>;

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item: any, index: number) => (
        <article key={`${item.comparison_article_id || index}-${item.type}`} className="rounded-2xl bg-amber-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">
              {item.type || "coverage_gap"}
            </span>
            {item.source && (
              <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">
                {item.source}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-900">{item.reason || "Additional comparison context is needed."}</p>
          {Array.isArray(item.claims) && item.claims.length > 0 && (
            <ul className="mt-3 space-y-2">
              {item.claims.slice(0, 4).map((claim: string, claimIndex: number) => (
                <li key={`${claim}-${claimIndex}`} className="text-sm leading-6 text-amber-900">
                  {claim}
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}

function TimelineList({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-slate-500">No timeline differences available.</p>;

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item: any, index: number) => (
        <article key={`${item.comparison_published_at || index}-timeline`} className="rounded-2xl bg-slate-50 p-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
              {item.direction || "unknown"}
            </span>
            <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
              {item.difference_hours === null || item.difference_hours === undefined ? "unknown hours" : `${item.difference_hours}h`}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-xs text-slate-600">
            <div>
              <dt className="font-medium text-slate-500">Base</dt>
              <dd className="break-words">{item.base_published_at || "Unknown"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Match</dt>
              <dd className="break-words">{item.comparison_published_at || "Unknown"}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

function SourceDifferenceList({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-slate-500">No source differences available.</p>;

  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item: any, index: number) => {
        const base = item.base_source || {};
        const comparison = item.comparison_source || {};
        const differences = Array.isArray(item.differences) ? item.differences : [];
        return (
          <article key={`${comparison.id || index}-source`} className="rounded-2xl bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                {item.same_source ? "same source" : "different source"}
              </span>
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                {item.source_contrast || differences.join(" / ") || "metadata match"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Base</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{base.name || "Unknown source"}</p>
                <p className="text-xs leading-5 text-slate-600">
                  {[base.country, base.language, base.source_type, base.source_size].filter(Boolean).join(" / ") || "No metadata"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Match</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{comparison.name || "Unknown source"}</p>
                <p className="text-xs leading-5 text-slate-600">
                  {[comparison.country, comparison.language, comparison.source_type, comparison.source_size].filter(Boolean).join(" / ") || "No metadata"}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ClusterAutomation({ automation }: { automation: any }) {
  const tasks = Array.isArray(automation?.coverage_gap_tasks) ? automation.coverage_gap_tasks : [];
  const searches = Array.isArray(automation?.suggested_source_searches) ? automation.suggested_source_searches : [];
  if (!tasks.length && !searches.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tasks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Coverage Tasks</p>
          <div className="space-y-2">
            {tasks.slice(0, 4).map((task: any, index: number) => (
              <article key={`${task.type || "task"}-${index}`} className="rounded-2xl bg-amber-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">
                    {task.priority || "medium"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">
                    {task.type || "coverage_gap"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-amber-950">{task.label || "Review coverage gap"}</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">{task.reason}</p>
                {task.search_query && (
                  <p className="mt-2 rounded-xl bg-white p-2 text-xs leading-5 text-amber-900">{task.search_query}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
      {searches.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Source Searches</p>
          <div className="space-y-2">
            {searches.slice(0, 4).map((search: any, index: number) => (
              <article key={`${search.query || "search"}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-sm font-medium leading-6 text-slate-900">{search.query}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{search.reason}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {search.language && <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">{search.language}</span>}
                  {search.source_type && <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">{search.source_type}</span>}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const entities = result?.entities || result?.comparison?.entities || { shared: [] };
  const titleDifferences = isArticleCompare ? result?.comparison?.title_differences || [] : [];
  const missingClaims = isArticleCompare ? result?.comparison?.missing_claims || [] : [];
  const addedClaims = isArticleCompare ? result?.comparison?.added_claims || [] : [];
  const coverageGaps = isArticleCompare ? result?.comparison?.coverage_gaps || [] : [];
  const timelineItems = isArticleCompare ? result?.comparison?.timeline_difference || [] : [];
  const sourceItems = isArticleCompare ? result?.comparison?.source_difference || [] : [];

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

          {isArticleCompare && result.event_cluster && (
            <Section title="Event Cluster">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {result.event_cluster.article_count || 0} articles
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {(result.event_cluster.source_ids || []).length} sources
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {(result.event_cluster.languages || []).length} languages
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {percentLabel(result.event_cluster.cluster_quality?.quality_score)} quality
                  </span>
                  {result.event_cluster.source_diversity?.cross_language && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                      cross-language
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold leading-6 text-slate-950">{result.event_cluster.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{result.event_cluster.summary}</p>
                </div>
                <TagList items={[...(result.event_cluster.frames || []), ...(result.event_cluster.languages || [])].slice(0, 10)} />
                {(result.event_cluster.language_bridge_terms || []).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Language bridge terms
                    </p>
                    <TagList items={result.event_cluster.language_bridge_terms || []} />
                  </div>
                )}
                <ClusterAutomation automation={result.event_cluster.automation} />
              </div>
            </Section>
          )}

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

          {isArticleCompare && (
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Title Differences">
                <TitleDifferenceList items={titleDifferences} />
              </Section>
              <Section title="Coverage Gaps">
                <CoverageGapList items={coverageGaps} />
              </Section>
            </div>
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

          {isArticleCompare && (
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Missing Claims">
                <ClaimGroupCards groups={missingClaims} empty="No base claims are missing from the selected matches." />
              </Section>
              <Section title="Added Claims">
                <ClaimGroupCards groups={addedClaims} empty="No added comparison claims detected." />
              </Section>
            </div>
          )}

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
                <TimelineList items={timelineItems} />
              </Section>
              <Section title="Source Difference">
                <SourceDifferenceList items={sourceItems} />
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
