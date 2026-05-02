"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { FeedCard } from "./FeedCard";
import { QuickAnalyzeBox } from "./QuickAnalyzeBox";
import { FeedSkeleton } from "./FeedSkeleton";
import { FeedEmptyState } from "./FeedEmptyState";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "high", label: "High priority" },
  { key: "unread", label: "Unread" },
  { key: "narrative", label: "Narrative" },
  { key: "articles", label: "Articles" },
  { key: "saved", label: "Saved" },
];

function notifyAlertsUpdated() {
  window.dispatchEvent(new Event("parallax:alerts-updated"));
}

export function SmartFeedClient() {
  const [cards, setCards] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [analyzingItemId, setAnalyzingItemId] = useState("");
  const [itemAnalyzeErrors, setItemAnalyzeErrors] = useState<Record<string, string>>({});

  async function load(nextFilter = filter) {
    setError("");

    try {
      const data = await apiGet(
        `/api/v1/feed?filter_type=${nextFilter}&limit=20`
      );

      setCards(data.cards || data.items || []);
    } catch (err: any) {
      setError(err.message || "Could not load feed.");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    setInitialLoading(true);
    load(filter);
  }, [filter]);

  async function markRead(cardId: string) {
    const previous = cards;

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, is_read: true } : card
      )
    );

    try {
      await apiPost(`/api/v1/feed/${cardId}/read`, {});
      notifyAlertsUpdated();
    } catch {
      setCards(previous);
    }
  }

  async function saveCard(cardId: string) {
    const previous = cards;

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, is_saved: true } : card
      )
    );

    try {
      await apiPost(`/api/v1/feed/${cardId}/save`, {});
    } catch {
      setCards(previous);
    }
  }

  async function unsaveCard(cardId: string) {
    const previous = cards;

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, is_saved: false } : card
      )
    );

    try {
      await apiPost(`/api/v1/feed/${cardId}/unsave`, {});
    } catch {
      setCards(previous);
    }
  }

  async function dismiss(cardId: string) {
    const previous = cards;

    setCards((prev) => prev.filter((card) => card.id !== cardId));

    try {
      await apiPost(`/api/v1/feed/${cardId}/dismiss`, {});
      notifyAlertsUpdated();
    } catch {
      setCards(previous);
    }
  }

  async function track(cardId: string, interactionType: string) {
    try {
      await apiPost(`/api/v1/feed/${cardId}/track`, {
        interaction_type: interactionType,
      });
    } catch {
      // Tracking failure should not break the feed UX.
    }
  }

  async function analyzeItem(card: any) {
    const url = card?.payload?.url || card?.url;
    if (!url) return;

    setAnalyzingItemId(card.id);
    setItemAnalyzeErrors((current) => ({ ...current, [card.id]: "" }));

    try {
      const result = await apiPost("/api/v1/analyze", { url });
      if (result?.card) {
        setCards((prev) => [result.card, ...prev]);
        notifyAlertsUpdated();
      }
      await track(card.id, "analyze_feed_item");
    } catch (err: any) {
      setItemAnalyzeErrors((current) => ({
        ...current,
        [card.id]: err?.message || "Could not analyze this item.",
      }));
    } finally {
      setAnalyzingItemId("");
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-3 p-3 pb-24 md:space-y-4 md:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Parallax
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Narrative feed
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Important shifts, coverage spikes, source divergence, and article
          insights—shown as simple cards.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => load(filter)}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
          >
            Refresh
          </button>
          <a
            href="/briefs"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
          >
            Briefs
          </a>
        </div>
      </header>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:px-0">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
              filter === item.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="sticky top-2 z-20">
        <QuickAnalyzeBox
          onCardCreated={(newCard: any) => {
            setCards((prev) => [newCard, ...prev]);
            notifyAlertsUpdated();
          }}
        />
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {initialLoading ? (
        <FeedSkeleton />
      ) : cards.length === 0 ? (
        <FeedEmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <FeedCard
              key={card.id}
              card={card}
              onRead={() => markRead(card.id)}
              onDismiss={() => dismiss(card.id)}
              onSave={() => saveCard(card.id)}
              onUnsave={() => unsaveCard(card.id)}
              onTrack={(type) => track(card.id, type)}
              onAnalyzeItem={() => analyzeItem(card)}
              isAnalyzingItem={analyzingItemId === card.id}
              analyzeError={itemAnalyzeErrors[card.id]}
            />
          ))}
        </div>
      )}
    </main>
  );
}
