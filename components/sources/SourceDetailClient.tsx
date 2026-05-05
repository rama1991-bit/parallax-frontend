"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ExternalLink, Globe2, Send } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

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
    review_status?: string;
    review_notes?: string | null;
    disabled_reason?: string | null;
    quality_score?: number;
    terms_reviewed_at?: string | null;
    last_reviewed_at?: string | null;
  };
  health?: SourceHealth;
  quality?: {
    quality_score: number;
    quality_grade: string;
    needs_review: boolean;
    review_status: string;
    metadata_completeness: number;
    feed_count: number;
    active_feed_count: number;
    disabled_feed_count: number;
    health_status: string;
    factors: string[];
    risks: string[];
    recommendation: string;
  };
  feeds?: Array<{
    id: string;
    feed_url: string;
    feed_type: string;
    status: string;
    last_checked_at?: string | null;
    last_success_at?: string | null;
    last_error?: string | null;
    disabled_reason?: string | null;
    review_notes?: string | null;
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

type OpsAlert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical" | string;
  status: string;
  title: string;
  message: string;
  updated_at?: string;
  delivery_status?: string;
  delivery?: {
    status?: string;
    created_at?: string;
    delivered_at?: string | null;
    error?: string | null;
  } | null;
};

function phase2SourceToDetail(data: any): SourceDetail {
  const source = data?.source || {};
  const articles = data?.articles || [];
  const health = data?.health || source.health;
  const quality = data?.quality || source.quality;
  return {
    source: {
      id: source.id,
      name: source.name || "Source",
      domain: source.website_url,
      url: source.website_url,
      review_status: source.review_status,
      review_notes: source.review_notes,
      disabled_reason: source.disabled_reason,
      quality_score: source.quality_score,
      terms_reviewed_at: source.terms_reviewed_at,
      last_reviewed_at: source.last_reviewed_at,
    },
    health,
    quality,
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

function reviewStyles(status?: string) {
  if (status === "reviewed") return "bg-emerald-50 text-emerald-700";
  if (status === "quarantined") return "bg-amber-50 text-amber-700";
  if (status === "disabled") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function severityStyles(severity?: string) {
  if (severity === "critical") return "bg-rose-50 text-rose-700";
  if (severity === "warning") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function deliveryStyles(status?: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "skipped") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function reviewLabel(status?: string) {
  return (status || "needs_review").replace(/_/g, " ");
}

function deliveryLabel(status?: string) {
  return (status || "not_sent").replace(/_/g, " ");
}

function HealthBadge({ health }: { health?: SourceHealth }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${healthStyles(health?.status)}`}>
      <Activity aria-hidden="true" className="h-3 w-3" />
      {health?.label || "Needs review"}
    </span>
  );
}

function ReviewBadge({ status }: { status?: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs capitalize ${reviewStyles(status)}`}>
      {reviewLabel(status)}
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
  const [adminKey, setAdminKey] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [opsAlerts, setOpsAlerts] = useState<OpsAlert[]>([]);
  const [opsSummary, setOpsSummary] = useState<any>(null);
  const [deliveryResult, setDeliveryResult] = useState<any>(null);

  async function loadDetail(mounted = true) {
    try {
      const data = await apiGet(`/api/v1/authors/${encodeURIComponent(sourceId)}`);
      if (mounted) setDetail(data);
    } catch (err: any) {
      try {
        const data = await apiGet(`/api/v1/sources/${encodeURIComponent(sourceId)}`);
        if (mounted) setDetail(phase2SourceToDetail(data));
      } catch {
        if (mounted) setError(err?.message || "Could not load source.");
      }
    }
  }

  useEffect(() => {
    let mounted = true;
    if (process.env.NEXT_PUBLIC_ADMIN_CONTROLS === "true" && typeof window !== "undefined") {
      setAdminKey(window.sessionStorage.getItem("parallax_admin_key") || "");
    }
    loadDetail(mounted);

    return () => {
      mounted = false;
    };
  }, [sourceId]);

  function updateAdminKey(value: string) {
    setAdminKey(value);
    if (typeof window !== "undefined") {
      if (value.trim()) {
        window.sessionStorage.setItem("parallax_admin_key", value);
      } else {
        window.sessionStorage.removeItem("parallax_admin_key");
      }
    }
  }

  function adminHeaders(): Record<string, string> {
    const key = adminKey.trim();
    return key ? { "X-Parallax-Admin-Key": key } : {};
  }

  async function loadOpsAlerts() {
    if (!adminKey.trim()) return;
    const data = await apiGet(
      `/api/v1/sources/ops/alerts?source_id=${encodeURIComponent(sourceId)}&limit=12`,
      adminHeaders()
    );
    setOpsAlerts(data?.alerts || []);
    setOpsSummary(data?.summary || null);
  }

  async function runAdminAction(label: string, action: () => Promise<unknown>) {
    if (!adminKey.trim()) {
      setError("Admin key is required for source governance actions.");
      return;
    }
    setActionLoading(label);
    setError("");
    try {
      await action();
      await loadDetail(true);
      await loadOpsAlerts();
    } catch (err: any) {
      setError(err?.message || "Could not complete source governance action.");
    } finally {
      setActionLoading("");
    }
  }

  async function updateSourceReview(reviewStatus: string, termsReviewed = false) {
    await runAdminAction(reviewStatus, () =>
      apiPost(
        `/api/v1/sources/${encodeURIComponent(sourceId)}/review`,
        {
          review_status: reviewStatus,
          review_notes:
            reviewStatus === "reviewed"
              ? "Reviewed from source detail."
              : `Marked ${reviewStatus} from source detail.`,
          disabled_reason:
            reviewStatus === "quarantined" || reviewStatus === "disabled"
              ? `Marked ${reviewStatus} from source detail.`
              : undefined,
          terms_reviewed: termsReviewed,
        },
        adminHeaders()
      )
    );
  }

  async function updateFeedStatus(feedId: string, status: string) {
    await runAdminAction(`${feedId}-${status}`, () =>
      apiPost(
        `/api/v1/sources/feeds/${encodeURIComponent(feedId)}/status`,
        {
          status,
          disabled_reason:
            status === "active" ? undefined : `Marked ${status} from source detail.`,
          review_notes: `Feed marked ${status} from source detail.`,
        },
        adminHeaders()
      )
    );
  }

  async function evaluateSourceOpsAlerts() {
    await runAdminAction("ops-alerts", async () => {
      const result = await apiPost(
        `/api/v1/sources/ops/alerts/evaluate?source_id=${encodeURIComponent(sourceId)}&limit=1`,
        {},
        adminHeaders()
      );
      setOpsSummary(result?.summary || null);
    });
  }

  async function deliverSourceOpsAlerts() {
    await runAdminAction("deliver-ops-alerts", async () => {
      const result = await apiPost(
        `/api/v1/sources/ops/alerts/deliver?source_id=${encodeURIComponent(sourceId)}&limit=25`,
        {},
        adminHeaders()
      );
      setDeliveryResult(result);
    });
  }

  async function acknowledgeOpsAlert(alertId: string) {
    await runAdminAction(`ack-${alertId}`, () =>
      apiPost(
        `/api/v1/sources/ops/alerts/${encodeURIComponent(alertId)}/acknowledge`,
        {},
        adminHeaders()
      )
    );
  }

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
  const adminControlsEnabled = process.env.NEXT_PUBLIC_ADMIN_CONTROLS === "true";
  const canGovernSource = adminControlsEnabled && Array.isArray(detail.feeds);

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

            <div className="mt-4 flex flex-wrap gap-2">
              <ReviewBadge status={source.review_status} />
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {scoreLabel(detail.quality?.quality_score ?? source.quality_score)} quality
              </span>
              {detail.quality?.quality_grade && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700 capitalize">
                  {detail.quality.quality_grade}
                </span>
              )}
            </div>
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

      <Section title="Source Quality">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <ReviewBadge status={source.review_status || detail.quality?.review_status} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {scoreLabel(detail.quality?.metadata_completeness)} metadata
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {detail.quality?.active_feed_count || 0} active feeds
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {detail.quality?.disabled_feed_count || 0} disabled feeds
            </span>
          </div>
          {source.review_notes && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {source.review_notes}
            </p>
          )}
          {source.disabled_reason && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-700">
              {source.disabled_reason}
            </p>
          )}
          {detail.quality?.recommendation && (
            <p className="text-sm leading-6 text-slate-700">{detail.quality.recommendation}</p>
          )}
          {detail.quality?.factors?.length ? (
            <TagList items={detail.quality.factors.slice(0, 6)} />
          ) : null}
          {detail.quality?.risks?.length ? (
            <div className="grid gap-2">
              {detail.quality.risks.slice(0, 5).map((risk) => (
                <p key={risk} className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  {risk}
                </p>
              ))}
            </div>
          ) : null}

          {canGovernSource && (
            <div className="grid gap-3 border-t border-slate-100 pt-3">
              <input
                value={adminKey}
                onChange={(event) => updateAdminKey(event.target.value)}
                type="password"
                placeholder="Admin API key"
                className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateSourceReview("reviewed", true)}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review
                </button>
                <button
                  onClick={() => updateSourceReview("needs_review")}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Needs review
                </button>
                <button
                  onClick={() => updateSourceReview("quarantined")}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quarantine
                </button>
                <button
                  onClick={() => updateSourceReview("disabled")}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Disable
                </button>
                <button
                  onClick={() =>
                    runAdminAction("quality", () =>
                      apiPost(
                        `/api/v1/sources/${encodeURIComponent(sourceId)}/quality/recalculate`,
                        {},
                        adminHeaders()
                      )
                    )
                  }
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Recalculate
                </button>
                <button
                  onClick={evaluateSourceOpsAlerts}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Evaluate ops
                </button>
                <button
                  onClick={deliverSourceOpsAlerts}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  Deliver ops
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {canGovernSource && (opsSummary || opsAlerts.length > 0) ? (
        <Section title="Operational Alerts">
          <div className="space-y-3">
            {opsSummary && (
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <span className="rounded-lg bg-slate-50 p-3">{opsSummary.critical || 0} critical</span>
                <span className="rounded-lg bg-slate-50 p-3">{opsSummary.warning || 0} warnings</span>
                <span className="rounded-lg bg-slate-50 p-3">{opsSummary.info || 0} info</span>
              </div>
            )}
            {deliveryResult?.summary && (
              <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                <span className="rounded-lg bg-slate-50 p-3">{deliveryResult.summary.delivered || 0} delivered</span>
                <span className="rounded-lg bg-slate-50 p-3">{deliveryResult.summary.failed || 0} failed</span>
                <span className="rounded-lg bg-slate-50 p-3">{deliveryResult.summary.skipped || 0} skipped</span>
              </div>
            )}
            {opsAlerts.map((alert) => (
              <article key={alert.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${severityStyles(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {alert.alert_type}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${deliveryStyles(alert.delivery_status)}`}>
                    {deliveryLabel(alert.delivery_status)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
                {alert.delivery?.error && (
                  <p className="mt-2 text-xs leading-5 text-rose-700">{alert.delivery.error}</p>
                )}
                <button
                  onClick={() => acknowledgeOpsAlert(alert.id)}
                  disabled={Boolean(actionLoading) || !adminKey.trim()}
                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Acknowledge
                </button>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

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
                {feed.disabled_reason && (
                  <p className="mt-2 text-xs leading-5 text-amber-800">{feed.disabled_reason}</p>
                )}
                {canGovernSource && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["active", "paused", "quarantined", "disabled"].map((status) => (
                      <button
                        key={`${feed.id}-${status}`}
                        onClick={() => updateFeedStatus(feed.id, status)}
                        disabled={Boolean(actionLoading) || !adminKey.trim() || feed.status === status}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs capitalize text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
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
