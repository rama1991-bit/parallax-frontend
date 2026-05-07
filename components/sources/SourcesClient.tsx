"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowRight, Database, Globe2, Plus, RefreshCcw, Send } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type SourceSummary = {
  id: string;
  name: string;
  domain?: string;
  url?: string;
  signal_count: number;
  article_count: number;
  feed_item_count: number;
  saved_count: number;
  high_priority_count: number;
  avg_priority_score: number;
  avg_confidence?: number | null;
  dominant_frames: string[];
  topics: string[];
};

type Phase2Source = {
  id: string;
  name: string;
  website_url?: string;
  rss_url?: string;
  country?: string;
  language?: string;
  region?: string;
  source_size?: string;
  source_type?: string;
  feed_count?: number;
  article_count?: number;
  is_default?: boolean;
  review_status?: string;
  review_notes?: string | null;
  disabled_reason?: string | null;
  quality_score?: number;
  health?: SourceHealth;
};

type SourceFormState = {
  name: string;
  website_url: string;
  rss_url: string;
  country: string;
  language: string;
  region: string;
  source_size: string;
  source_type: string;
  feed_type: "rss" | "homepage" | "manual";
  credibility_notes: string;
};

type SourceDraftContext = {
  cluster_id?: string | null;
  candidate_id?: string | null;
  name?: string | null;
  website_url?: string | null;
  rss_url?: string | null;
  country?: string | null;
  language?: string | null;
  region?: string | null;
  source_size?: string | null;
  source_type?: string | null;
  feed_type?: "rss" | "homepage" | "manual" | null;
  credibility_notes?: string | null;
  search_query?: string | null;
  source_manager_url?: string;
  status?: string | null;
  source_id?: string | null;
};

type SourceHealth = {
  status: "healthy" | "stale" | "error" | "needs_review" | string;
  label?: string;
  active_feed_count?: number;
  articles_24h?: number;
  run_count?: number;
  success_rate?: number | null;
  last_checked_at?: string | null;
  last_success_at?: string | null;
  last_error?: string | null;
  recommendation?: string;
};

type OpsAlert = {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical" | string;
  status: string;
  source_id?: string | null;
  title: string;
  message: string;
  updated_at?: string;
  delivery_status?: string;
  delivery?: {
    status?: string;
    created_at?: string;
    delivered_at?: string | null;
    error?: string | null;
  } | null;
};

const ADMIN_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_ADMIN_CONTROLS === "true";
const ADMIN_KEY_STORAGE_KEY = "parallax_admin_key";
const EMPTY_SOURCE_FORM: SourceFormState = {
  name: "",
  website_url: "",
  rss_url: "",
  country: "",
  language: "",
  region: "",
  source_size: "medium",
  source_type: "newspaper",
  feed_type: "homepage",
  credibility_notes: "",
};
const SOURCE_SIZE_OPTIONS = ["major", "medium", "small", "niche"];
const SOURCE_TYPE_OPTIONS = [
  "news_agency",
  "newspaper",
  "broadcaster",
  "magazine",
  "independent",
  "state_media",
  "NGO",
  "official",
];

function scoreLabel(value?: number | null) {
  if (value === null || value === undefined) return "Unknown";
  return `${Math.round(Number(value) * 100)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function healthStyles(status?: string) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-700";
  if (status === "stale") return "bg-amber-50 text-amber-700";
  if (status === "error") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function reviewStyles(status?: string) {
  if (status === "reviewed") return "bg-emerald-50 text-emerald-700";
  if (status === "quarantined") return "bg-amber-50 text-amber-700";
  if (status === "disabled") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function severityStyles(severity?: string) {
  if (severity === "critical") return "bg-rose-50 text-rose-700";
  if (severity === "warning") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function deliveryStyles(status?: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "skipped") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function reviewLabel(status?: string) {
  return (status || "needs_review").replace(/_/g, " ");
}

function deliveryLabel(status?: string) {
  return (status || "not_sent").replace(/_/g, " ");
}

function validationStyles(status?: string) {
  if (status === "validated") return "bg-emerald-50 text-emerald-800";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "needs_review") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function validationLabel(status?: string) {
  return (status || "not_validated").replace(/_/g, " ");
}

function workflowStyles(status?: string) {
  if (status === "completed" || status === "validated") return "bg-emerald-50 text-emerald-800";
  if (status === "partial" || status === "needs_review") return "bg-amber-50 text-amber-800";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function phaseOutput(phase: any) {
  return (
    phase?.article_count ||
    phase?.analyzed_count ||
    phase?.card_count ||
    phase?.cluster_count ||
    phase?.sample_size ||
    phase?.item_count ||
    0
  );
}

function HealthBadge({ health }: { health?: SourceHealth }) {
  const label = health?.label || "Needs review";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${healthStyles(health?.status)}`}>
      <Activity aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}

function ReviewBadge({ status }: { status?: string }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs capitalize ${reviewStyles(status)}`}>
      {reviewLabel(status)}
    </span>
  );
}

function TagList({ items }: { items: string[] }) {
  if (!items?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 4).map((item) => (
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

export function SourcesClient() {
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [sourceRecords, setSourceRecords] = useState<Phase2Source[]>([]);
  const [defaultPreview, setDefaultPreview] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [pendingAnalysisResult, setPendingAnalysisResult] = useState<any>(null);
  const [intelligenceResult, setIntelligenceResult] = useState<any>(null);
  const [intelligenceRuns, setIntelligenceRuns] = useState<any[]>([]);
  const [clusterResult, setClusterResult] = useState<any>(null);
  const [clusterRuns, setClusterRuns] = useState<any[]>([]);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [deliveryResult, setDeliveryResult] = useState<any>(null);
  const [sourceDiscoveryRuns, setSourceDiscoveryRuns] = useState<any[]>([]);
  const [sourceValidationRuns, setSourceValidationRuns] = useState<any[]>([]);
  const [sourceOnboardingRuns, setSourceOnboardingRuns] = useState<any[]>([]);
  const [opsAlerts, setOpsAlerts] = useState<OpsAlert[]>([]);
  const [opsSummary, setOpsSummary] = useState<any>(null);
  const [sourceForm, setSourceForm] = useState<SourceFormState>(EMPTY_SOURCE_FORM);
  const [sourceCreateResult, setSourceCreateResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [resolvingDraft, setResolvingDraft] = useState(false);
  const [discoveringSources, setDiscoveringSources] = useState(false);
  const [validatingCandidateId, setValidatingCandidateId] = useState("");
  const [onboardingCandidateId, setOnboardingCandidateId] = useState("");
  const [sourceDiscoveryResult, setSourceDiscoveryResult] = useState<any>(null);
  const [selectedDiscoveryCandidate, setSelectedDiscoveryCandidate] = useState<any>(null);
  const [allowUnvalidatedCreate, setAllowUnvalidatedCreate] = useState(false);
  const [syncAfterCreate, setSyncAfterCreate] = useState(false);
  const [syncingActive, setSyncingActive] = useState(false);
  const [analyzingPending, setAnalyzingPending] = useState(false);
  const [refreshingIntelligence, setRefreshingIntelligence] = useState(false);
  const [refreshingClusters, setRefreshingClusters] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [evaluatingOps, setEvaluatingOps] = useState(false);
  const [deliveringOps, setDeliveringOps] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [sourceDraft, setSourceDraft] = useState<SourceDraftContext | null>(null);
  const [error, setError] = useState("");

  async function loadSources() {
    setError("");

    try {
      const [authorData, sourceData, previewData] = await Promise.all([
        apiGet("/api/v1/authors"),
        apiGet("/api/v1/sources?limit=250"),
        apiGet("/api/v1/sources/defaults/preview"),
      ]);
      setSources(authorData?.sources || []);
      setSourceRecords(sourceData?.sources || []);
      setDefaultPreview(previewData);
    } catch (err: any) {
      setError(err?.message || "Could not load sources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ADMIN_CONTROLS_ENABLED && typeof window !== "undefined") {
      setAdminKey(window.sessionStorage.getItem(ADMIN_KEY_STORAGE_KEY) || "");
    }
    loadSources();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const draftName = params.get("draft_name");
    const searchQuery = params.get("search_query");
    const clusterId = params.get("cluster_id");
    const candidateId = params.get("candidate_id");
    if (!draftName && !searchQuery) return;

    const feedType = params.get("feed_type");
    setSourceForm((current) => ({
      ...current,
      name: draftName || current.name || "Suggested source",
      website_url: params.get("website_url") || current.website_url,
      rss_url: params.get("rss_url") || current.rss_url,
      country: params.get("country") || current.country,
      language: params.get("language") || current.language,
      region: params.get("region") || current.region,
      source_size: params.get("source_size") || current.source_size,
      source_type: params.get("source_type") || current.source_type,
      feed_type: feedType === "rss" || feedType === "homepage" || feedType === "manual" ? feedType : current.feed_type,
      credibility_notes:
        params.get("credibility_notes") ||
        (searchQuery ? `Suggested source search: ${searchQuery}` : current.credibility_notes),
    }));
    const draftFeedType: SourceDraftContext["feed_type"] =
      feedType === "rss" || feedType === "homepage" || feedType === "manual" ? feedType : null;
    const draft: SourceDraftContext = {
      cluster_id: clusterId,
      candidate_id: candidateId,
      name: draftName,
      website_url: params.get("website_url"),
      rss_url: params.get("rss_url"),
      country: params.get("country"),
      language: params.get("language"),
      region: params.get("region"),
      source_size: params.get("source_size"),
      source_type: params.get("source_type"),
      feed_type: draftFeedType,
      credibility_notes: params.get("credibility_notes"),
      search_query: searchQuery,
      source_manager_url: window.location.pathname + window.location.search,
      status: params.get("draft_status") || "draft",
      source_id: params.get("source_id"),
    };
    setSourceDraft(draft);
    setSourceCreateResult({ draft });
  }, []);

  function updateAdminKey(value: string) {
    setAdminKey(value);
    if (typeof window !== "undefined") {
      if (value.trim()) {
        window.sessionStorage.setItem(ADMIN_KEY_STORAGE_KEY, value);
      } else {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE_KEY);
      }
    }
  }

  function adminHeaders(): Record<string, string> {
    const key = adminKey.trim();
    return key ? { "X-Parallax-Admin-Key": key } : {};
  }

  function updateSourceForm(field: keyof SourceFormState, value: string) {
    setSourceForm((current) => ({ ...current, [field]: value }) as SourceFormState);
  }

  async function loadOpsAlerts() {
    if (!ADMIN_CONTROLS_ENABLED || !adminKey.trim()) return;
    const data = await apiGet("/api/v1/sources/ops/alerts?limit=12", adminHeaders());
    setOpsAlerts(data?.alerts || []);
    setOpsSummary(data?.summary || null);
  }

  async function loadIntelligenceRuns() {
    if (!ADMIN_CONTROLS_ENABLED || !adminKey.trim()) return;
    const data = await apiGet("/api/v1/intelligence/runs?limit=6", adminHeaders());
    setIntelligenceRuns(data?.runs || []);
  }

  async function loadClusterRuns() {
    if (!ADMIN_CONTROLS_ENABLED || !adminKey.trim()) return;
    const data = await apiGet("/api/v1/intelligence/clusters/runs?limit=6", adminHeaders());
    setClusterRuns(data?.runs || []);
  }

  async function loadSourceWorkflowRuns() {
    if (!ADMIN_CONTROLS_ENABLED || !adminKey.trim()) return;
    try {
      const [discoveryData, validationData, onboardingData] = await Promise.all([
        apiGet("/api/v1/sources/discovery-runs?limit=6", adminHeaders()),
        apiGet("/api/v1/sources/validation-runs?limit=6", adminHeaders()),
        apiGet("/api/v1/sources/onboarding-runs?limit=8", adminHeaders()),
      ]);
      setSourceDiscoveryRuns(discoveryData?.runs || []);
      setSourceValidationRuns(validationData?.runs || []);
      setSourceOnboardingRuns(onboardingData?.runs || []);
    } catch {
      setSourceDiscoveryRuns([]);
      setSourceValidationRuns([]);
      setSourceOnboardingRuns([]);
    }
  }

  useEffect(() => {
    if (!ADMIN_CONTROLS_ENABLED || !adminKey.trim()) return;
    loadSourceWorkflowRuns();
  }, [adminKey]);

  async function seedDefaults() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for default source seeding.");
      return;
    }
    setSeeding(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/sources/defaults/seed", {}, adminHeaders());
      setSeedResult(result);
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not seed default sources.");
    } finally {
      setSeeding(false);
    }
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for source creation.");
      return;
    }

    const name = sourceForm.name.trim();
    const websiteUrl = sourceForm.website_url.trim();
    const rssUrl = sourceForm.rss_url.trim();
    const feedType = sourceForm.feed_type;
    if (!name) {
      setError("Source name is required.");
      return;
    }
    if (feedType === "rss" && !rssUrl) {
      setError("RSS URL is required for RSS sources.");
      return;
    }
    if (feedType === "homepage" && !websiteUrl) {
      setError("Website URL is required for homepage sources.");
      return;
    }
    const selectedValidationStatus =
      selectedDiscoveryCandidate?.validation_status || selectedDiscoveryCandidate?.validation?.status;
    if (selectedDiscoveryCandidate && selectedValidationStatus !== "validated" && !allowUnvalidatedCreate) {
      setError("Validate the selected source candidate before adding it, or enable validation override.");
      return;
    }

    setCreatingSource(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources",
        {
          name,
          website_url: websiteUrl || undefined,
          rss_url: feedType === "rss" ? rssUrl : undefined,
          country: sourceForm.country.trim() || undefined,
          language: sourceForm.language.trim() || undefined,
          region: sourceForm.region.trim() || undefined,
          source_size: sourceForm.source_size || undefined,
          source_type: sourceForm.source_type || undefined,
          feed_type: feedType,
          credibility_notes: sourceForm.credibility_notes.trim() || undefined,
          draft_cluster_id: sourceDraft?.cluster_id || undefined,
          draft_candidate_id: sourceDraft?.candidate_id || undefined,
          draft_payload: sourceDraft
            ? {
                ...sourceDraft,
                name,
                website_url: websiteUrl || undefined,
                rss_url: feedType === "rss" ? rssUrl : undefined,
                country: sourceForm.country.trim() || undefined,
                language: sourceForm.language.trim() || undefined,
                region: sourceForm.region.trim() || undefined,
                source_size: sourceForm.source_size || undefined,
                source_type: sourceForm.source_type || undefined,
                feed_type: feedType,
                credibility_notes: sourceForm.credibility_notes.trim() || undefined,
                discovery_candidate: selectedDiscoveryCandidate || undefined,
              }
            : undefined,
        },
        adminHeaders()
      );
      let finalResult = result;
      if (syncAfterCreate && result?.source?.id && result?.feed?.feed_type && result.feed.feed_type !== "manual") {
        try {
          const immediateSync = await apiPost(
            `/api/v1/sources/${encodeURIComponent(result.source.id)}/sync?limit=5&card_limit=5`,
            {},
            adminHeaders()
          );
          finalResult = { ...result, immediate_sync_result: immediateSync };
          try {
            const intelligenceRefresh = await apiPost(
              `/api/v1/sources/${encodeURIComponent(result.source.id)}/intelligence/refresh?limit=50`,
              {},
              adminHeaders()
            );
            finalResult = { ...finalResult, immediate_intelligence_result: intelligenceRefresh };
          } catch (intelligenceErr: any) {
            finalResult = {
              ...finalResult,
              immediate_intelligence_error: intelligenceErr?.message || "Immediate source intelligence refresh failed.",
            };
          }
          if (sourceDraft?.cluster_id) {
            try {
              const clusterRefresh = await apiPost(
                "/api/v1/intelligence/clusters/refresh?article_limit=100&cluster_limit=50&card_limit=20",
                {},
                adminHeaders()
              );
              finalResult = { ...finalResult, immediate_cluster_refresh_result: clusterRefresh };
            } catch (clusterErr: any) {
              finalResult = {
                ...finalResult,
                immediate_cluster_refresh_error: clusterErr?.message || "Immediate cluster refresh failed.",
              };
            }
          }
        } catch (syncErr: any) {
          finalResult = { ...result, immediate_sync_error: syncErr?.message || "Immediate source sync failed." };
        }
      }
      setSourceCreateResult(finalResult);
      if (result?.draft_resolution?.source_candidate) {
        setSourceDraft(result.draft_resolution.source_candidate);
      }
      setSelectedDiscoveryCandidate(null);
      setAllowUnvalidatedCreate(false);
      setSourceForm(EMPTY_SOURCE_FORM);
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not create source.");
    } finally {
      setCreatingSource(false);
    }
  }

  async function discoverSourceCandidates() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for source discovery.");
      return;
    }
    const query = (sourceDraft?.search_query || sourceForm.name || sourceForm.credibility_notes).trim();
    if (!query) {
      setError("A search query is required for source discovery.");
      return;
    }
    setDiscoveringSources(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/discover?include_external=true&limit=8",
        {
          query,
          cluster_id: sourceDraft?.cluster_id || undefined,
          candidate_id: sourceDraft?.candidate_id || undefined,
          country: sourceDraft?.country || sourceForm.country.trim() || undefined,
          language: sourceDraft?.language || sourceForm.language.trim() || undefined,
          region: sourceDraft?.region || sourceForm.region.trim() || undefined,
          source_type: sourceDraft?.source_type || sourceForm.source_type || undefined,
        },
        adminHeaders()
      );
      setSourceDiscoveryResult(result);
      setSelectedDiscoveryCandidate(null);
      setAllowUnvalidatedCreate(false);
      await loadSourceWorkflowRuns();
    } catch (err: any) {
      setError(err?.message || "Could not discover source candidates.");
    } finally {
      setDiscoveringSources(false);
    }
  }

  function useDiscoveredCandidate(candidate: any) {
    const payload = candidate?.create_payload || candidate || {};
    const feedType =
      payload.feed_type === "rss" || payload.feed_type === "homepage" || payload.feed_type === "manual"
        ? payload.feed_type
        : payload.rss_url
          ? "rss"
          : "homepage";
    setSourceForm((current) => ({
      ...current,
      name: payload.name || candidate?.name || current.name,
      website_url: payload.website_url || candidate?.website_url || current.website_url,
      rss_url: payload.rss_url || candidate?.rss_url || current.rss_url,
      country: payload.country || candidate?.country || current.country,
      language: payload.language || candidate?.language || current.language,
      region: payload.region || candidate?.region || current.region,
      source_size: payload.source_size || candidate?.source_size || current.source_size,
      source_type: payload.source_type || candidate?.source_type || current.source_type,
      feed_type: feedType,
      credibility_notes: payload.credibility_notes || candidate?.credibility_notes || current.credibility_notes,
    }));
    setSyncAfterCreate(feedType !== "manual");
    setSelectedDiscoveryCandidate(candidate);
    setAllowUnvalidatedCreate(false);
    setSourceCreateResult((current: any) => ({
      ...(current || {}),
      discovery_candidate: candidate,
      draft: sourceDraft,
    }));
  }

  async function validateDiscoveredCandidate(candidate: any, selectAfterValidation = false) {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for source validation.");
      return;
    }
    setValidatingCandidateId(candidate?.id || candidate?.website_url || "candidate");
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/discover/validate?limit=5",
        { candidate, allow_homepage_fallback: true },
        adminHeaders()
      );
      const enrichedCandidate = result?.candidate || candidate;
      setSourceDiscoveryResult((current: any) => ({
        ...(current || {}),
        candidates: (current?.candidates || []).map((item: any) =>
          (item.id || item.website_url) === (candidate.id || candidate.website_url) ? enrichedCandidate : item
        ),
        latest_validation: result,
      }));
      if (
        (selectedDiscoveryCandidate?.id || selectedDiscoveryCandidate?.website_url) ===
        (candidate?.id || candidate?.website_url)
      ) {
        setSelectedDiscoveryCandidate(enrichedCandidate);
      }
      if (selectAfterValidation) {
        useDiscoveredCandidate(enrichedCandidate);
      }
      await loadSourceWorkflowRuns();
    } catch (err: any) {
      setError(err?.message || "Could not validate source candidate.");
    } finally {
      setValidatingCandidateId("");
    }
  }

  async function onboardDiscoveredCandidate(candidate: any) {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for source onboarding.");
      return;
    }
    const validationStatus = candidate?.validation_status || candidate?.validation?.status;
    if (validationStatus !== "validated" && !allowUnvalidatedCreate) {
      setError("Validate the source candidate before onboarding it, or enable validation override.");
      return;
    }
    const payload = candidate?.create_payload || candidate || {};
    setOnboardingCandidateId(candidate?.id || candidate?.website_url || "candidate");
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/discover/onboard?sync_article_limit=5&sync_card_limit=5&analysis_article_limit=10&intelligence_article_limit=50&cluster_article_limit=100&cluster_limit=50&cluster_card_limit=20",
        {
          candidate,
          source_payload: {
            name: sourceForm.name.trim() || payload.name || candidate?.name || undefined,
            website_url: sourceForm.website_url.trim() || payload.website_url || candidate?.website_url || undefined,
            rss_url:
              sourceForm.feed_type === "rss"
                ? sourceForm.rss_url.trim() || payload.rss_url || candidate?.rss_url || undefined
                : payload.rss_url || candidate?.rss_url || undefined,
            country: sourceForm.country.trim() || payload.country || candidate?.country || undefined,
            language: sourceForm.language.trim() || payload.language || candidate?.language || undefined,
            region: sourceForm.region.trim() || payload.region || candidate?.region || undefined,
            source_size: sourceForm.source_size || payload.source_size || candidate?.source_size || undefined,
            source_type: sourceForm.source_type || payload.source_type || candidate?.source_type || undefined,
            feed_type: sourceForm.feed_type || payload.feed_type || candidate?.feed_type || undefined,
            credibility_notes: sourceForm.credibility_notes.trim() || payload.credibility_notes || candidate?.credibility_notes || undefined,
          },
          draft_cluster_id: sourceDraft?.cluster_id || undefined,
          draft_candidate_id: sourceDraft?.candidate_id || undefined,
          draft_resolution_notes: "Source onboarded from source manager.",
          allow_unvalidated: allowUnvalidatedCreate,
          allow_homepage_fallback: true,
          sync_after_create: true,
          analyze_after_sync: true,
          refresh_intelligence: true,
          refresh_clusters: Boolean(sourceDraft?.cluster_id),
        },
        adminHeaders()
      );
      setSourceCreateResult({
        ...(result || {}),
        onboarding_result: result,
        draft_resolution: result?.results?.draft_resolution,
      });
      if (result?.candidate) {
        setSourceDiscoveryResult((current: any) => ({
          ...(current || {}),
          candidates: (current?.candidates || []).map((item: any) =>
            (item.id || item.website_url) === (candidate.id || candidate.website_url) ? result.candidate : item
          ),
          latest_onboarding: result,
        }));
        setSelectedDiscoveryCandidate(result.candidate);
      }
      if (result?.results?.draft_resolution?.source_candidate) {
        setSourceDraft(result.results.draft_resolution.source_candidate);
      }
      await loadSources();
      await loadSourceWorkflowRuns();
    } catch (err: any) {
      setError(err?.message || "Could not onboard source candidate.");
    } finally {
      setOnboardingCandidateId("");
    }
  }

  async function updateDraftResolution(status: "resolved" | "ignored" | "draft") {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for source draft updates.");
      return;
    }
    if (!sourceDraft?.cluster_id || !sourceDraft?.candidate_id) {
      setError("This draft is missing cluster context.");
      return;
    }
    setResolvingDraft(true);
    setError("");

    try {
      const result = await apiPost(
        `/api/v1/intelligence/clusters/${encodeURIComponent(sourceDraft.cluster_id)}/source-drafts/${encodeURIComponent(sourceDraft.candidate_id)}/resolve`,
        {
          status,
          resolution_notes:
            status === "ignored"
              ? "Draft ignored from source manager."
              : status === "resolved"
                ? "Coverage gap marked resolved from source manager."
                : "Draft reopened from source manager.",
          draft_payload: {
            ...sourceDraft,
            name: sourceForm.name.trim() || undefined,
            website_url: sourceForm.website_url.trim() || undefined,
            rss_url: sourceForm.rss_url.trim() || undefined,
            country: sourceForm.country.trim() || undefined,
            language: sourceForm.language.trim() || undefined,
            region: sourceForm.region.trim() || undefined,
            source_size: sourceForm.source_size || undefined,
            source_type: sourceForm.source_type || undefined,
            feed_type: sourceForm.feed_type,
            credibility_notes: sourceForm.credibility_notes.trim() || undefined,
          },
        },
        adminHeaders()
      );
      setSourceDraft(result?.source_candidate || sourceDraft);
      setSourceCreateResult((current: any) => ({
        ...(current || {}),
        draft: result?.source_candidate || sourceDraft,
        draft_resolution: result,
      }));
    } catch (err: any) {
      setError(err?.message || "Could not update source draft.");
    } finally {
      setResolvingDraft(false);
    }
  }

  async function syncActiveSources() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for active source sync.");
      return;
    }
    setSyncingActive(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/sync-active?source_limit=25&feed_limit=25&article_limit=5&card_limit=10",
        {},
        adminHeaders()
      );
      setSyncResult(result);
      setOpsSummary(result?.ops_alerts?.summary || null);
      setDeliveryResult(result?.ops_alert_delivery || null);
      await loadSources();
      await loadOpsAlerts();
    } catch (err: any) {
      setError(err?.message || "Could not sync active source feeds.");
    } finally {
      setSyncingActive(false);
    }
  }

  async function analyzePendingArticles() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for pending article analysis.");
      return;
    }
    setAnalyzingPending(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/sources/articles/analyze-pending?limit=25",
        {},
        adminHeaders()
      );
      setPendingAnalysisResult(result);
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not analyze pending articles.");
    } finally {
      setAnalyzingPending(false);
    }
  }

  async function refreshIntelligence() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for intelligence refresh.");
      return;
    }
    setRefreshingIntelligence(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/intelligence/refresh?source_limit=50&topic_limit=50&article_limit=100&card_limit=50",
        {},
        adminHeaders()
      );
      setIntelligenceResult(result);
      if (result?.run) {
        setIntelligenceRuns((current) => [result.run, ...current.filter((run) => run?.id !== result.run?.id)].slice(0, 6));
      }
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not refresh intelligence snapshots.");
    } finally {
      setRefreshingIntelligence(false);
    }
  }

  async function refreshClusters() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for event cluster refresh.");
      return;
    }
    setRefreshingClusters(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/intelligence/clusters/refresh?article_limit=250&cluster_limit=100&card_limit=50",
        {},
        adminHeaders()
      );
      setClusterResult(result);
      if (result?.run) {
        setClusterRuns((current) => [result.run, ...current.filter((run) => run?.id !== result.run?.id)].slice(0, 6));
      }
      await loadSources();
    } catch (err: any) {
      setError(err?.message || "Could not refresh event clusters.");
    } finally {
      setRefreshingClusters(false);
    }
  }

  async function runPipeline() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for the intelligence pipeline.");
      return;
    }
    setRunningPipeline(true);
    setError("");

    try {
      const result = await apiPost(
        "/api/v1/intelligence/pipeline/run?source_limit=25&feed_limit=50&sync_article_limit=5&sync_card_limit=15&analysis_article_limit=25&intelligence_source_limit=50&topic_limit=50&intelligence_article_limit=100&intelligence_card_limit=50&cluster_article_limit=250&cluster_limit=100&cluster_card_limit=50",
        {},
        adminHeaders()
      );
      setPipelineResult(result);
      await loadSources();
      await loadOpsAlerts();
      await loadIntelligenceRuns();
      await loadClusterRuns();
    } catch (err: any) {
      setError(err?.message || "Could not run intelligence pipeline.");
    } finally {
      setRunningPipeline(false);
    }
  }

  async function evaluateOpsAlerts() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for operational alert evaluation.");
      return;
    }
    setEvaluatingOps(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/sources/ops/alerts/evaluate?limit=250", {}, adminHeaders());
      setOpsSummary(result?.summary || null);
      await loadOpsAlerts();
    } catch (err: any) {
      setError(err?.message || "Could not evaluate source operational alerts.");
    } finally {
      setEvaluatingOps(false);
    }
  }

  async function deliverOpsAlerts() {
    if (ADMIN_CONTROLS_ENABLED && !adminKey.trim()) {
      setError("Admin key is required for operational alert delivery.");
      return;
    }
    setDeliveringOps(true);
    setError("");

    try {
      const result = await apiPost("/api/v1/sources/ops/alerts/deliver?limit=50", {}, adminHeaders());
      setDeliveryResult(result);
      await loadOpsAlerts();
    } catch (err: any) {
      setError(err?.message || "Could not deliver source operational alerts.");
    } finally {
      setDeliveringOps(false);
    }
  }

  const defaultSummary = defaultPreview?.summary || {};
  const defaultSourceCount = sourceRecords.filter((source) => source.is_default).length;
  const reviewCount = sourceRecords.filter(
    (source) => source.review_status !== "reviewed" || Number(source.quality_score || 0) < 0.55
  ).length;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Sources
            </h1>
          </div>

          <button
            onClick={loadSources}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
            aria-label="Refresh sources"
            title="Refresh sources"
          >
            <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-slate-700">
              <Database aria-hidden="true" className="h-5 w-5" />
              <h2 className="text-base font-semibold text-slate-950">
                Default source database
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Seed a multilingual baseline of agencies, broadcasters, newspapers, independent outlets, NGOs, and official sources.
            </p>
          </div>

          {ADMIN_CONTROLS_ENABLED && (
            <div className="grid gap-2 sm:min-w-72">
              <input
                value={adminKey}
                onChange={(event) => updateAdminKey(event.target.value)}
                type="password"
                placeholder="Admin API key"
                className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={seedDefaults}
                  disabled={seeding || !adminKey.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {seeding ? "Seeding..." : defaultSourceCount ? "Refresh defaults" : "Seed defaults"}
                </button>
                <button
                  onClick={syncActiveSources}
                  disabled={syncingActive || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {syncingActive ? "Syncing..." : "Sync active"}
                </button>
                <button
                  onClick={runPipeline}
                  disabled={runningPipeline || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {runningPipeline ? "Running..." : "Run pipeline"}
                </button>
                <button
                  onClick={analyzePendingArticles}
                  disabled={analyzingPending || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Activity aria-hidden="true" className="h-4 w-4" />
                  {analyzingPending ? "Analyzing..." : "Analyze pending"}
                </button>
                <button
                  onClick={evaluateOpsAlerts}
                  disabled={evaluatingOps || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Activity aria-hidden="true" className="h-4 w-4" />
                  {evaluatingOps ? "Evaluating..." : "Evaluate ops"}
                </button>
                <button
                  onClick={refreshIntelligence}
                  disabled={refreshingIntelligence || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {refreshingIntelligence ? "Refreshing..." : "Refresh intelligence"}
                </button>
                <button
                  onClick={loadIntelligenceRuns}
                  disabled={!adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Activity aria-hidden="true" className="h-4 w-4" />
                  Runs
                </button>
                <button
                  onClick={refreshClusters}
                  disabled={refreshingClusters || !sourceRecords.length || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {refreshingClusters ? "Clustering..." : "Refresh clusters"}
                </button>
                <button
                  onClick={loadClusterRuns}
                  disabled={!adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Activity aria-hidden="true" className="h-4 w-4" />
                  Cluster runs
                </button>
                <button
                  onClick={deliverOpsAlerts}
                  disabled={deliveringOps || !adminKey.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                  {deliveringOps ? "Delivering..." : "Deliver ops"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Catalog</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.source_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">RSS feeds</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.rss_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Languages</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSummary.language_count || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Seeded</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{defaultSourceCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Needs review</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{reviewCount}</p>
          </div>
        </div>

        {seedResult && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Seeded {seedResult.summary?.seeded_source_count || 0} sources and {seedResult.summary?.seeded_feed_count || 0} feeds.
          </p>
        )}

        {syncResult && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            Synced {syncResult.synced_feed_count || 0} fetchable feeds, skipped {syncResult.skipped_feed_count || 0} manual feeds, saved {syncResult.article_count || 0} articles, created {syncResult.card_count || 0} cards, with {syncResult.error_count || 0} errors.
            {syncResult.sync_run_id ? ` Run ${syncResult.sync_run_id}.` : ""}
          </p>
        )}

        {pendingAnalysisResult && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            Analyzed {pendingAnalysisResult.analyzed_count || 0} pending articles from {pendingAnalysisResult.candidate_count || 0} candidates, with {pendingAnalysisResult.failed_count || 0} failures.
          </p>
        )}

        {intelligenceResult && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            Refreshed {intelligenceResult.snapshot_count || 0} intelligence snapshots, created {intelligenceResult.card_count || 0} feed cards, with {intelligenceResult.error_count || 0} errors.
            {intelligenceResult.run?.id ? ` Run ${intelligenceResult.run.id}.` : ""}
          </p>
        )}

        {intelligenceRuns.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
            {intelligenceRuns.slice(0, 4).map((run) => (
              <div key={run.id} className="grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-4">
                <span className="font-medium text-slate-900">{run.status}</span>
                <span>{run.snapshot_count || 0} snapshots</span>
                <span>{run.card_count || 0} cards</span>
                <span>{formatDateTime(run.started_at)}</span>
              </div>
            ))}
          </div>
        )}

        {clusterResult && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            Refreshed {clusterResult.cluster_count || 0} event clusters from {clusterResult.article_count || 0} articles, created {clusterResult.card_count || 0} feed cards, with {clusterResult.error_count || 0} errors.
            {clusterResult.run?.summary?.cross_language_cluster_count !== undefined ? ` Cross-language ${clusterResult.run.summary.cross_language_cluster_count}.` : ""}
            {clusterResult.run?.summary?.average_cluster_quality !== undefined ? ` Avg quality ${Math.round((clusterResult.run.summary.average_cluster_quality || 0) * 100)}%.` : ""}
            {clusterResult.run?.summary?.coverage_gap_task_count !== undefined ? ` Tasks ${clusterResult.run.summary.coverage_gap_task_count}.` : ""}
            {clusterResult.run?.summary?.suggested_source_search_count !== undefined ? ` Searches ${clusterResult.run.summary.suggested_source_search_count}.` : ""}
            {clusterResult.run?.id ? ` Run ${clusterResult.run.id}.` : ""}
          </p>
        )}

        {clusterRuns.length > 0 && (
          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
            {clusterRuns.slice(0, 4).map((run) => (
              <div key={run.id} className="grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-4">
                <span className="font-medium text-slate-900">{run.status}</span>
                <span>{run.cluster_count || 0} clusters</span>
                <span>{run.card_count || 0} cards</span>
                <span>{formatDateTime(run.started_at)}</span>
              </div>
            ))}
          </div>
        )}

        {pipelineResult && (
          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <p>
              Pipeline {pipelineResult.status}: {pipelineResult.summary?.completed_phase_count || 0} phases completed, {pipelineResult.summary?.feed_card_count || 0} cards, {pipelineResult.summary?.analyzed_article_count || 0} analyzed, {pipelineResult.summary?.cluster_count || 0} clusters, {pipelineResult.summary?.error_count || 0} errors.
            </p>
            {(pipelineResult.phases || []).slice(0, 4).map((phase: any) => (
              <div key={phase.name} className="grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-4">
                <span className="font-medium text-slate-900">{phase.name}</span>
                <span>{phase.status}</span>
                <span>{phase.card_count || phase.snapshot_count || phase.cluster_count || phase.article_count || 0} outputs</span>
                <span>{phase.run_id || "no run"}</span>
              </div>
            ))}
          </div>
        )}

        {opsSummary && (
          <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
            <span>{opsSummary.critical || 0} critical</span>
            <span>{opsSummary.warning || 0} warnings</span>
            <span>{opsSummary.info || 0} info</span>
          </div>
        )}

        {deliveryResult?.summary && (
          <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-3">
            <span>{deliveryResult.summary.delivered || 0} delivered</span>
            <span>{deliveryResult.summary.failed || 0} failed</span>
            <span>{deliveryResult.summary.skipped || 0} skipped</span>
          </div>
        )}

        {opsAlerts.length > 0 && (
          <div className="mt-3 space-y-2">
            {opsAlerts.slice(0, 5).map((alert) => (
              <article key={alert.id} className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${severityStyles(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {alert.alert_type}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${deliveryStyles(alert.delivery_status)}`}>
                    {deliveryLabel(alert.delivery_status)}
                  </span>
                </div>
                <p className="mt-2 font-medium text-slate-950">{alert.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{alert.message}</p>
                {alert.delivery?.error && (
                  <p className="mt-2 text-xs leading-5 text-rose-700">{alert.delivery.error}</p>
                )}
              </article>
            ))}
          </div>
        )}

        {defaultPreview?.sources?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {defaultPreview.sources.slice(0, 10).map((source: any) => (
              <span key={source.name} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {source.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {ADMIN_CONTROLS_ENABLED && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Plus aria-hidden="true" className="h-5 w-5" />
            <h2 className="text-base font-semibold text-slate-950">Add source</h2>
          </div>
          <form onSubmit={createSource} className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Name
                <input
                  value={sourceForm.name}
                  onChange={(event) => updateSourceForm("name", event.target.value)}
                  placeholder="Example Daily"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Feed type
                <select
                  value={sourceForm.feed_type}
                  onChange={(event) => updateSourceForm("feed_type", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="homepage">Homepage</option>
                  <option value="rss">RSS</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Website URL
                <input
                  value={sourceForm.website_url}
                  onChange={(event) => updateSourceForm("website_url", event.target.value)}
                  placeholder="https://example.com"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                RSS URL
                <input
                  value={sourceForm.rss_url}
                  onChange={(event) => updateSourceForm("rss_url", event.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Country
                <input
                  value={sourceForm.country}
                  onChange={(event) => updateSourceForm("country", event.target.value)}
                  placeholder="United States"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Language
                <input
                  value={sourceForm.language}
                  onChange={(event) => updateSourceForm("language", event.target.value)}
                  placeholder="English"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Region
                <input
                  value={sourceForm.region}
                  onChange={(event) => updateSourceForm("region", event.target.value)}
                  placeholder="North America"
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Size
                <select
                  value={sourceForm.source_size}
                  onChange={(event) => updateSourceForm("source_size", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                >
                  {SOURCE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Type
                <select
                  value={sourceForm.source_type}
                  onChange={(event) => updateSourceForm("source_type", event.target.value)}
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
                >
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Credibility notes
              <textarea
                value={sourceForm.credibility_notes}
                onChange={(event) => updateSourceForm("credibility_notes", event.target.value)}
                rows={3}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={creatingSource || !adminKey.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {creatingSource ? "Adding..." : "Add source"}
              </button>
              {sourceCreateResult?.source?.id && (
                <a
                  href={`/sources/${encodeURIComponent(sourceCreateResult.source.id)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  Open
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              )}
              <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={syncAfterCreate}
                  onChange={(event) => setSyncAfterCreate(event.target.checked)}
                  className="h-4 w-4"
                />
                Sync after add
              </label>
              {selectedDiscoveryCandidate && (
                <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
                  <input
                    type="checkbox"
                    checked={allowUnvalidatedCreate}
                    onChange={(event) => setAllowUnvalidatedCreate(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Override validation
                </label>
              )}
            </div>
            {sourceDraft && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs capitalize text-emerald-800">
                    {sourceDraft.status || "draft"}
                  </span>
                  {sourceDraft.cluster_id && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-emerald-800">
                      cluster linked
                    </span>
                  )}
                  {sourceDraft.source_id && (
                    <a
                      href={`/sources/${encodeURIComponent(sourceDraft.source_id)}`}
                      className="rounded-full bg-white px-2 py-1 text-xs font-medium text-emerald-900"
                    >
                      Open created source
                    </a>
                  )}
                </div>
                <p className="mt-2">
                  Draft loaded from cluster automation{sourceDraft.search_query ? `: ${sourceDraft.search_query}` : "."}
                </p>
                {sourceDraft.cluster_id && sourceDraft.candidate_id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateDraftResolution("ignored")}
                      disabled={resolvingDraft || !adminKey.trim() || sourceDraft.status === "ignored"}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resolvingDraft ? "Updating..." : "Ignore draft"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDraftResolution("resolved")}
                      disabled={resolvingDraft || !adminKey.trim() || sourceDraft.status === "resolved" || sourceDraft.status === "created"}
                      className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark resolved
                    </button>
                    {sourceDraft.status && sourceDraft.status !== "draft" && (
                      <button
                        type="button"
                        onClick={() => updateDraftResolution("draft")}
                        disabled={resolvingDraft || !adminKey.trim()}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={discoverSourceCandidates}
                    disabled={discoveringSources || !adminKey.trim()}
                    className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {discoveringSources ? "Discovering..." : "Discover source candidates"}
                  </button>
                </div>
              </div>
            )}
            {sourceDiscoveryResult && (
              <div className="rounded-lg border border-emerald-100 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                    {sourceDiscoveryResult.summary?.candidate_count || 0} candidates
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {sourceDiscoveryResult.retrieval_mode?.external_enabled ? "external enabled" : "default database"}
                  </span>
                  {sourceDiscoveryResult.discovery_run?.id && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      run {sourceDiscoveryResult.discovery_run.id.slice(0, 8)}
                    </span>
                  )}
                </div>
                {sourceDiscoveryResult.retrieval_mode?.errors?.length > 0 && (
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    {sourceDiscoveryResult.retrieval_mode.errors[0]}
                  </p>
                )}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {(sourceDiscoveryResult.candidates || []).slice(0, 6).map((candidate: any) => (
                    <article key={candidate.id || candidate.website_url} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                          {candidate.discovery_method || "candidate"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                          {scoreLabel(candidate.confidence)}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs capitalize ${validationStyles(candidate.validation_status || candidate.validation?.status)}`}>
                          {validationLabel(candidate.validation_status || candidate.validation?.status)}
                        </span>
                        {candidate.existing_source_id && (
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-emerald-800">existing</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{candidate.name}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {[candidate.country, candidate.language, candidate.source_type].filter(Boolean).join(" / ") || candidate.website_url}
                      </p>
                      {candidate.rss_url && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">RSS: {candidate.rss_url}</p>
                      )}
                      {candidate.validation && (
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Validation: {candidate.validation.item_count || 0} items from {candidate.validation.selected_feed_type || "no feed"}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => validateDiscoveredCandidate(candidate)}
                          disabled={!!validatingCandidateId}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {validatingCandidateId === (candidate.id || candidate.website_url) ? "Validating..." : "Validate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => useDiscoveredCandidate(candidate)}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                        >
                          Use candidate
                        </button>
                        {(candidate.validation_status || candidate.validation?.status) !== "validated" && (
                          <button
                            type="button"
                            onClick={() => validateDiscoveredCandidate(candidate, true)}
                            disabled={!!validatingCandidateId}
                            className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Validate and use
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onboardDiscoveredCandidate(candidate)}
                          disabled={
                            !!onboardingCandidateId ||
                            ((candidate.validation_status || candidate.validation?.status) !== "validated" &&
                              !allowUnvalidatedCreate)
                          }
                          className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {onboardingCandidateId === (candidate.id || candidate.website_url) ? "Onboarding..." : "Onboard"}
                        </button>
                        {candidate.existing_source_id && (
                          <a
                            href={`/sources/${encodeURIComponent(candidate.existing_source_id)}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                          >
                            Open existing
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {sourceCreateResult?.source?.name && (
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Added {sourceCreateResult.source.name} with {sourceCreateResult.feed?.feed_type || "no"} feed
                {sourceCreateResult?.draft_resolution ? " and updated the source draft." : "."}
              </p>
            )}
            {sourceCreateResult?.onboarding_result && (
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs capitalize ${workflowStyles(sourceCreateResult.onboarding_result.status)}`}>
                    onboarding {sourceCreateResult.onboarding_result.status}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {sourceCreateResult.onboarding_result.summary?.coverage_delta?.synced_articles || 0} synced
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {sourceCreateResult.onboarding_result.summary?.coverage_delta?.analyzed_articles || 0} analyzed
                  </span>
                  {sourceCreateResult.onboarding_result.run?.id && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                      run {sourceCreateResult.onboarding_result.run.id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {(sourceCreateResult.onboarding_result.phases || []).map((phase: any) => (
                    <div key={phase.name} className="rounded-lg bg-white p-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">{phase.name}</span>
                        <span className={`rounded-full px-2 py-1 capitalize ${workflowStyles(phase.status)}`}>
                          {phase.status}
                        </span>
                      </div>
                      <p className="mt-1">{phaseOutput(phase)} outputs</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sourceCreateResult?.immediate_sync_result && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Immediate sync finished with {sourceCreateResult.immediate_sync_result.article_count || 0} articles and{" "}
                {sourceCreateResult.immediate_sync_result.error_count || 0} errors.
              </p>
            )}
            {sourceCreateResult?.immediate_intelligence_result && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Source intelligence refreshed with sample size {sourceCreateResult.immediate_intelligence_result.sample_size || 0}.
              </p>
            )}
            {sourceCreateResult?.immediate_cluster_refresh_result && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Event clusters refreshed with {sourceCreateResult.immediate_cluster_refresh_result.cluster_count || 0} clusters.
              </p>
            )}
            {sourceCreateResult?.immediate_sync_error && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Source was added, but immediate sync failed: {sourceCreateResult.immediate_sync_error}
              </p>
            )}
            {sourceCreateResult?.immediate_intelligence_error && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Source was added, but intelligence refresh failed: {sourceCreateResult.immediate_intelligence_error}
              </p>
            )}
            {sourceCreateResult?.immediate_cluster_refresh_error && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Source was added, but cluster refresh failed: {sourceCreateResult.immediate_cluster_refresh_error}
              </p>
            )}
          </form>
        </section>
      )}

      {ADMIN_CONTROLS_ENABLED && (sourceOnboardingRuns.length > 0 || sourceDiscoveryRuns.length > 0 || sourceValidationRuns.length > 0) && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Source workflow history</h2>
            <button
              onClick={loadSourceWorkflowRuns}
              disabled={!adminKey.trim()}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          {sourceOnboardingRuns.length > 0 && (
            <div className="mt-4 space-y-2">
              {sourceOnboardingRuns.slice(0, 5).map((run) => (
                <article key={run.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs capitalize ${workflowStyles(run.status)}`}>
                      {run.status}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                      {run.source_name || "source onboarding"}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                      {formatDateTime(run.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-600 sm:grid-cols-4">
                    <span>{run.summary?.coverage_delta?.synced_articles || 0} synced</span>
                    <span>{run.summary?.coverage_delta?.analyzed_articles || 0} analyzed</span>
                    <span>{run.summary?.coverage_delta?.cluster_count || 0} clusters</span>
                    <span>{run.errors?.length || 0} errors</span>
                  </div>
                  {(run.phases || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(run.phases || []).slice(0, 6).map((phase: any) => (
                        <span key={`${run.id}-${phase.name}`} className={`rounded-full px-2 py-1 text-xs capitalize ${workflowStyles(phase.status)}`}>
                          {phase.name}: {phase.status}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Discovery</h3>
              <div className="mt-2 space-y-2">
                {sourceDiscoveryRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="grid gap-1 text-xs leading-5 text-slate-600">
                    <span className="font-medium text-slate-900">{run.query}</span>
                    <span>{run.candidate_count || 0} candidates / {run.existing_source_match_count || 0} existing</span>
                  </div>
                ))}
                {!sourceDiscoveryRuns.length && <p className="text-xs text-slate-500">No discovery runs yet.</p>}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Validation</h3>
              <div className="mt-2 space-y-2">
                {sourceValidationRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className={`rounded-full px-2 py-1 capitalize ${workflowStyles(run.status)}`}>
                      {run.status}
                    </span>
                    <span>{run.item_count || 0} items</span>
                    <span>{run.selected_feed_type || "no feed"}</span>
                  </div>
                ))}
                {!sourceValidationRuns.length && <p className="text-xs text-slate-500">No validation runs yet.</p>}
              </div>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {sourceRecords.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">Source records</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sourceRecords.slice(0, 12).map((source) => (
              <article key={source.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <HealthBadge health={source.health} />
                  <ReviewBadge status={source.review_status} />
                  {source.is_default && (
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">default</span>
                  )}
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.source_type || "source"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.language || "language unknown"}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{source.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {[source.country, source.region, source.source_size].filter(Boolean).join(" / ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.feed_count || 0} feeds
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.article_count || 0} articles
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {source.health?.articles_24h || 0} in 24h
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700">
                    {scoreLabel(source.quality_score)} quality
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-xs leading-5 text-slate-600">
                  <span>Last success: {formatDateTime(source.health?.last_success_at)}</span>
                  <span>Success rate: {scoreLabel(source.health?.success_rate)}</span>
                  {source.health?.last_error && (
                    <span className="text-rose-700">Last error: {source.health.last_error}</span>
                  )}
                </div>
                <a
                  href={`/sources/${encodeURIComponent(source.id)}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Open
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <Globe2 aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            No source signals yet
          </h2>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href="/feeds"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Feeds
            </a>
            <a
              href="/"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              Feed
            </a>
          </div>
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <article
              key={source.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Globe2 aria-hidden="true" className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {source.signal_count} signals
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {source.high_priority_count} priority
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {scoreLabel(source.avg_confidence)}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                    {source.name}
                  </h2>
                  {source.domain && (
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {source.domain}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <TagList items={source.dominant_frames} />
                    <TagList items={source.topics} />
                  </div>

                  <a
                    href={`/sources/${encodeURIComponent(source.id)}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                  >
                    Open
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
