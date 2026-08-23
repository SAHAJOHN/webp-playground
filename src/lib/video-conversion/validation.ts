import {
  AUDIO_BITRATES_KBPS,
  AUDIO_OUTPUT_FORMATS,
  MAX_VIDEO_FILE_SIZE_BYTES,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "@/types/video-conversion";
import type {
  AudioBitrateKbpsType,
  AudioOutputFormatType,
  CreateVideoJobInputType,
} from "@/types/video-conversion";

export { MAX_VIDEO_FILE_SIZE_BYTES } from "@/types/video-conversion";

type CreateVideoJobValidationResultType =
  | { ok: true; value: CreateVideoJobInputType }
  | { ok: false; code: string; message: string };

const getExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex === -1
    ? ""
    : fileName.slice(lastDotIndex + 1).toLowerCase();
};

export const validateCreateVideoJobInput = (
  input: unknown
): CreateVideoJobValidationResultType => {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Request body must be an object",
    };
  }

  const value = input as Record<string, unknown>;
  const fileName =
    typeof value.fileName === "string" ? value.fileName.trim() : "";

  if (!fileName || fileName.length > 255) {
    return {
      ok: false,
      code: "INVALID_FILE_NAME",
      message: "A valid file name is required",
    };
  }

  const extension = getExtension(fileName);
  if (!(SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      ok: false,
      code: "UNSUPPORTED_VIDEO_FORMAT",
      message: "Video format is not supported",
    };
  }

  if (
    typeof value.fileSize !== "number" ||
    !Number.isSafeInteger(value.fileSize) ||
    value.fileSize <= 0
  ) {
    return {
      ok: false,
      code: "INVALID_FILE_SIZE",
      message: "File size must be a positive safe integer",
    };
  }

  if (value.fileSize > MAX_VIDEO_FILE_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "File exceeds the 8 GiB limit",
    };
  }

  if (
    typeof value.outputFormat !== "string" ||
    !(AUDIO_OUTPUT_FORMATS as readonly string[]).includes(value.outputFormat)
  ) {
    return {
      ok: false,
      code: "INVALID_OUTPUT_FORMAT",
      message: "Output format must be MP3 or M4A",
    };
  }

  if (
    typeof value.bitrateKbps !== "number" ||
    !(AUDIO_BITRATES_KBPS as readonly number[]).includes(value.bitrateKbps)
  ) {
    return {
      ok: false,
      code: "INVALID_BITRATE",
      message: "Audio bitrate is not supported",
    };
  }

  const contentType =
    typeof value.contentType === "string" && value.contentType.length <= 255
      ? value.contentType
      : "";

  return {
    ok: true,
    value: {
      fileName,
      fileSize: value.fileSize,
      contentType,
      outputFormat: value.outputFormat as AudioOutputFormatType,
      bitrateKbps: value.bitrateKbps as AudioBitrateKbpsType,
    },
  };
};
