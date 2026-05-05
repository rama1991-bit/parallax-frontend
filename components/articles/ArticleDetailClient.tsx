"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Columns3, ExternalLink, GitBranch, RefreshCw, Search } from "lucide-react";
import { apiGet } from "@/lib/api";

const TABS = ["Summary", "Claims", "Compare", "Source", "Author", "Background", "OSINT"];

function asList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.text || item?.claim || item?.label || item?.name || "";
    })
    .filter(Boolean);
}

function compact(value: any, fallback = "Not available") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function providerLabel(metadata: any) {
  if (!metadata) return "heuristic";
  return [metadata.provider || "heuristic", metadata.status || "unknown"].filter(Boolean).join(" / ");
}

function nodeTab(node: any) {
  return node?.node_metadata?.tab || "Summary";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function JsonBlock({ value }: { value: any }) {
  return (
    <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{children}</p>;
}

function ProviderStrip({ metadata }: { metadata: any }) {
  if (!metadata) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      <span className="rounded-full bg-slate-100 px-3 py-1">{providerLabel(metadata)}</span>
      {metadata.model && <span className="rounded-full bg-slate-100 px-3 py-1">{metadata.model}</span>}
      {metadata.truth_status && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{metadata.truth_status}</span>}
    </div>
  );
}

function FieldGrid({ items }: { items: Array<{ label: string; value: any }> }) {
  return (
    <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words">{compact(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PerspectivePanel({ node }: { node: any }) {
  const perspective = node?.node_metadata?.perspective;
  if (!node || !perspective) return null;

  const actions = Array.isArray(perspective.actions)
    ? perspective.actions.filter((action: any) => action?.href && action?.label)
    : [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Selected node</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">{node.label}</h2>
          <p className="mt-1 text-xs text-slate-500">{node.node_type}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
          {perspective.title || "Node perspective"}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-900">{perspective.question}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{perspective.summary}</p>
      <div className="mt-3">
        <ProviderStrip metadata={perspective.provider_metadata || node?.node_metadata?.provider_metadata} />
      </div>

      {asList(perspective.signals).length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-slate-500">Signals</h3>
          <ul className="mt-2 space-y-2">
            {asList(perspective.signals).map((signal, index) => (
              <li key={`${signal}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                {signal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {asList(perspective.limitations).length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-slate-500">Limits</h3>
          <ul className="mt-2 space-y-2">
            {asList(perspective.limitations).map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action: any) => (
            <a
              key={`${action.type}-${action.href}`}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {action.type === "compare" ? <Columns3 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {action.label}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export function ArticleDetailClient({ articleId }: { articleId: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Summary");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [osintContext, setOsintContext] = useState<any>(null);
  const [osintLoading, setOsintLoading] = useState(false);
  const [osintError, setOsintError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    apiGet(`/api/v1/sources/articles/${encodeURIComponent(articleId)}`)
      .then((data) => {
        if (!mounted) return;
        setDetail(data);
        setOsintContext(data?.osint_context || null);
        const firstNode = data?.node_graph?.nodes?.[0];
        setSelectedNodeId(firstNode?.id || "");
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Could not load article detail.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [articleId]);

  const graph = detail?.node_graph || {};
  const nodes = useMemo(() => graph.nodes || [], [graph.nodes]);
  const edges = graph.edges || [];
  const selectedNode = nodes.find((node: any) => node.id === selectedNodeId) || graph.selected_node || nodes[0];
  const article = detail?.article || {};
  const source = detail?.source || {};
  const intelligence = detail?.intelligence || article?.analysis?.intelligence || {};
  const narrative = intelligence?.narrative || {};
  const sourceAnalysis = intelligence?.source_analysis || {};
  const comparisonHooks = detail?.comparison_hooks || intelligence?.comparison_hooks || {};
  const currentOsintContext = osintContext || detail?.osint_context || {};
  const providerMetadata = intelligence?.provider_metadata || article?.analysis?.provider_metadata;
  const claims = asList(intelligence?.key_claims || article?.analysis?.key_claims || []);
  const entities = intelligence?.entities || {};
  const scores = intelligence?.scores || {};
  const nodesForActiveTab = nodes.filter((node: any) => nodeTab(node) === activeTab);

  function changeTab(tab: string) {
    setActiveTab(tab);
    const firstNode = nodes.find((node: any) => nodeTab(node) === tab);
    if (firstNode) setSelectedNodeId(firstNode.id);
  }

  async function loadOsint(includeExternal = false) {
    setOsintLoading(true);
    setOsintError("");
    try {
      const data = await apiGet(
        `/api/v1/sources/articles/${encodeURIComponent(articleId)}/osint?include_external=${includeExternal ? "true" : "false"}`
      );
      setOsintContext(data);
    } catch (err: any) {
      setOsintError(err?.message || "Could not load OSINT context.");
    } finally {
      setOsintLoading(false);
    }
  }

  function renderSummary() {
    return (
      <div className="space-y-4">
        <Section title="Structured Summary">
          <p className="text-sm leading-7 text-slate-700">
            {intelligence?.summary || article.summary || "No summary has been saved for this article yet."}
          </p>
        </Section>

        <Section title="Narrative">
          <FieldGrid
            items={[
              { label: "Main frame", value: narrative.main_frame },
              { label: "Tone", value: narrative.tone },
              { label: "Implied causality", value: narrative.implied_causality },
              { label: "Confidence", value: scores.confidence_score },
            ]}
          />
          {asList(narrative.secondary_frames).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {asList(narrative.secondary_frames).map((frame) => (
                <span key={frame} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {frame}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>
    );
  }

  function renderClaims() {
    const claimNodes = nodes.filter((node: any) => node.node_type === "claim");
    return (
      <Section title="Claims">
        {claims.length === 0 ? (
          <EmptyState>No extracted claims are available yet. Analyze the article first to populate this tab.</EmptyState>
        ) : (
          <ol className="space-y-2">
            {claims.map((claim, index) => {
              const claimNode = claimNodes.find((node: any) => node.claim_text === claim || node.label === claim);
              return (
                <li key={`${claim}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  <button
                    onClick={() => claimNode && setSelectedNodeId(claimNode.id)}
                    className="text-left font-medium text-slate-950 underline-offset-4 hover:underline"
                  >
                    {claim}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    );
  }

  function renderCompare() {
    return (
      <div className="space-y-4">
        <Section title="Compare Hooks">
          <JsonBlock value={comparisonHooks} />
        </Section>
        <Section title="Cross Source Action">
          <a
            href={`/compare?articleId=${encodeURIComponent(articleId)}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            <Columns3 className="h-4 w-4" />
            Compare this story
          </a>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The compare view retrieves similar ingested articles and separates shared claims, unique claims, framing,
            source, tone, and timeline differences.
          </p>
        </Section>
      </div>
    );
  }

  function renderSource() {
    return (
      <div className="space-y-4">
        <Section title="Source Profile">
          <FieldGrid
            items={[
              { label: "Name", value: source.name },
              { label: "Country", value: source.country || article.country },
              { label: "Language", value: source.language || article.language },
              { label: "Type", value: source.source_type },
              { label: "Size", value: source.source_size },
              { label: "Political context", value: source.political_context },
            ]}
          />
        </Section>
        <Section title="Source Analysis">
          <FieldGrid
            items={[
              { label: "Profile", value: sourceAnalysis.source_profile },
              { label: "Known angle", value: sourceAnalysis.known_angle },
              { label: "Reliability notes", value: sourceAnalysis.reliability_notes || source.credibility_notes },
            ]}
          />
          {asList(sourceAnalysis.limitations).length > 0 && (
            <ul className="mt-4 space-y-2">
              {asList(sourceAnalysis.limitations).map((item) => (
                <li key={item} className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    );
  }

  function renderAuthor() {
    const authorNode = nodes.find((node: any) => node.node_type === "author");
    return (
      <Section title="Author Node">
        <FieldGrid
          items={[
            { label: "Author", value: article.author || intelligence?.article?.author },
            { label: "Known", value: authorNode?.node_metadata?.known === false ? "No extracted byline" : "Known or inferred" },
            { label: "Source", value: source.name },
          ]}
        />
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Author-level framing patterns require multiple articles by the same byline. This node is bounded to the current
          story until more author-linked coverage is available.
        </p>
      </Section>
    );
  }

  function renderBackground() {
    const backgroundNodes = nodes.filter((node: any) =>
      ["event", "topic", "person", "organization", "location", "narrative"].includes(node.node_type)
    );
    return (
      <div className="space-y-4">
        <Section title="Background Nodes">
          {backgroundNodes.length === 0 ? (
            <EmptyState>No background nodes are available yet.</EmptyState>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {backgroundNodes.map((node: any) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left text-sm hover:bg-white"
                >
                  <span className="block text-xs font-medium text-slate-500">{node.node_type}</span>
                  <span className="mt-1 block font-medium text-slate-950">{node.label}</span>
                </button>
              ))}
            </div>
          )}
        </Section>
        <Section title="Entities">
          <JsonBlock value={entities} />
        </Section>
        {asList(narrative.missing_context).length > 0 && (
          <Section title="Missing Context">
            <ul className="space-y-2">
              {asList(narrative.missing_context).map((item) => (
                <li key={item} className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    );
  }

  function renderOsint() {
    const references = Array.isArray(currentOsintContext?.discovered_references)
      ? currentOsintContext.discovered_references
      : [];
    const retrievalErrors = asList(currentOsintContext?.retrieval_mode?.errors || []);
    const citations = Array.isArray(currentOsintContext?.citations) ? currentOsintContext.citations : [];

    return (
      <div className="space-y-4">
        <Section title="Bounded OSINT Context">
          <ProviderStrip metadata={currentOsintContext?.provider_metadata} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => loadOsint(false)}
              disabled={osintLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {osintLoading ? "Refreshing..." : "Refresh context"}
            </button>
            <button
              onClick={() => loadOsint(true)}
              disabled={osintLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              Public search
            </button>
          </div>

          {osintError && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{osintError}</p>}
          {retrievalErrors.length > 0 && (
            <ul className="mt-3 space-y-2">
              {retrievalErrors.map((item) => (
                <li key={item} className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <FieldGrid
              items={[
                { label: "Status", value: currentOsintContext?.status },
                { label: "Provider", value: currentOsintContext?.retrieval_mode?.provider },
                { label: "External enabled", value: String(Boolean(currentOsintContext?.retrieval_mode?.external_enabled)) },
                { label: "External results", value: currentOsintContext?.retrieval_mode?.external_results_included || 0 },
                { label: "Overall relevance", value: currentOsintContext?.relevance?.overall },
                { label: "References", value: references.length },
              ]}
            />
          </div>
        </Section>

        <Section title="Discovered References">
          {references.length === 0 ? (
            <EmptyState>No OSINT references are available yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {references.map((reference: any, index: number) => (
                <article key={`${reference.url}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                      {reference.source_type}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                      {reference.reliability_level}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                      relevance {Math.round((reference.relevance || 0) * 100)}%
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-950">{reference.title}</h3>
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm text-slate-600 underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {reference.url}
                  </a>
                  {asList(reference.risks).length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {asList(reference.risks).map((risk) => (
                        <li key={risk} className="text-xs leading-5 text-slate-500">
                          {risk}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section title="Risks And Contradictions">
          <div className="space-y-3">
            {asList(currentOsintContext?.risks).map((risk) => (
              <p key={risk} className="rounded-2xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                {risk}
              </p>
            ))}
            {Array.isArray(currentOsintContext?.contradictions) && currentOsintContext.contradictions.length > 0 && (
              <JsonBlock value={currentOsintContext.contradictions} />
            )}
          </div>
        </Section>

        <Section title="Citations">
          {citations.length === 0 ? <EmptyState>No citations available.</EmptyState> : <JsonBlock value={citations} />}
        </Section>

        <Section title="Search Hooks">
          <JsonBlock
            value={{
              search_queries: currentOsintContext?.search_queries || comparisonHooks?.search_queries || [],
              claims_to_check: currentOsintContext?.claims_to_check || [],
              entities_to_check: currentOsintContext?.entities_to_check || [],
            }}
          />
        </Section>
      </div>
    );
  }

  function renderActiveTab() {
    if (activeTab === "Claims") return renderClaims();
    if (activeTab === "Compare") return renderCompare();
    if (activeTab === "Source") return renderSource();
    if (activeTab === "Author") return renderAuthor();
    if (activeTab === "Background") return renderBackground();
    if (activeTab === "OSINT") return renderOsint();
    return renderSummary();
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl p-6 text-sm text-slate-500">Loading article detail...</main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 underline">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </a>
        <p className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 md:p-6">
      <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 underline">
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </a>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {article.analysis_status || "pending"}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
            {source.name || article.source_id || "Unknown source"}
          </span>
          {graph.node_type_counts && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              <GitBranch className="h-3.5 w-3.5" />
              {nodes.length} nodes / {edges.length} edges
            </span>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-semibold leading-8 text-slate-950">{article.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {intelligence?.summary || article.summary || "No summary available."}
        </p>
        <div className="mt-4">
          <ProviderStrip metadata={providerMetadata} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
              Source article
            </a>
          )}
          <a
            href={`/compare?articleId=${encodeURIComponent(articleId)}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <Columns3 className="h-4 w-4" />
            Compare
          </a>
        </div>
      </article>

      {nodes.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Node selector</h2>
              <p className="mt-1 text-sm text-slate-500">Choose the perspective used by the detail view.</p>
            </div>
            <select
              value={selectedNode?.id || ""}
              onChange={(event) => setSelectedNodeId(event.target.value)}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {nodes.map((node: any) => (
                <option key={node.id} value={node.id}>
                  {node.node_type}: {node.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(graph.node_type_counts || {}).map(([type, count]) => (
              <span key={type} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {type} {String(count)}
              </span>
            ))}
          </div>
        </section>
      )}

      <PerspectivePanel node={selectedNode} />

      <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => changeTab(tab)}
              className={`min-h-10 rounded-2xl px-4 py-2 text-sm font-medium ${
                activeTab === tab ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
              {nodesForActiveTab.length > 0 && activeTab === tab ? (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{nodesForActiveTab.length}</span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {renderActiveTab()}

      {detail?.limitations?.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          <h2 className="text-sm font-semibold text-slate-950">Limits</h2>
          <ul className="mt-3 space-y-2">
            {detail.limitations.map((item: string) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
