export const MAX_VIDEO_FILE_SIZE_BYTES = 8 * 1024 * 1024 * 1024;
export const VIDEO_UPLOAD_CHUNK_SIZE_BYTES = 16 * 1024 * 1024;

export const AUDIO_OUTPUT_FORMATS = ["mp3", "m4a"] as const;
export type AudioOutputFormatType = (typeof AUDIO_OUTPUT_FORMATS)[number];

export const AUDIO_BITRATES_KBPS = [
  32, 48, 64, 96, 128, 160, 192, 256, 320,
] as const;
export type AudioBitrateKbpsType = (typeof AUDIO_BITRATES_KBPS)[number];

export const SUPPORTED_VIDEO_EXTENSIONS = [
  "mov",
  "mp4",
  "m4v",
  "mkv",
  "webm",
  "avi",
  "mpeg",
  "mpg",
  "ts",
  "mts",
  "m2ts",
  "3gp",
  "ogv",
] as const;
export type SupportedVideoExtensionType =
  (typeof SUPPORTED_VIDEO_EXTENSIONS)[number];

export type VideoJobStatusType =
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type CreateVideoJobInputType = {
  fileName: string;
  fileSize: number;
  contentType: string;
  outputFormat: AudioOutputFormatType;
  bitrateKbps: AudioBitrateKbpsType;
};

export type VideoConversionSettingsType = {
  outputFormat: AudioOutputFormatType;
  bitrateKbps: AudioBitrateKbpsType;
};

export type VideoJobPublicType = CreateVideoJobInputType & {
  id: string;
  receivedBytes: number;
  status: VideoJobStatusType;
  uploadProgress: number;
  conversionProgress: number;
  createdAt: string;
  expiresAt: string;
  durationSeconds?: number;
  outputSize?: number;
  errorCode?: string;
  errorMessage?: string;
  downloadUrl?: string;
};

export type VideoConversionApiErrorType = {
  error: string;
  code: string;
  details?: string;
  currentOffset?: number;
};
