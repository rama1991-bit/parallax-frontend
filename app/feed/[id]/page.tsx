import { FeedCardDetailClient } from "@/components/feed/FeedCardDetailClient";

export default function FeedCardDetailPage({ params }: { params: { id: string } }) {
  return <FeedCardDetailClient cardId={params.id} />;
}
