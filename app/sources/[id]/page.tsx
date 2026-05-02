import { SourceDetailClient } from "@/components/sources/SourceDetailClient";

export default function Page({ params }: { params: { id: string } }) {
  return <SourceDetailClient sourceId={decodeURIComponent(params.id)} />;
}
