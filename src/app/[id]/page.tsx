import { MainApp } from "@/components/MainApp";

export default async function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <MainApp initialSessionId={resolvedParams.id} />;
}
