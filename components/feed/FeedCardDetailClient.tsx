"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export function FeedCardDetailClient({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<any>(null);
  const [articleDetail, setArticleDetail] = useState<any>(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const loadedCard = await apiGet(`/api/v1/feed/${cardId}`);
      if (!mounted) return;
      setCard(loadedCard);

      const ingestedArticleId =
        loadedCard?.ingested_article_id || loadedCard?.payload?.ingested_article_id;
      if (!ingestedArticleId) return;

      try {
        const detail = await apiGet(`/api/v1/sources/articles/${ingestedArticleId}`);
        if (mounted) setArticleDetail(detail);
      } catch (err: any) {
        if (mounted) setDetailError(err?.message || "Could not load article detail.");
      }
    }

    load().catch((err: any) => {
      if (mounted) setDetailError(err?.message || "Could not load card.");
    });

    return () => {
      mounted = false;
    };
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
  const intelligence = articleDetail?.intelligence || card?.analysis?.intelligence || card?.payload?.intelligence;
  const detailArticle = articleDetail?.article;
  const source = articleDetail?.source;
  const comparisonHooks = articleDetail?.comparison_hooks || intelligence?.comparison_hooks;
  const claims = intelligence?.key_claims || card?.analysis?.key_claims || [];
  const narrative = intelligence?.narrative;

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

      {detailError && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {detailError}
        </section>
      )}

      {articleDetail?.tabs?.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Article tabs</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {articleDetail.tabs.map((tab: string) => (
              <span key={tab} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {tab}
              </span>
            ))}
          </div>
        </section>
      )}

      {detailArticle && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Article</h2>
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-1">{detailArticle.analysis_status || "pending"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Published</dt>
              <dd className="mt-1">{detailArticle.published_at || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Language</dt>
              <dd className="mt-1">{detailArticle.language || "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Country</dt>
              <dd className="mt-1">{detailArticle.country || "Unknown"}</dd>
            </div>
          </dl>
        </section>
      )}

      {claims.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Claims</h2>
          <ol className="mt-3 space-y-2">
            {claims.slice(0, 6).map((claim: string, index: number) => (
              <li key={`${claim}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {claim}
              </li>
            ))}
          </ol>
        </section>
      )}

      {narrative && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Narrative</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <p>Main frame: {narrative.main_frame || "Unknown"}</p>
            <p>Tone: {narrative.tone || "Unknown"}</p>
            {narrative.missing_context?.length > 0 && (
              <ul className="space-y-2">
                {narrative.missing_context.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {source && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Source</h2>
          <div className="mt-3 text-sm leading-6 text-slate-700">
            <p>{source.name}</p>
            <p>{[source.country, source.language, source.source_type, source.source_size].filter(Boolean).join(" / ")}</p>
            {source.credibility_notes && <p className="mt-2">{source.credibility_notes}</p>}
          </div>
        </section>
      )}

      {comparisonHooks && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Comparison hooks</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(comparisonHooks, null, 2)}</pre>
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
