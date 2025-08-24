// Core conversion types for the multi-format image converter

export type SupportedFormatType =
  | "jpeg"
  | "png"
  | "webp"
  | "avif";

export type ConversionSettingsType = {
  format: SupportedFormatType;
  quality: number; // 1-100 for lossy formats
  lossless?: boolean; // For WebP and AVIF
  nearLossless?: number; // For WebP lossless (0-100, 100 = true lossless)
  compressionLevel?: number; // For PNG (0-9)
  progressive?: boolean; // For JPEG
  interlace?: boolean; // For PNG
  chromaSubsampling?: "4:4:4" | "4:2:2" | "4:2:0" | "auto"; // For JPEG
  mozjpeg?: boolean; // For JPEG - use mozjpeg encoder
  speed?: number; // For AVIF (0-10, 0=slowest/best, 10=fastest)
  effort?: number; // For WebP and AVIF (0-10)
  alphaQuality?: number; // For WebP with alpha channel (0-100)
  smartSubsample?: boolean; // For WebP
  preset?: "default" | "photo" | "picture" | "drawing" | "icon" | "text"; // For WebP
  palette?: boolean; // For PNG - quantize to palette
  colors?: number; // For PNG palette (2-256)
  dithering?: number; // For PNG palette (0-1)
  useServer?: boolean; // Use server-side conversion for better compression
};

export type ConversionJobType = {
  id: string;
  file: File;
  settings: ConversionSettingsType;
  onProgress: (progress: number, message?: string) => void;
  onComplete: (result: ConversionResultType) => void;
  onError: (error: Error) => void;
};

export type ConversionStateType = {
  isProcessing: boolean;
  progress: number;
  results: Map<string, Blob>;
  errors: Map<string, Error>;
};

export type ConversionResultType = {
  originalFile: File;
  convertedBlob: Blob;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  format: SupportedFormatType;
};
