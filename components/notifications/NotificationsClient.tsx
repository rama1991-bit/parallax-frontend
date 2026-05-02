"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  FileText,
  RefreshCcw,
  Rss,
  Tags,
  Waves,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

type AlertItem = {
  id: string;
  card_id: string;
  type: "analysis" | "feed" | "narrative" | "topic" | "signal";
  card_type: string;
  title: string;
  summary: string;
  source?: string;
  topic?: string;
  priority_label: string;
  priority_score: number;
  is_read: boolean;
  created_at?: string;
  href: string;
  external_url?: string;
  narrative_signal?: string;
};

const alertIcons = {
  analysis: FileText,
  feed: Rss,
  narrative: Waves,
  topic: Tags,
  signal: Bell,
};

function notifyAlertStateChanged() {
  window.dispatchEvent(new Event("parallax:alerts-updated"));
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

export function NotificationsClient() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadLabel = useMemo(() => {
    if (unreadCount === 0) return "No unread alerts";
    return `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`;
  }, [unreadCount]);

  async function load() {
    setError("");

    try {
      const data = await apiGet("/api/v1/alerts?limit=50");
      setAlerts(data.alerts || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err: any) {
      setError(err?.message || "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(alertId: string) {
    const previousAlerts = alerts;
    const previousUnreadCount = unreadCount;

    setAlerts((current) =>
      current.map((alert) =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await apiPost(`/api/v1/alerts/${alertId}/read`, {});
      notifyAlertStateChanged();
    } catch (err: any) {
      setAlerts(previousAlerts);
      setUnreadCount(previousUnreadCount);
      setError(err?.message || "Could not update alert.");
    }
  }

  async function markAllRead() {
    const previousAlerts = alerts;
    const previousUnreadCount = unreadCount;

    setIsMarkingAll(true);
    setAlerts((current) =>
      current.map((alert) => ({ ...alert, is_read: true }))
    );
    setUnreadCount(0);

    try {
      await apiPost("/api/v1/alerts/read-all", {});
      notifyAlertStateChanged();
    } catch (err: any) {
      setAlerts(previousAlerts);
      setUnreadCount(previousUnreadCount);
      setError(err?.message || "Could not update alerts.");
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Alerts
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-slate-600">{unreadLabel}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Refresh alerts"
              title="Refresh alerts"
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0 || isMarkingAll}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Mark all alerts read"
              title="Mark all read"
            >
              <CheckCheck aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <Bell aria-hidden="true" className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold text-slate-950">
            No alerts yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Topic monitors, synced feeds, and high-priority analyses will appear here.
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Open feed
          </a>
        </section>
      ) : (
        <section className="space-y-3">
          {alerts.map((alert) => {
            const Icon = alertIcons[alert.type] || Bell;
            const createdAt = formatDate(alert.created_at);

            return (
              <article
                key={alert.id}
                className={`rounded-lg border bg-white p-4 ${
                  alert.is_read ? "border-slate-200" : "border-amber-300"
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {alert.priority_label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {alert.card_type}
                      </span>
                      {!alert.is_read && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          New
                        </span>
                      )}
                      {createdAt && (
                        <span className="text-xs text-slate-400">{createdAt}</span>
                      )}
                    </div>

                    <a href={alert.href} className="mt-3 block">
                      <h2 className="text-base font-semibold leading-6 text-slate-950">
                        {alert.title}
                      </h2>
                    </a>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {alert.summary}
                    </p>

                    {alert.narrative_signal && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                        {alert.narrative_signal}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        href={alert.href}
                        className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Open
                      </a>
                      {alert.external_url && (
                        <a
                          href={alert.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          Source
                          <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        </a>
                      )}
                      {!alert.is_read && (
                        <button
                          onClick={() => markRead(alert.id)}
                          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
