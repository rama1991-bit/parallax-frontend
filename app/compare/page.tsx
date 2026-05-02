import { Suspense } from "react";
import { CompareClient } from "@/components/compare/CompareClient";

export default function ComparePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl p-4 text-sm text-slate-500">Loading compare...</main>}>
      <CompareClient />
    </Suspense>
  );
}
