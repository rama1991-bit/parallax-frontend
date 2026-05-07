"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Columns3, ExternalLink } from "lucide-react";
import { API_URL, apiGet } from "@/lib/api";

function asList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.claim || item?.label || item?.name || item?.text || "";
    })
    .filter(Boolean);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Unknown";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function providerLabel(metadata: any) {
  if (!metadata) return "heuristic";
  return [metadata.provider || "heuristic", metadata.status || "unknown"].filter(Boolean).join(" / ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-slate-500">None available.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function percentLabel(value: any) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unknown";
  return `${Math.round(number * 100)}%`;
}

function ClusterAutomation({ automation }: { automation: any }) {
  const tasks = Array.isArray(automation?.coverage_gap_tasks) ? automation.coverage_gap_tasks : [];
  const searches = Array.isArray(automation?.suggested_source_searches) ? automation.suggested_source_searches : [];
  const candidates = Array.isArray(automation?.source_candidates) ? automation.source_candidates : [];
  if (!tasks.length && !searches.length && !candidates.length) return null;

  return (
    <div className="mt-3 space-y-3">
      {candidates.length > 0 && (
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Source Drafts</p>
          <div className="mt-2 space-y-2">
            {candidates.slice(0, 3).map((candidate: any) => (
              <div key={candidate.id || candidate.name} className="rounded-xl bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs capitalize text-emerald-800">{candidate.status || "draft"}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{candidate.priority || "medium"}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{candidate.source_type || "source"}</span>
                  {candidate.language && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{candidate.language}</span>}
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{candidate.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{candidate.search_query}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {candidate.source_manager_url && (
                    <a href={candidate.source_manager_url} className="inline-flex rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">
                      Use draft
                    </a>
                  )}
                  {candidate.source_id && (
                    <a href={`/sources/${encodeURIComponent(candidate.source_id)}`} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                      Open source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
      {tasks.length > 0 && (
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage Tasks</p>
          <div className="mt-2 space-y-2">
            {tasks.slice(0, 3).map((task: any, index: number) => (
              <div key={`${task.type || "task"}-${index}`} className="rounded-xl bg-amber-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">{task.priority || "medium"}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-amber-800">{task.type || "coverage_gap"}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-amber-950">{task.label || "Review coverage gap"}</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">{task.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {searches.length > 0 && (
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source Searches</p>
          <div className="mt-2 space-y-2">
            {searches.slice(0, 3).map((search: any, index: number) => (
              <div key={`${search.query || "search"}-${index}`} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-medium leading-6 text-slate-900">{search.query}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{search.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export function TopicDetailClient({ topicId }: { topicId: string }) {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [topicDetail, setTopicDetail] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([
      apiGet(`/api/v1/topics/${encodeURIComponent(topicId)}/intelligence`),
      apiGet(`/api/v1/topics/${encodeURIComponent(topicId)}`).catch(() => null),
      apiGet(`/api/v1/intelligence/clusters?topic_id=${encodeURIComponent(topicId)}&limit=10`).catch(() => null),
    ])
      .then(([intelligenceData, topicData, clusterData]) => {
        if (!mounted) return;
        setIntelligence(intelligenceData);
        setTopicDetail(topicData);
        setClusters(clusterData?.items || []);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Could not load topic intelligence.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [topicId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-4 pb-24 md:p-6">
        <p className="text-sm text-slate-500">Loading topic intelligence...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-4 pb-24 md:p-6">
        <a href="/topics" className="inline-flex items-center gap-2 text-sm text-slate-600 underline">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Topics
        </a>
        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  const topic = intelligence?.subject || topicDetail?.topic || {};
  const sample = intelligence?.sample || {};
  const sourceDiversity = intelligence?.source_diversity || {};
  const sampleArticles = intelligence?.sample_articles || [];
  const latestArticles = topicDetail?.latest_articles || [];

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <a href="/topics" className="inline-flex items-center gap-2 text-sm text-slate-600 underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Topics
      </a>

      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {sample.article_count || 0} articles
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {sample.source_count || 0} sources
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {providerLabel(intelligence?.provider_metadata)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold leading-8 text-slate-950">
          {topic.name || "Topic intelligence"}
        </h1>
        {topic.description && (
          <p className="mt-2 text-sm leading-6 text-slate-600">{topic.description}</p>
        )}
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {intelligence?.summary || "No intelligence summary is available yet."}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Analyzed</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{sample.analyzed_count || 0}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Latest</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(sample.latest_article_at)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Snapshot</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatDateTime(intelligence?.snapshot?.created_at)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize text-slate-950">{intelligence?.status || "unknown"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Dominant Frames">
          <TagList items={asList(intelligence?.framing_pattern?.dominant_frames)} />
        </Section>
        <Section title="Tone Pattern">
          <TagList items={asList(intelligence?.tone_pattern?.dominant_tones)} />
        </Section>
      </div>

      <Section title="Recurring Claims">
        {asList(intelligence?.recurring_claims).length ? (
          <ol className="space-y-3">
            {asList(intelligence.recurring_claims).slice(0, 8).map((claim, index) => (
              <li key={`${claim}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {claim}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No recurring claims have been extracted yet.</p>
        )}
      </Section>

      <Section title="Source Diversity">
        <div className="grid gap-3 md:grid-cols-2">
          {(sourceDiversity.dominant_sources || []).slice(0, 6).map((source: any) => (
            <div key={source.label} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-950">{source.label}</p>
              <p className="mt-1 text-xs text-slate-500">{source.count || 0} articles / {Math.round((source.share || 0) * 100)}%</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Countries</h3>
            <div className="mt-2">
              <TagList items={(sourceDiversity.countries || []).map((item: any) => item.label).filter(Boolean)} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Languages</h3>
            <div className="mt-2">
              <TagList items={(sourceDiversity.languages || []).map((item: any) => item.label).filter(Boolean)} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Active Event Clusters">
        {clusters.length ? (
          <div className="space-y-3">
            {clusters.slice(0, 6).map((cluster: any) => {
              const metadata = cluster.provider_metadata || {};
              const quality = metadata.cluster_quality || {};
              const diversity = metadata.source_diversity || {};
              const bridgeTerms = metadata.language_bridge_terms || [];
              const automation = metadata.automation || {};
              return (
                <article key={cluster.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                      {cluster.article_count || 0} articles
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                      {(cluster.source_ids || []).length} sources
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                      {(cluster.languages || []).length} languages
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                      {percentLabel(quality.quality_score)} quality
                    </span>
                    {diversity.cross_language && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                        cross-language
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{cluster.title}</h3>
                  {cluster.summary && <p className="mt-2 text-sm leading-6 text-slate-700">{cluster.summary}</p>}
                  <div className="mt-3">
                    <TagList items={[...(cluster.languages || []), ...(cluster.countries || [])].slice(0, 8)} />
                  </div>
                  {bridgeTerms.length > 0 && (
                    <div className="mt-3">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Language bridge terms</h4>
                      <TagList items={bridgeTerms} />
                    </div>
                  )}
                  <ClusterAutomation automation={automation} />
                  {(cluster.sample_articles || []).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(cluster.sample_articles || []).slice(0, 3).map((article: any) => (
                        <div key={article.id} className="rounded-xl bg-white p-3 text-sm leading-5 text-slate-700">
                          <p className="font-medium text-slate-950">{article.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[article.source, article.language, formatDateTime(article.published_at)].filter(Boolean).join(" / ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(cluster.sample_articles || [])[0]?.id && (
                      <a href={`/compare?articleId=${encodeURIComponent((cluster.sample_articles || [])[0].id)}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <Columns3 aria-hidden="true" className="h-4 w-4" />
                        Compare
                      </a>
                    )}
                    {cluster.id && (
                      <a href={`${API_URL}/api/v1/intelligence/clusters/${encodeURIComponent(cluster.id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        Open
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No event clusters match this topic yet.</p>
        )}
      </Section>

      <Section title="Sample Articles">
        {(sampleArticles.length ? sampleArticles : latestArticles).length ? (
          <div className="space-y-3">
            {(sampleArticles.length ? sampleArticles : latestArticles).slice(0, 8).map((article: any) => (
              <article key={article.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {article.source && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{article.source}</span>
                  )}
                  {article.tone && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{article.tone}</span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{article.title}</h3>
                {article.summary && <p className="mt-2 text-sm leading-6 text-slate-700">{article.summary}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {article.id && (
                    <a href={`/articles/${encodeURIComponent(article.id)}`} className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                      Article
                    </a>
                  )}
                  {article.id && (
                    <a href={`/compare?articleId=${encodeURIComponent(article.id)}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <Columns3 aria-hidden="true" className="h-4 w-4" />
                      Compare
                    </a>
                  )}
                  {article.url && (
                    <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      Source
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No sampled articles match this topic yet.</p>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Weak Spots">
          <TagList items={asList(intelligence?.weak_spots)} />
        </Section>
        <Section title="Limitations">
          <TagList items={asList(intelligence?.limitations)} />
        </Section>
      </div>
    </main>
  );
}
