"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

export function QuickAnalyzeBox({ onQueued }: { onQueued?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [queued, setQueued] = useState<any>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setQueued(null);

    try {
      const result = await apiPost("/api/v1/analyze", { url: url.trim() });
      setQueued(result);
      setUrl("");
      onQueued?.();
      setTimeout(() => onQueued?.(), 1500);
    } catch (err: any) {
      setError(err.message || "Could not queue analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={submit}>
        <label className="text-sm font-semibold text-slate-900">Analyze an article</label>
        <p className="mt-1 text-xs text-slate-500">Paste a URL. Parallax will turn it into an insight card.</p>
        <div className="mt-3 flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
          <button disabled={loading} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {loading ? "Adding..." : "Analyze"}
          </button>
        </div>
        {queued && <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-700">Analysis queued. The insight card will appear here.</div>}
        {error && <div className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      </form>
    </section>
  );
}
