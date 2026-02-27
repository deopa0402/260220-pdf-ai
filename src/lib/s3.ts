import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_S3_REGION || process.env.AWS_DEFAULT_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_IMAGE_BUCKET;
const explicitEndpoint = process.env.AWS_S3_ENDPOINT;

let s3Client: S3Client | null = null;
let redirectedClient: S3Client | null = null;

function buildClient(options?: { endpoint?: string; region?: string }): S3Client {
  return new S3Client({
    region: options?.region || region,
    endpoint: options?.endpoint,
    credentials: {
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
    },
  });
}

function normalizeEndpoint(endpoint: string, bucketName: string): string {
  const host = endpoint
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(new RegExp(`^${bucketName}\\.`), "");
  return `https://${host}`;
}

function extractRedirectEndpoint(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const endpoint = (error as { Endpoint?: unknown }).Endpoint;
  if (typeof endpoint !== "string" || !endpoint.trim()) return null;
  return endpoint;
}

function inferRegionFromEndpoint(endpoint: string): string | null {
  const host = endpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const match = host.match(/s3[.-]([a-z0-9-]+)\./i);
  return match?.[1] ?? null;
}

function isPermanentRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { Code?: unknown }).Code;
  const name = (error as { name?: unknown }).name;
  return code === "PermanentRedirect" || name === "PermanentRedirect";
}

async function sendWithS3Client<T>(
  executor: (client: S3Client) => Promise<T>
): Promise<T> {
  const primaryClient = getS3Client();
  try {
    return await executor(primaryClient);
  } catch (error) {
    if (!isPermanentRedirectError(error)) throw error;

    const endpoint = extractRedirectEndpoint(error);
    if (!endpoint || !bucket) throw error;

    const normalizedEndpoint = normalizeEndpoint(endpoint, bucket);
    const redirectRegion = inferRegionFromEndpoint(normalizedEndpoint) || region;

    if (!redirectedClient) {
      redirectedClient = buildClient({
        endpoint: normalizedEndpoint,
        region: redirectRegion || undefined,
      });
    }

    return await executor(redirectedClient);
  }
}

function getS3Client(): S3Client {
  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("S3 환경변수가 누락되었습니다.");
  }
  if (!s3Client) {
    s3Client = buildClient({ endpoint: explicitEndpoint || undefined });
  }
  return s3Client;
}

export function getS3BucketName(): string {
  if (!bucket) throw new Error("AWS_IMAGE_BUCKET 환경변수가 누락되었습니다.");
  return bucket;
}

export async function uploadPdfBase64ToS3(params: {
  sessionId: string;
  pdfBase64: string;
}): Promise<string> {
  const objectKey = `shared-sessions/${params.sessionId}/source.pdf`;
  const body = Buffer.from(params.pdfBase64, "base64");

  await sendWithS3Client((client) =>
    client.send(
      new PutObjectCommand({
        Bucket: getS3BucketName(),
        Key: objectKey,
        Body: body,
        ContentType: "application/pdf",
      })
    )
  );

  return objectKey;
}

export async function getPdfBase64FromS3(objectKey: string): Promise<string> {
  const result = await sendWithS3Client((client) =>
    client.send(
      new GetObjectCommand({
        Bucket: getS3BucketName(),
        Key: objectKey,
      })
    )
  );

  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error("S3 PDF 파일을 읽을 수 없습니다.");
  return Buffer.from(bytes).toString("base64");
}
