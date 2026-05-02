import { ArticleDetailClient } from "@/components/articles/ArticleDetailClient";

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  return <ArticleDetailClient articleId={decodeURIComponent(params.id)} />;
}
