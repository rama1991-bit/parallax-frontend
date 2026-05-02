import {
  Bookmark,
  Columns3,
  Rss,
  Settings2,
  ShieldCheck,
} from "lucide-react";

const links = [
  { href: "/compare", label: "Compare", Icon: Columns3 },
  { href: "/feeds", label: "Feeds", Icon: Rss },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/onboarding", label: "Setup", Icon: Settings2 },
  { href: "/notifications", label: "Alerts", Icon: ShieldCheck },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 pb-24 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Navigation
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">More</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-slate-700"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <link.Icon aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="font-medium text-slate-950">{link.label}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
