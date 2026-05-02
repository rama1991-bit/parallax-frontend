"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, Globe2, Share2 } from "lucide-react";
import { apiGet, apiPost, apiText } from "@/lib/api";

function ScoreBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">No signals extracted.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ReportDetailClient({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiGet(`/api/v1/reports/${reportId}`)
      .then((data) => {
        if (mounted) setReport(data);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Could not load report.");
      });

    return () => {
      mounted = false;
    };
  }, [reportId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <a href="/" className="text-sm text-slate-600 underline">
          Back to feed
        </a>
        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <p className="text-sm text-slate-500">Loading report...</p>
      </main>
    );
  }

  const confidence =
    report.confidence === null || report.confidence === undefined
      ? "Unknown"
      : `${Math.round(Number(report.confidence) * 100)}%`;
  const priorityScore =
    report.priority_score === null || report.priority_score === undefined
      ? "Unknown"
      : `${Math.round(Number(report.priority_score) * 100)}%`;

  async function toggleSaved() {
    setSaving(true);
    setError("");

    try {
      const updated = await apiPost(
        `/api/v1/reports/${reportId}/${report.is_saved ? "unsave" : "save"}`,
        {}
      );
      setReport(updated);
    } catch (err: any) {
      setError(err?.message || "Could not update saved state.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadReport(format: "json" | "markdown") {
    setExporting(format);
    setError("");

    try {
      const text = await apiText(
        `/api/v1/reports/${reportId}/export?format=${format}`
      );
      const blob = new Blob([text], {
        type: format === "markdown" ? "text/markdown" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `parallax-report-${reportId}.${format === "markdown" ? "md" : "json"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Could not export report.");
    } finally {
      setExporting("");
    }
  }

  async function copyReportLink() {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const sourceKey = report.domain || report.source;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <a href="/" className="text-sm text-slate-600 underline">
        Back to feed
      </a>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
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

        <h1 className="mt-4 text-2xl font-semibold leading-8 text-slate-950">
          {report.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {report.summary}
        </p>

        {report.url && (
          <a
            href={report.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block break-all text-sm text-slate-600 underline"
          >
            {report.url}
          </a>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleSaved}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : report.is_saved ? "Saved" : "Save report"}
          </button>
          <a
            href="/saved"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
          >
            Saved reports
          </a>
          {sourceKey && (
            <a
              href={`/sources/${encodeURIComponent(sourceKey)}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              Source
              <Globe2 aria-hidden="true" className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={copyReportLink}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
          >
            {copied ? "Copied" : "Copy link"}
            <Share2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => downloadReport("markdown")}
            disabled={exporting === "markdown"}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Markdown
            <Download aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => downloadReport("json")}
            disabled={exporting === "json"}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            JSON
            <FileJson aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <ScoreBadge label="Confidence" value={confidence} />
        <ScoreBadge label="Priority" value={report.priority || "Unknown"} />
        <ScoreBadge label="Feed score" value={priorityScore} />
      </div>

      <Section title="Key Claims">
        {report.key_claims?.length ? (
          <ol className="space-y-3">
            {report.key_claims.map((claim: string, index: number) => (
              <li
                key={`${claim}-${index}`}
                className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"
              >
                {claim}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">No claims extracted.</p>
        )}
      </Section>

      <Section title="Narrative Framing">
        <TagList items={report.narrative_framing || []} />
      </Section>

      <Section title="Entities">
        <TagList items={report.entities || []} />
      </Section>

      <Section title="Topics">
        <TagList items={report.topics || []} />
      </Section>

      {report.article_excerpt && (
        <Section title="Article Excerpt">
          <p className="text-sm leading-6 text-slate-700">
            {report.article_excerpt}
          </p>
        </Section>
      )}

      <Section title="Methodology">
        <p className="text-sm leading-6 text-slate-700">
          {report.methodology_note}
        </p>
      </Section>

      <Section title="Limitations">
        <ul className="space-y-2">
          {(report.limitations || []).map((item: string) => (
            <li key={item} className="text-sm leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
