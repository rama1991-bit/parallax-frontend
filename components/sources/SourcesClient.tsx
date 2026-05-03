"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Database, Globe2, RefreshCcw } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type SourceSummary = {
  id: string;
  name: string;
  domain?: string;
  url?: string;
  signal_count: number;
  article_count: number;
  feed_item_count: number;
  saved_count: number;
  high_priority_count: number;
  avg_priority_score: number;
  avg_confidence?: number | null;
  dominant_frames: string[];
  topics: string[];
};

type Phase2Source = {
  id: string;
  name: string;
  website_url?: string;
  rss_url?: string;
  country?: string;
  language?: string;
  region?: string;
  source_size?: string;
  source_type?: string;
  feed_count?: number;
  article_count?: number;
  is_default?: boolean;
};

const ADMIN_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_ADMIN_CONTROLS === "true";
const ADMIN_KEY_STORAGE_KEY = "parallax_admin_key";

function scoreLabel(value?: number | null) {
  if (value === null || value === undefined) return "Unknown";
  return `${Math.round(Number(value) * 100)}%`;
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 4).map((item) => (
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

export function SourcesClient() {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [sourceRecords, setSourceRecords] = useState<Phase2Source[]>([]);
  const [defaultPreview, setDefaultPreview] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [syncingActive, setSyncingActive] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");

  async function loadSources() {
    setError("");

    try {
      const [authorData, sourceData, previewData] = await Promise.all([
        apiGet("/api/v1/authors"),
        apiGet("/api/v1/sources?limit=250"),
        apiGet("/api/v1/sources/defaults/preview"),
      ]);
      setSources(authorData?.sources || []);
      setSourceRecords(sourceData?.sources || []);
      setDefaultPreview(previewData);
    } catch (err: any) {
      setError(err?.message || "Could not load sources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ADMIN_CONTROLS_ENABLED && typeof window !== "undefined") {
      setAdminKey(window.sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY) || "");
    }
    loadSources();
  }, []);

  function updateAdminKey(value: string) {
    setAdminKey(value);
    if (typeof window !== "undefined") {
      if (value.trim()) {
        window.sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, value);
      } else {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
      }
    }
  }

  function adminHeaders(): Record<string, string> {
    const key = adminKey.trim();
    return key ? { "X-Parallax-Admin-Key": key } : {};
  }

  async function seedDefaults() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for default source seeding.");
      return;
    }
    setSeeding(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/sources/defaults/seed", {}, adminHeaders());
      setSeedResult(result);
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not seed default sources.");
    } finally {
      setSeeding(false);
    }
  }

  async function syncActiveSources() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for active source sync.");
      return;
    }
    setSyncingActive(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/sync-active?source_limit=25&feed_limit=25&article_limit=5&card_limit=10",
        {},
        adminHeaders()
      );
      setSyncResult(result);
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not sync active source feeds.");
    } finally {
      setSyncingActive(false);
    }
  }

  const defaultSummary = defaultPreview?.summary || {};
  const defaultSourceCount = sourceRecords.filter((source) => source.is_default).length;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Sources
            </h1>
          </div>

          <button
            onClick={loadSources}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
            aria-label="Refresh sources"
            title="Refresh sources"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-slate-700">
              <Database aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-base font-semibold text-slate-950">
                Default source database
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Seed a multilingual baseline of agencies, broadcasters, newspapers, independent outlets, NGOs, and official sources.
            </p>
          </div>

          {ADMIN_CONTROLS_ENABLED && (
            <div className="grid gap-2 sm:min-w-72">
              <input
                value={adminKey}
                onChange={(event) => updateAdminKey(event.target.value)}
                type="password"
                placeholder="Admin API key"
                className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={seedDefaults}
                  disabled={seeding || !adminKey.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {seeding ? "Seeding..." : defaultSourceCount ? "Refresh defaults" : "Seed defaults"}
                </button>
                <button
                  onClick={syncActiveSources}
                  disabled={syncingActive || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {syncingActive ? "Syncing..." : "Sync active"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Catalog</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.source_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">RSS feeds</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.rss_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Languages</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.language_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Seeded</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSourceCount}</p>
          </div>
        </div>

        {seedResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Seeded {seedResult.summary?.seeded_source_count || 0} sources and {seedResult.summary?.seeded_feed_count || 0} feeds.
          </p>
        )}

        {syncResult && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            Synced {syncResult.synced_feed_count || 0} feeds, saved {syncResult.article_count || 0} articles, created {syncResult.card_count || 0} cards, with {syncResult.error_count || 0} errors.
          </p>
        )}

        {defaultPreview?.sources?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {defaultPreview.sources.slice(0, 10).map((source: any) => (
              <span key={source.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {source.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {sourceRecords.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">Source records</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sourceRecords.slice(0, 12).map((source) => (
              <article key={source.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {source.is_default && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">default</span>
                  )}
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.source_type || "source"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.language || "language unknown"}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{source.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {[source.country, source.region, source.source_size].filter(Boolean).join(" / ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.feed_count || 0} feeds
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.article_count || 0} articles
                  </span>
                </div>
                <a
                  href={`/sources/${encodeURIComponent(source.id)}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Open
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <Globe2 aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            No source signals yet
          </h2>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href="/feeds"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Feeds
            </a>
            <a
              href="/"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              Feed
            </a>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <article
              key={source.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Globe2 aria-hidden="true" className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {source.signal_count} signals
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {source.high_priority_count} priority
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {scoreLabel(source.avg_confidence)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                    {source.name}
                  </h2>
                  {source.domain && (
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {source.domain}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <TagList items={source.dominant_frames} />
                    <TagList items={source.topics} />
                  </div>

                  <a
                    href={`/sources/${encodeURIComponent(source.id)}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Open
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
