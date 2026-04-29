"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

type QuickAnalyzeBoxProps = {
  onCardCreated?: (card: any) => void;
};

export function QuickAnalyzeBox({ onCardCreated }: QuickAnalyzeBoxProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/analyze", {
        url: url.trim(),
      });

      if (result?.card && onCardCreated) {
        onCardCreated(result.card);
      }

      setUrl("");
    } catch (err) {
      setError("Analyze failed. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <label className="mb-2 block text-sm font-medium text-neutral-700">
        Analyze an article
      </label>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste article URL..."
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}