// Core conversion types for the multi-format image converter

export type SupportedFormatType =
  | "jpeg"
  | "png"
  | "webp"
  | "avif";

export type ConversionSettingsType = {
  format: SupportedFormatType;
  quality: number; // 1-100 for lossy formats
  lossless?: boolean; // For WebP
  nearLossless?: number; // For WebP lossless (0-100, 100 = true lossless)
  compressionLevel?: number; // For PNG
  progressive?: boolean; // For JPEG
  speed?: number; // For AVIF (1-10)
  colors?: number; // For GIF
  dithering?: boolean; // For GIF
  sizes?: number[]; // For ICO (e.g., [16, 32, 48])
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
