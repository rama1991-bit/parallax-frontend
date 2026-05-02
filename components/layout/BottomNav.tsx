"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  FileText,
  Globe2,
  LayoutList,
  MoreHorizontal,
  Tags,
} from "lucide-react";
import { apiGet } from "@/lib/api";

const items = [
  { href: "/", label: "Feed", Icon: LayoutList },
  { href: "/topics", label: "Topics", Icon: Tags },
  { href: "/sources", label: "Sources", Icon: Globe2 },
  { href: "/briefs", label: "Briefs", Icon: FileText },
  { href: "/notifications", label: "Alerts", Icon: Bell },
  { href: "/more", label: "More", Icon: MoreHorizontal },
];

export function BottomNav() {
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function refreshUnreadAlerts() {
      try {
        const data = await apiGet("/api/v1/alerts/unread-count");
        if (isMounted) {
          setUnreadAlerts(data.unread_count || 0);
        }
      } catch {
        if (isMounted) {
          setUnreadAlerts(0);
        }
      }
    }

    refreshUnreadAlerts();

    window.addEventListener("focus", refreshUnreadAlerts);
    window.addEventListener("parallax:alerts-updated", refreshUnreadAlerts);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshUnreadAlerts);
      window.removeEventListener("parallax:alerts-updated", refreshUnreadAlerts);
    };
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-6">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-xs text-slate-600"
          >
            <span className="relative">
              <item.Icon aria-hidden="true" className="h-5 w-5" />
              {item.href === "/notifications" && unreadAlerts > 0 && (
                <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                  {unreadAlerts > 99 ? "99+" : unreadAlerts}
                </span>
              )}
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
