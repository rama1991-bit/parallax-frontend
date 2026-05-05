"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.claim || item?.label || item?.name || item?.text || "";
    })
    .filter(Boolean);
}

function providerLabel(metadata: any) {
  if (!metadata) return "heuristic";
  return [metadata.provider || "heuristic", metadata.status || "unknown"].filter(Boolean).join(" / ");
}

export function TopicsClient() {
  const [topics, setTopics] = useState<any[]>([]);
  const [topicIntelligence, setTopicIntelligence] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadTopics() {
    setError("");

    try {
      const [data, intelligenceData] = await Promise.all([
        apiGet("/api/v1/topics"),
        apiGet("/api/v1/topics/intelligence?limit=25").catch(() => ({ items: [] })),
      ]);
      setTopics(data?.topics || []);
      setTopicIntelligence(intelligenceData?.items || []);
    } catch (err: any) {
      setError(err?.message || "Could not load topics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTopics();
  }, []);

  const intelligenceByTopic = useMemo(() => {
    return Object.fromEntries(
      topicIntelligence
        .filter((item) => item?.topic?.id)
        .map((item) => [item.topic.id, item])
    );
  }, [topicIntelligence]);

  async function createMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/topics/monitor", {
        name: name.trim(),
        description: description.trim() || null,
        keywords: parseKeywords(keywords),
      });

      if (result?.topic) {
        setTopics((current) => [result.topic, ...current]);
      } else {
        loadTopics();
      }

      setName("");
      setDescription("");
      setKeywords("");
    } catch (err: any) {
      setError(err?.message || "Could not create topic monitor.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Parallax
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Topic monitors
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Subscribe to topics and keywords so coverage changes can become feed signals.
        </p>
      </header>

      <form
        onSubmit={createMonitor}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Topic name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Climate policy, AI regulation, regional elections..."
              disabled={creating}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional scope note for this monitor."
              disabled={creating}
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Keywords</span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="comma, separated, keywords"
              disabled={creating}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500 disabled:opacity-60"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create monitor"}
        </button>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </form>

      {topicIntelligence.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">
              Topic intelligence
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {topicIntelligence.length} snapshots
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {topicIntelligence.slice(0, 4).map((item) => (
              <article key={item.topic?.id || item.summary} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                    {item.sample?.article_count || 0} articles
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                    {item.sample?.source_count || 0} sources
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                    {providerLabel(item.provider_metadata)}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">
                  {item.topic?.name || "Topic"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.summary || "No topic intelligence summary yet."}
                </p>
                {asList(item.framing_pattern?.dominant_frames).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {asList(item.framing_pattern?.dominant_frames).slice(0, 4).map((frame) => (
                      <span key={frame} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                        {frame}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading topic monitors...
        </p>
      ) : topics.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No topic monitors yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a topic monitor to start turning keyword subscriptions into feed signals.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => {
            const intelligence = intelligenceByTopic[topic.id];
            return (
              <article
                key={topic.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  {topic.monitor?.status || "active"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {topic.article_count || 0} articles
                </span>
                {intelligence && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {intelligence.sample?.source_count || 0} sources
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-7 text-slate-950">
                {topic.name}
              </h2>
              {topic.description && (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {topic.description}
                </p>
              )}

              {intelligence?.summary && (
                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {intelligence.summary}
                </p>
              )}

              {topic.keywords?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {topic.keywords.map((keyword: string) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
              <a
                href={`/topics/${encodeURIComponent(topic.id)}`}
                className="mt-4 inline-flex rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Open
              </a>
            </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
