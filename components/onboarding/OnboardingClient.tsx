"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

const SUGGESTED_TOPICS = [
  {
    name: "Election integrity",
    keywords: ["ballot access", "court filing", "campaign finance"],
  },
  {
    name: "AI regulation",
    keywords: ["model safety", "copyright", "regulator"],
  },
  {
    name: "Energy transition",
    keywords: ["grid", "prices", "renewables"],
  },
  {
    name: "Public health",
    keywords: ["policy", "hospitals", "patients"],
  },
];

export function OnboardingClient() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    SUGGESTED_TOPICS[0].name,
    SUGGESTED_TOPICS[1].name,
  ]);
  const [customTopic, setCustomTopic] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedTitle, setFeedTitle] = useState("");
  const [existingState, setExistingState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/api/v1/onboarding/state")
      .then((data) => setExistingState(data))
      .catch(() => setExistingState(null));
  }, []);

  const configuredLabel = useMemo(() => {
    if (!existingState?.is_configured) return "New session";
    return `${existingState.topic_count} topics, ${existingState.feed_count} feeds`;
  }, [existingState]);

  function toggleTopic(name: string) {
    setSelectedTopics((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  }

  function addCustomTopic() {
    const name = customTopic.trim();
    if (!name) return;

    setSelectedTopics((current) =>
      current.some((item) => item.toLowerCase() === name.toLowerCase())
        ? current
        : [...current, name]
    );
    setCustomTopic("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const topics = selectedTopics.map((name) => {
      const suggested = SUGGESTED_TOPICS.find((item) => item.name === name);
      return {
        name,
        keywords: suggested?.keywords || name.split(/\s+/).filter(Boolean),
      };
    });

    const feeds = feedUrl.trim()
      ? [
          {
            url: feedUrl.trim(),
            title: feedTitle.trim() || null,
          },
        ]
      : [];

    try {
      await apiPost("/api/v1/onboarding", { topics, feeds });
      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || "Could not complete onboarding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Setup
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Onboarding
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {configuredLabel}
          </span>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-950">Topics</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SUGGESTED_TOPICS.map((topic) => {
              const selected = selectedTopics.includes(topic.name);

              return (
                <button
                  key={topic.name}
                  type="button"
                  onClick={() => toggleTopic(topic.name)}
                  className={`rounded-lg border p-4 text-left ${
                    selected
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-950">
                      {topic.name}
                    </span>
                    {selected && <Check aria-hidden="true" className="h-4 w-4" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topic.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-white px-2 py-1 text-xs text-slate-600"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={customTopic}
              onChange={(event) => setCustomTopic(event.target.value)}
              placeholder="Custom topic"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
            />
            <button
              type="button"
              onClick={addCustomTopic}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Add topic"
              title="Add topic"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          {selectedTopics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                  {topic}
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-950">Source Feed</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">RSS URL</span>
              <input
                value={feedUrl}
                onChange={(event) => setFeedUrl(event.target.value)}
                placeholder="https://example.com/rss.xml"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={feedTitle}
                onChange={(event) => setFeedTitle(event.target.value)}
                placeholder="Optional"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              />
            </label>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || (!selectedTopics.length && !feedUrl.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
          >
            Feed
          </a>
        </div>
      </form>
    </main>
  );
}
