"use client";

const links = [
  { href: "/", label: "Feed" },
  { href: "/topics", label: "Topics" },
  { href: "/sources", label: "Sources" },
  { href: "/briefs", label: "Briefs" },
  { href: "/compare", label: "Compare" },
  { href: "/feeds", label: "Feeds" },
  { href: "/saved", label: "Saved" },
];

export function TopNav() {
  return (
    <nav className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="/" className="text-sm font-semibold text-slate-950">
          Parallax
        </a>

        <div className="flex items-center gap-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/onboarding"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          >
            Setup
          </a>
        </div>
      </div>
    </nav>
  );
}
