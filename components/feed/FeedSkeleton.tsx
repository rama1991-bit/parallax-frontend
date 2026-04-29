export function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[2rem] border border-slate-200 bg-white p-5">
          <div className="h-5 w-24 rounded-full bg-slate-100" />
          <div className="mt-4 h-6 w-3/4 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-full rounded bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
