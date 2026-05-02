"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

export function SavedReportsClient() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSavedReports() {
    setError("");

    try {
      const data = await apiGet("/api/v1/saved-reports");
      setReports(data?.reports || []);
    } catch (err: any) {
      setError(err?.message || "Could not load saved reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavedReports();
  }, []);

  async function unsave(reportId: string) {
    const previous = reports;
    setReports((current) => current.filter((report) => report.id !== reportId));

    try {
      await apiPost(`/api/v1/reports/${reportId}/unsave`, {});
    } catch (err: any) {
      setReports(previous);
      setError(err?.message || "Could not unsave report.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Parallax
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Saved reports
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Reports saved from this browser session.
        </p>
      </header>

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading saved reports...
        </p>
      ) : reports.length === 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-950">
            No saved reports yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save a report after analyzing an article to keep it here.
          </p>
          <a
            href="/"
            className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Back to feed
          </a>
        </section>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap gap-2">
                {report.domain && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {report.domain}
                  </span>
                )}
                {report.dominant_frame && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {report.dominant_frame}
                  </span>
                )}
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-7 text-slate-950">
                {report.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {report.summary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/reports/${report.id}`}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                >
                  Open report
                </a>
                <button
                  type="button"
                  onClick={() => unsave(report.id)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  Unsave
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
