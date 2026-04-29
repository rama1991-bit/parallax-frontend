export function FeedEmptyState({ filter }: { filter: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
      <h2 className="text-lg font-semibold text-slate-950">
        {filter === "all" ? "Your feed is empty" : "No cards here yet"}
      </h2>
      <p className="mt-2 leading-6">
        Start with a few topics or paste an article URL. Parallax will turn narrative signals into readable cards.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href="/onboarding" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">Set up topics</a>
        <a href="/topics" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">Manage topics</a>
      </div>
    </div>
  );
}
