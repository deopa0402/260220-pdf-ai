export function dataUrlToInlineData(dataUrl: string): { data: string; mimeType: string } | null {
  const [header, data] = dataUrl.split(",");
  if (!header || !data) return null;
  const mimeMatch = header.match(/^data:(.*?);base64$/);
  if (!mimeMatch) return null;
  return { data, mimeType: mimeMatch[1] };
}

export function looksLikeImageRequest(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return false;
  return [
    /이미지\S*\s*(생성|만들|그려|제작)/i,
    /그림\S*\s*(생성|만들|그려|제작)/i,
    /(create|generate|draw|make)\s+(an?\s+)?(image|picture|infographic)/i,
    /(image|picture|infographic)\s+(create|generate|draw|make)/i,
  ].some((pattern) => pattern.test(normalized));
}
