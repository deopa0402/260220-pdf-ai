import { ShareSessionClient } from "./ShareSessionClient";

interface PageProps {
  params: Promise<{ publicId: string }>;
}

export default async function SharedSessionPage({ params }: PageProps) {
  const { publicId } = await params;
  return <ShareSessionClient publicId={publicId} />;
}
