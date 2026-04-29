"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export function FeedCardDetailClient({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<any>(null);

  useEffect(() => {
    apiGet(`/api/v1/feed/${cardId}`).then(setCard);
  }, [cardId]);

  async function markRead() {
    const updated = await apiPost(`/api/v1/feed/${cardId}/read`, {});
    setCard(updated);
  }

  async function dismiss() {
    await apiPost(`/api/v1/feed/${cardId}/dismiss`, {});
    window.location.href = "/";
  }

  if (!card) {
    return <main className="mx-auto max-w-2xl p-6"><p className="text-sm text-slate-500">Loading card...</p></main>;
  }

  const explanation = card.explanation || {};

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 pb-24 md:p-6">
      <a href="/" className="text-sm text-slate-600 underline">Back to feed</a>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{card.card_type}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">priority {Math.round((card.priority_score || 0) * 100)}%</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold leading-8 text-slate-950">{card.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">{card.summary}</p>
      </article>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Why this matters</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{explanation.why_this_matters || "No explanation available."}</p>
      </section>

      {explanation.what_changed && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">What changed</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(explanation.what_changed, null, 2)}</pre>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Recommended action</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{explanation.recommended_action}</p>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          {card.report_id && <a href={`/reports/${card.report_id}`} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">Open report</a>}
          {card.topic_id && <a href={`/topics/${card.topic_id}`} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">Open topic</a>}
          <button onClick={markRead} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">Mark read</button>
          <button onClick={dismiss} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">Dismiss</button>
        </div>
      </section>

      <p className="px-2 text-xs text-slate-500">This card explains narrative signals, not truth certainty.</p>
    </main>
  );
}
