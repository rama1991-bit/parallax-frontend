import { ReportDetailClient } from "@/components/reports/ReportDetailClient";

export default function ReportPage({ params }: { params: { id: string } }) {
  return <ReportDetailClient reportId={params.id} />;
}
