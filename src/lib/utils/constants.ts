// Constants for the multi-format image converter

import type { SupportedFormatType, FileValidationRulesType } from "@/types";

// Supported image formats
export const SUPPORTED_FORMATS: SupportedFormatType[] = [
  "jpeg",
  "png",
  "webp",
  "avif",
];

// MIME type mappings
export const MIME_TYPE_MAP: Record<SupportedFormatType, string[]> = {
  jpeg: ["image/jpeg", "image/jpg"],
  png: ["image/png"],
  webp: ["image/webp"],
  avif: ["image/avif"],
};

// File extension mappings
export const EXTENSION_MAP: Record<SupportedFormatType, string[]> = {
  jpeg: [".jpg", ".jpeg"],
  png: [".png"],
  webp: [".webp"],
  avif: [".avif"],
};

// Default validation rules
export const DEFAULT_VALIDATION_RULES: FileValidationRulesType = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: SUPPORTED_FORMATS,
  maxDimensions: { width: 8192, height: 8192 },
  minDimensions: { width: 1, height: 1 },
};

// Default conversion settings by format
export const DEFAULT_CONVERSION_SETTINGS = {
  jpeg: { quality: 85, progressive: true },
  png: { compressionLevel: 6 },
  webp: { quality: 80, lossless: false },
  avif: { quality: 80, speed: 6 },
  gif: { colors: 256, dithering: false },
  ico: { sizes: [16, 32, 48] },
  svg: {}, // SVG doesn't need quality settings
};

// Magic number signatures for file type detection
export const FILE_SIGNATURES: Record<string, number[]> = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header, WebP signature at offset 8
  ico: [0x00, 0x00, 0x01, 0x00],
  // SVG is text-based, detected by content
  // AVIF uses ftyp box, more complex detection needed
};

// Error messages
export const ERROR_MESSAGES = {
  UNSUPPORTED_FORMAT: "File format not supported",
  FILE_TOO_LARGE: "File size exceeds maximum limit",
  FILE_CORRUPTED: "File appears to be corrupted",
  CONVERSION_FAILED: "Image conversion failed",
  MEMORY_EXCEEDED: "Not enough memory to process file",
  BROWSER_NOT_SUPPORTED: "Browser does not support this operation",
} as const;
