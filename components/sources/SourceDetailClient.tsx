"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ExternalLink, Globe2 } from "lucide-react";
import { apiGet } from "@/lib/api";

type SourceHealth = {
  status: "healthy" | "stale" | "error" | "needs_review" | string;
  label?: string;
  feed_count?: number;
  active_feed_count?: number;
  article_count?: number;
  articles_24h?: number;
  run_count?: number;
  success_rate?: number | null;
  last_checked_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  recommendation?: string;
};

type SourceDetail = {
  source: {
    id: string;
    name: string;
    domain?: string;
    url?: string;
  };
  health?: SourceHealth;
  feeds?: Array<{
    id: string;
    feed_url: string;
    feed_type: string;
    status: string;
    last_checked_at?: string | null;
    last_success_at?: string | null;
    last_error?: string | null;
  }>;
  sync_runs?: Array<{
    id: string;
    sync_scope: string;
    status: string;
    started_at: string;
    duration_ms: number;
    feed_count: number;
    synced_feed_count: number;
    article_count: number;
    card_count: number;
    error_count: number;
  }>;
  profile: {
    sample_size: number;
    analysis_quality_score?: number | null;
    coverage_activity_score: number;
    high_priority_share: number;
  };
  metrics: {
    signal_count: number;
    article_count: number;
    feed_item_count: number;
    saved_count: number;
    high_priority_count: number;
    avg_priority_score: number;
    avg_confidence?: number | null;
  };
  signals: Array<{
    id: string;
    card_type: string;
    title: string;
    summary: string;
    url?: string;
    href: string;
    dominant_frame?: string;
    priority_score: number;
    key_claims: string[];
    narrative_framing: string[];
  }>;
  key_claims: string[];
  dominant_frames: string[];
  topics: string[];
  entities: string[];
  limitations: string[];
};

function phase2SourceToDetail(data: any): SourceDetail {
  const source = data?.source || {};
  const articles = data?.articles || [];
  const health = data?.health || source.health;
  return {
    source: {
      id: source.id,
      name: source.name || "Source",
      domain: source.website_url,
      url: source.website_url,
    },
    health,
    feeds: data?.feeds || [],
    sync_runs: data?.sync_runs || [],
    profile: {
      sample_size: articles.length,
      analysis_quality_score: null,
      coverage_activity_score: articles.length,
      high_priority_share: 0,
    },
    metrics: {
      signal_count: articles.length,
      article_count: source.article_count || articles.length,
      feed_item_count: source.feed_count || 0,
      saved_count: 0,
      high_priority_count: 0,
      avg_priority_score: 0,
      avg_confidence: null,
    },
    signals: articles.map((article: any) => ({
      id: article.id,
      card_type: "ingested_article",
      title: article.title,
      summary: article.summary || "No summary available.",
      url: article.url,
      href: `/articles/${encodeURIComponent(article.id)}`,
      dominant_frame: article.analysis?.narrative_framing?.[0],
      priority_score: 0,
      key_claims: article.analysis?.key_claims || [],
      narrative_framing: article.analysis?.narrative_framing || [],
    })),
    key_claims: articles.flatMap((article: any) => article.analysis?.key_claims || []).slice(0, 8),
    dominant_frames: articles.flatMap((article: any) => article.analysis?.narrative_framing || []).slice(0, 8),
    topics: articles.flatMap((article: any) => article.analysis?.topics || []).slice(0, 8),
    entities: articles.flatMap((article: any) => article.analysis?.entities || []).slice(0, 8),
    limitations: [
      "Phase 2 source records describe ingestion context, not truth certainty.",
      "Default source metadata should be reviewed and refined before production-scale ingestion.",
    ],
  };
}

function scoreLabel(value?: number | null) {
  if (value === null || value === undefined) return "Unknown";
  return `${Math.round(Number(value) * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
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

function healthStyles(status?: string) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-700";
  if (status === "stale") return "bg-amber-50 text-amber-700";
  if (status === "error") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function HealthBadge({ health }: { health?: SourceHealth }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${healthStyles(health?.status)}`}>
      <Activity aria-hidden="true" className="h-3 w-3" />
      {health?.label || "Needs review"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">None available.</p>;
  }

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

export function SourceDetailClient({ sourceId }: { sourceId: string }) {
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    apiGet(`/api/v1/authors/${encodeURIComponent(sourceId)}`)
      .then((data) => {
        if (mounted) setDetail(data);
      })
      .catch(async (err: any) => {
        try {
          const data = await apiGet(`/api/v1/sources/${encodeURIComponent(sourceId)}`);
          if (mounted) setDetail(phase2SourceToDetail(data));
        } catch {
          if (mounted) setError(err?.message || "Could not load source.");
        }
      });

    return () => {
      mounted = false;
    };
  }, [sourceId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <a
          href="/sources"
          className="inline-flex items-center gap-2 text-sm text-slate-600 underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Sources
        </a>
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <p className="text-sm text-slate-500">Loading source...</p>
      </main>
    );
  }

  const source = detail.source;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <a
        href="/sources"
        className="inline-flex items-center gap-2 text-sm text-slate-600 underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Sources
      </a>

      <article className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Globe2 aria-hidden="true" className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-8 text-slate-950">
              {source.name}
            </h1>
            {source.domain && (
              <p className="mt-1 break-all text-sm text-slate-500">
                {source.domain}
              </p>
            )}

            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                Source URL
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Signals" value={detail.metrics.signal_count} />
        <Metric label="Articles 24h" value={detail.health?.articles_24h || 0} />
        <Metric label="Success Rate" value={scoreLabel(detail.health?.success_rate)} />
        <Metric label="Health" value={detail.health?.label || "Needs review"} />
      </div>

      <Section title="Ingestion Health">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <HealthBadge health={detail.health} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {detail.health?.active_feed_count || 0} active feeds
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {detail.health?.run_count || 0} sync runs
            </span>
          </div>
          <div className="grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2">
            <p>Last checked: {formatDateTime(detail.health?.last_checked_at)}</p>
            <p>Last success: {formatDateTime(detail.health?.last_success_at)}</p>
            <p>Articles in 24h: {detail.health?.articles_24h || 0}</p>
            <p>Success rate: {scoreLabel(detail.health?.success_rate)}</p>
          </div>
          {detail.health?.last_error && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-700">
              {detail.health.last_error}
            </p>
          )}
          {detail.health?.recommendation && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {detail.health.recommendation}
            </p>
          )}
        </div>
      </Section>

      {detail.feeds?.length ? (
        <Section title="Feeds">
          <div className="space-y-3">
            {detail.feeds.map((feed) => (
              <article key={feed.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {feed.feed_type}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {feed.status}
                  </span>
                </div>
                <p className="mt-2 break-all text-sm text-slate-700">{feed.feed_url}</p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                  <span>Checked: {formatDateTime(feed.last_checked_at)}</span>
                  <span>Success: {formatDateTime(feed.last_success_at)}</span>
                </div>
                {feed.last_error && (
                  <p className="mt-2 text-xs leading-5 text-rose-700">{feed.last_error}</p>
                )}
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {detail.sync_runs?.length ? (
        <Section title="Recent Sync Runs">
          <div className="space-y-3">
            {detail.sync_runs.slice(0, 6).map((run) => (
              <article key={run.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${healthStyles(run.status === "completed" ? "healthy" : run.status === "partial" ? "stale" : run.status === "failed" ? "error" : "needs_review")}`}>
                    {run.status}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {run.sync_scope}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {Math.round((run.duration_ms || 0) / 1000)}s
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{formatDateTime(run.started_at)}</p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-2">
                  <span>Feeds: {run.synced_feed_count}/{run.feed_count}</span>
                  <span>Articles: {run.article_count}</span>
                  <span>Cards: {run.card_count}</span>
                  <span>Errors: {run.error_count}</span>
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Frames">
          <TagList items={detail.dominant_frames} />
        </Section>
        <Section title="Topics">
          <TagList items={detail.topics} />
        </Section>
      </div>

      <Section title="Key Claims">
        {detail.key_claims.length ? (
          <ol className="space-y-3">
            {detail.key_claims.map((claim, index) => (
              <li
                key={`${claim}-${index}`}
                className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"
              >
                {claim}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No claims available.</p>
        )}
      </Section>

      <Section title="Recent Signals">
        {detail.signals.length ? (
          <div className="space-y-3">
            {detail.signals.map((signal) => (
              <article key={signal.id} className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {signal.card_type}
                  </span>
                  {signal.dominant_frame && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                      {signal.dominant_frame}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">
                  {signal.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {signal.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={signal.href}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Open
                  </a>
                  {signal.url && (
                    <a
                      href={signal.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Source
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No signals available.</p>
        )}
      </Section>

      <Section title="Limitations">
        <ul className="space-y-2">
          {detail.limitations.map((item) => (
            <li key={item} className="text-sm leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
