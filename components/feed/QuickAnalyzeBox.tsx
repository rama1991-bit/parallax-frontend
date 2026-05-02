"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type AnalyzeUsage = {
  quota_enabled?: boolean;
  daily_limit?: number;
  used?: number;
  remaining?: number;
  cooldown_remaining_seconds?: number;
  reset_at?: string | null;
};

type QuickAnalyzeBoxProps = {
  onCardCreated?: (card: any) => void;
};

function usageText(usage: AnalyzeUsage | null) {
  if (!usage?.quota_enabled) return "";

  const remaining = usage.remaining ?? 0;
  const limit = usage.daily_limit ?? 0;
  const cooldown = usage.cooldown_remaining_seconds ?? 0;

  if (cooldown > 0) return `Wait ${cooldown}s before the next analysis.`;
  return `${remaining} of ${limit} analyses left today.`;
}

export function QuickAnalyzeBox({ onCardCreated }: QuickAnalyzeBoxProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<AnalyzeUsage | null>(null);

  async function loadUsage() {
    try {
      const data = await apiGet("/api/v1/auth/me");
      setUsage(data?.usage?.analyze || null);
    } catch {
      setUsage(null);
    }
  }

  useEffect(() => {
    loadUsage();
  }, []);

  useEffect(() => {
    const cooldown = usage?.cooldown_remaining_seconds || 0;
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setUsage((current) =>
        current
          ? {
              ...current,
              cooldown_remaining_seconds: Math.max(
                0,
                (current.cooldown_remaining_seconds || 0) - 1
              ),
            }
          : current
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [usage?.cooldown_remaining_seconds]);

  const quotaMessage = useMemo(() => usageText(usage), [usage]);
  const quotaBlocked =
    !!usage?.quota_enabled &&
    ((usage.remaining ?? 1) <= 0 || (usage.cooldown_remaining_seconds ?? 0) > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!url.trim() || quotaBlocked) return;

    setLoading(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/analyze", {
        url: url.trim(),
      });

      if (result?.usage) {
        setUsage(result.usage);
      } else {
        loadUsage();
      }

      if (result?.card && onCardCreated) {
        onCardCreated(result.card);
      }

      setUrl("");
    } catch (err: any) {
      setError(err?.message || "Analyze failed. Please try again.");
      loadUsage();
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-sm font-medium text-neutral-700">
          Analyze an article
        </label>
        {quotaMessage && (
          <span className="text-xs text-neutral-500">{quotaMessage}</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste article URL..."
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          disabled={loading || quotaBlocked}
        />

        <button
          type="submit"
          disabled={loading || !url.trim() || quotaBlocked}
          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
