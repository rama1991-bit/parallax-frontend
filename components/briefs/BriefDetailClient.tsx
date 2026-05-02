"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileJson,
  Link as LinkIcon,
  Share2,
} from "lucide-react";
import { API_URL, apiGet } from "@/lib/api";

type BriefItem = {
  id: string;
  card_id: string;
  report_id?: string;
  source_id?: string;
  card_type: string;
  title: string;
  summary: string;
  source?: string;
  domain?: string;
  url?: string;
  href: string;
  priority_score: number;
  confidence?: number;
  dominant_frame?: string;
  key_claims: string[];
  narrative_framing: string[];
  entities: string[];
  topics: string[];
  narrative_signal?: string;
};

type PublicBrief = {
  token: string;
  title: string;
  summary: string;
  generated_at?: string;
  signal_count: number;
  source_count: number;
  claim_count: number;
  share_url: string;
  export_urls: {
    json: string;
    markdown: string;
  };
  key_claims: string[];
  narrative_frames: string[];
  entities: string[];
  topics: string[];
  sources: Array<{ id: string; name: string; domain?: string; url?: string }>;
  items: BriefItem[];
  methodology_note: string;
  limitations: string[];
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">None available.</p>;
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

function formatDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function apiExportUrl(path?: string) {
  if (!path) return "#";
  return `${API_URL}${path}`;
}

export function BriefDetailClient({ token }: { token: string }) {
  const [brief, setBrief] = useState<PublicBrief | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiGet(`/api/v1/public/briefs/${token}`)
      .then((data) => {
        if (mounted) setBrief(data);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Could not load brief.");
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const generatedAt = useMemo(
    () => formatDate(brief?.generated_at),
    [brief?.generated_at]
  );

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <a
          href="/briefs"
          className="inline-flex items-center gap-2 text-sm text-slate-600 underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Briefs
        </a>
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!brief) {
    return (
      <main className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
        <p className="text-sm text-slate-500">Loading brief...</p>
      </main>
    );
  }

  async function copyShareLink() {
    if (!brief?.share_url || typeof navigator === "undefined") return;

    try {
      await navigator.clipboard.writeText(brief.share_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <a
        href="/briefs"
        className="inline-flex items-center gap-2 text-sm text-slate-600 underline"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Briefs
      </a>

      <article className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {brief.signal_count} signals
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {brief.source_count} sources
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {brief.claim_count} claims
          </span>
          {generatedAt && (
            <span className="text-xs text-slate-400">{generatedAt}</span>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-semibold leading-8 text-slate-950">
          {brief.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          {brief.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyShareLink}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            {copied ? "Copied" : "Copy link"}
            <Share2 aria-hidden="true" className="h-4 w-4" />
          </button>
          <a
            href={apiExportUrl(brief.export_urls.markdown)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            Markdown
            <Download aria-hidden="true" className="h-4 w-4" />
          </a>
          <a
            href={apiExportUrl(brief.export_urls.json)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            JSON
            <FileJson aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Key Claims">
          {brief.key_claims.length ? (
            <ol className="space-y-3">
              {brief.key_claims.map((claim, index) => (
                <li
                  key={`${claim}-${index}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700"
                >
                  {claim}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">No claims available.</p>
          )}
        </Section>

        <Section title="Narrative Frames">
          <TagList items={brief.narrative_frames} />
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Topics">
          <TagList items={brief.topics} />
        </Section>

        <Section title="Entities">
          <TagList items={brief.entities} />
        </Section>
      </div>

      <Section title="Signals">
        {brief.items.length ? (
          <div className="space-y-3">
            {brief.items.map((item) => (
              <article key={item.id} className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {item.card_type}
                  </span>
                  {item.dominant_frame && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                      {item.dominant_frame}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.summary}
                </p>

                {item.narrative_signal && (
                  <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-slate-600">
                    {item.narrative_signal}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={item.href}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Open
                  </a>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Source
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    </a>
                  )}
                  {item.source_id && (
                    <a
                      href={`/sources/${encodeURIComponent(item.source_id)}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Source profile
                      <LinkIcon aria-hidden="true" className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No brief-ready signals available.
          </p>
        )}
      </Section>

      <Section title="Sources">
        {brief.sources.length ? (
          <div className="space-y-2">
            {brief.sources.map((source) => (
              <div
                key={`${source.name}-${source.url || ""}`}
                className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
              >
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                ) : (
                  source.name
                )}
                <a
                  href={`/sources/${encodeURIComponent(source.id)}`}
                  className="ml-3 text-slate-500 underline"
                >
                  Profile
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No sources available.</p>
        )}
      </Section>

      <Section title="Methodology">
        <p className="text-sm leading-6 text-slate-700">
          {brief.methodology_note}
        </p>
      </Section>

      <Section title="Limitations">
        <ul className="space-y-2">
          {brief.limitations.map((item) => (
            <li key={item} className="text-sm leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
