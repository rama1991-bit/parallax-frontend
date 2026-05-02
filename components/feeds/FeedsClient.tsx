"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type SyncResult = {
  item_count: number;
  card_count: number;
};

export function FeedsClient() {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncingId, setSyncingId] = useState("");
  const [lastSync, setLastSync] = useState<Record<string, SyncResult>>({});
  const [error, setError] = useState("");

  async function loadFeeds() {
    setError("");

    try {
      const data = await apiGet("/api/v1/feeds");
      setFeeds(data?.feeds || []);
    } catch (err: any) {
      setError(err?.message || "Could not load feeds.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFeeds();
  }, []);

  async function createFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setCreating(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/feeds", {
        url: url.trim(),
        title: title.trim() || null,
      });

      if (result?.feed) {
        setFeeds((current) => [result.feed, ...current]);
      } else {
        loadFeeds();
      }

      setUrl("");
      setTitle("");
    } catch (err: any) {
      setError(err?.message || "Could not add feed.");
    } finally {
      setCreating(false);
    }
  }

  async function syncFeed(feedId: string) {
    setSyncingId(feedId);
    setError("");

    try {
      const result = await apiPost(`/api/v1/feeds/${feedId}/sync?limit=10`, {});
      setLastSync((current) => ({
        ...current,
        [feedId]: {
          item_count: result.item_count || 0,
          card_count: result.card_count || 0,
        },
      }));
      loadFeeds();
    } catch (err: any) {
      setError(err?.message || "Could not sync feed.");
    } finally {
      setSyncingId("");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Parallax
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          RSS feeds
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Subscribe to source feeds and sync new items into the narrative feed.
        </p>
      </header>

      <form
        onSubmit={createFeed}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">RSS URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/rss.xml"
              disabled={creating}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Display name
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional source name"
              disabled={creating}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={creating || !url.trim()}
          className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Adding..." : "Add feed"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </form>

      {loading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading feeds...
        </p>
      ) : feeds.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No RSS feeds yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add a source feed, then sync it to create feed cards.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => {
            const sync = lastSync[feed.id];

            return (
              <article
                key={feed.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                    {feed.status || "active"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {feed.item_count || 0} items
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold leading-7 text-slate-950">
                  {feed.title}
                </h2>
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-sm text-slate-600 underline"
                >
                  {feed.url}
                </a>

                {feed.description && (
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {feed.description}
                  </p>
                )}

                {sync && (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    Synced {sync.item_count} new items and created {sync.card_count} feed cards.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => syncFeed(feed.id)}
                    disabled={syncingId === feed.id}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {syncingId === feed.id ? "Syncing..." : "Sync"}
                  </button>
                  <a
                    href="/"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  >
                    Open feed
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
