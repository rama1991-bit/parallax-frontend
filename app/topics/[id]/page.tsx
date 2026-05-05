import { TopicDetailClient } from "@/components/topics/TopicDetailClient";

export default function TopicDetailPage({ params }: { params: { id: string } }) {
  return <TopicDetailClient topicId={params.id} />;
}
