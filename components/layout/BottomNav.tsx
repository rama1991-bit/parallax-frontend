"use client";

const items = [
  { href: "/", label: "Feed", icon: "◇" },
  { href: "/topics", label: "Topics", icon: "◎" },
  { href: "/compare", label: "Compare", icon: "⇄" },
  { href: "/notifications", label: "Alerts", icon: "!" },
  { href: "/briefs", label: "Briefs", icon: "□" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {items.map((item) => (
          <a key={item.href} href={item.href} className="flex flex-col items-center gap-1 px-2 py-2 text-xs text-slate-600">
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
