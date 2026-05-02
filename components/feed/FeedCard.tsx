export function FeedCard({
  card,
  onRead,
  onDismiss,
  onSave,
  onUnsave,
  onTrack,
  onAnalyzeItem,
  isAnalyzingItem,
  analyzeError,
}: {
  card: any;
  onRead: () => void;
  onDismiss: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onTrack?: (type: string) => void;
  onAnalyzeItem?: () => void;
  isAnalyzingItem?: boolean;
  analyzeError?: string;
}) {
  const itemUrl = card?.payload?.url || card?.url;
  const ingestedArticleId = card?.ingested_article_id || card?.payload?.ingested_article_id;
  const analysisStatus = card?.payload?.analysis_status;
  const sourceKey =
    card?.source_id ||
    card?.payload?.source_id ||
    card?.payload?.domain ||
    card?.source ||
    card?.payload?.feed_title;
  const canAnalyzeItem =
    (card.card_type === "feed_item" && itemUrl) ||
    (ingestedArticleId && analysisStatus !== "analyzed" && !card.report_id);

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{card.card_type}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {card.priority_score >= 0.85 ? "High" : card.priority_score >= 0.6 ? "Medium" : "Low"}
        </span>
        {!card.is_read && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">New</span>}
      </div>

      <a href={`/feed/${card.id}`}>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-slate-950">{card.title}</h2>
      </a>

      <p className="mt-2 text-[15px] leading-7 text-slate-700">{card.summary}</p>

      {card.payload && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          {card.payload.source_name && <span>{card.payload.source_name}</span>}
          {!card.payload.source_name && card.payload.domain && <span>{card.payload.domain}</span>}
          {card.payload.claim_count !== undefined && <span> · {card.payload.claim_count} claims</span>}
          {card.payload.dominant_frame && <span> · frame: {card.payload.dominant_frame}</span>}
        </div>
      )}

      {card.recommendations?.length > 0 && (
        <div className="mt-4 space-y-2">
          {card.recommendations.map((rec: any) => (
            <a key={rec.type} href={rec.href} onClick={() => onTrack?.(rec.type === "open_report" ? "open_report" : "open_topic")} className="block rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100">
              <div className="text-sm font-medium text-slate-900">{rec.label}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{rec.reason}</p>
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canAnalyzeItem && (
          <button
            onClick={onAnalyzeItem}
            disabled={isAnalyzingItem}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzingItem ? "Analyzing..." : ingestedArticleId ? "Analyze article" : "Analyze item"}
          </button>
        )}
        {card.report_id && <a href={`/reports/${card.report_id}`} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">Open report</a>}
        {card.topic_id && <a href={`/topics/${card.topic_id}`} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">Open topic</a>}
        {ingestedArticleId && <a href={`/articles/${encodeURIComponent(ingestedArticleId)}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Article detail</a>}
        {ingestedArticleId && <a href={`/compare?articleId=${encodeURIComponent(ingestedArticleId)}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Compare</a>}
        {sourceKey && <a href={`/sources/${encodeURIComponent(sourceKey)}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Source</a>}
        <a href={`/feed/${card.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Explain</a>
        <button onClick={onRead} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Read</button>
        {card.is_saved ? (
          <button onClick={onUnsave} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Saved</button>
        ) : (
          <button onClick={onSave} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Save</button>
        )}
        <button onClick={onDismiss} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Dismiss</button>
      </div>

      {analyzeError && (
        <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
          {analyzeError}
        </p>
      )}

      <p className="mt-4 text-xs text-slate-400">This card summarizes narrative signals, not truth certainty.</p>
    </article>
  );
}
