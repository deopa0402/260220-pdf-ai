export const QNA_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
] as const;

export type QnaModel = (typeof QNA_MODELS)[number];

export const IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
] as const;

export type ImageModel = (typeof IMAGE_MODELS)[number];

export const DEFAULT_QNA_MODEL: QnaModel = "gemini-2.5-flash";
export const DEFAULT_IMAGE_MODEL: ImageModel = "gemini-2.5-flash-image";

export const isQnaModel = (value: string): value is QnaModel =>
  QNA_MODELS.includes(value as QnaModel);

export const isImageModel = (value: string): value is ImageModel =>
  IMAGE_MODELS.includes(value as ImageModel);
