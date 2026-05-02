"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Globe2, RefreshCcw } from "lucide-react";
import { apiGet } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSources() {
    setError("");

    try {
      const data = await apiGet("/api/v1/authors");
      setSources(data?.sources || []);
    } catch (err: any) {
      setError(err?.message || "Could not load sources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSources();
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
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

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
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
