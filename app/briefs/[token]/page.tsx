import { BriefDetailClient } from "@/components/briefs/BriefDetailClient";

export default function Page({ params }: { params: { token: string } }) {
  return <BriefDetailClient token={params.token} />;
}
