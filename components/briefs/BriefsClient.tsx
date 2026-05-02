"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, RefreshCcw, Share2 } from "lucide-react";
import { apiGet } from "@/lib/api";

type BriefSummary = {
  id: string;
  token: string;
  scope: string;
  label: string;
  title: string;
  description: string;
  summary: string;
  generated_at?: string;
  signal_count: number;
  source_count: number;
  claim_count: number;
  share_url: string;
};

function formatDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BriefsClient() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState("");

  async function loadBriefs() {
    setError("");

    try {
      const data = await apiGet("/api/v1/public/briefs");
      setBriefs(data?.briefs || []);
    } catch (err: any) {
      setError(err?.message || "Could not load briefs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBriefs();
  }, []);

  async function copyShareLink(brief: BriefSummary) {
    if (typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(brief.share_url);
      setCopiedToken(brief.token);
      window.setTimeout(() => setCopiedToken(""), 1600);
    } catch {
      setCopiedToken("");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Public
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Briefs
            </h1>
          </div>

          <button
            onClick={loadBriefs}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
            aria-label="Refresh briefs"
            title="Refresh briefs"
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
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : (
        <section className="space-y-3">
          {briefs.map((brief) => {
            const generatedAt = formatDate(brief.generated_at);

            return (
              <article
                key={brief.token}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <FileText aria-hidden="true" className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {brief.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {brief.signal_count} signals
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {brief.source_count} sources
                      </span>
                      {generatedAt && (
                        <span className="text-xs text-slate-400">
                          {generatedAt}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                      {brief.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {brief.summary}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={`/briefs/${brief.token}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Open
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyShareLink(brief)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                      >
                        {copiedToken === brief.token ? "Copied" : "Copy link"}
                        <Share2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
