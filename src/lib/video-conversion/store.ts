import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import {
  MediaConversionError,
  convertVideoToAudio,
  probeMedia,
  type ConvertVideoToAudioOptionsType,
  type MediaProbeResultType,
} from "@/lib/video-conversion/ffmpeg";
import type { UploadContentRangeType } from "@/lib/video-conversion/http-ranges";
import {
  VIDEO_UPLOAD_CHUNK_SIZE_BYTES,
  type CreateVideoJobInputType,
  type VideoJobPublicType,
  type VideoJobStatusType,
} from "@/types/video-conversion";

const DEFAULT_MAX_LIVE_JOBS = 10;
const DEFAULT_MAX_RESERVED_INPUT_BYTES = 24 * 1024 * 1024 * 1024;
const DEFAULT_JOB_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_DISK_SAFETY_BYTES = 512 * 1024 * 1024;
const DEFAULT_CONVERSION_CONCURRENCY = 1;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

type InternalVideoJobType = CreateVideoJobInputType & {
  id: string;
  extension: string;
  directoryPath: string;
  inputPath: string;
  outputPath: string;
  receivedBytes: number;
  status: VideoJobStatusType;
  uploadProgress: number;
  conversionProgress: number;
  createdAtMs: number;
  expiresAtMs: number;
  durationSeconds?: number;
  outputSize?: number;
  errorCode?: string;
  errorMessage?: string;
  isWriting: boolean;
  isFinalizing: boolean;
  cancelController: AbortController;
  activeWrite?: Promise<WriteChunkResultType>;
  activeConversion?: Promise<void>;
};

type VideoConversionStoreOptionsType = {
  tempRoot?: string;
  maxLiveJobs?: number;
  maxReservedInputBytes?: number;
  ttlMs?: number;
  diskSafetyBytes?: number;
  conversionConcurrency?: number;
  startCleanupTimer?: boolean;
  getAvailableDiskBytes?: (path: string) => Promise<number>;
  probe?: (inputPath: string) => Promise<MediaProbeResultType>;
  convert?: (options: ConvertVideoToAudioOptionsType) => Promise<void>;
  now?: () => number;
  createId?: () => string;
};

type WriteChunkResultType = {
  receivedBytes: number;
  duplicate: boolean;
};

export type VideoDownloadFileType = {
  path: string;
  fileName: string;
  contentType: "audio/mpeg" | "audio/mp4";
  size: number;
};

export class VideoConversionStoreError extends Error {
  readonly code: string;
  readonly status: number;
  readonly currentOffset?: number;

  constructor(
    code: string,
    message: string,
    status = 400,
    currentOffset?: number
  ) {
    super(message);
    this.name = "VideoConversionStoreError";
    this.code = code;
    this.status = status;
    this.currentOffset = currentOffset;
  }
}

export type VideoConversionStoreType = {
  createJob(input: CreateVideoJobInputType): Promise<VideoJobPublicType>;
  getPublicJob(jobId: string): VideoJobPublicType;
  writeChunk(
    jobId: string,
    range: UploadContentRangeType,
    body: ReadableStream<Uint8Array>
  ): Promise<WriteChunkResultType>;
  finalizeJob(jobId: string): Promise<VideoJobPublicType>;
  cancelJob(jobId: string): Promise<void>;
  getDownloadFile(jobId: string): Promise<VideoDownloadFileType>;
  cleanupExpiredJobs(atTime?: number): Promise<void>;
  dispose(): Promise<void>;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : fallback;
};

const defaultAvailableDiskBytes = async (path: string) => {
  await mkdir(path, { recursive: true });
  const fileSystem = await statfs(path);
  return Number(fileSystem.bavail) * Number(fileSystem.bsize);
};

const getSafeError = (error: unknown) => {
  if (error instanceof VideoConversionStoreError) return error;
  if (error instanceof MediaConversionError) {
    const messages: Record<string, string> = {
      NO_AUDIO_STREAM: "The uploaded video does not contain an audio stream",
      FFPROBE_UNAVAILABLE: "FFprobe is unavailable on the server",
      MEDIA_PROBE_FAILED: "The uploaded media could not be inspected",
      FFMPEG_UNAVAILABLE: "FFmpeg is unavailable on the server",
      CONVERSION_FAILED: "The audio conversion failed",
    };
    return new VideoConversionStoreError(
      error.code,
      messages[error.code] || "Media processing failed",
      422
    );
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new VideoConversionStoreError(
      "CONVERSION_CANCELLED",
      "Video conversion was cancelled",
      409
    );
  }
  return new VideoConversionStoreError(
    "CONVERSION_FAILED",
    "The audio conversion failed",
    500
  );
};

const sanitizeDownloadBaseName = (fileName: string) => {
  const extension = extname(fileName);
  const rawBaseName = basename(fileName, extension);
  const sanitized = rawBaseName
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return sanitized || "converted-audio";
};

export const createVideoConversionStore = (
  options: VideoConversionStoreOptionsType = {}
): VideoConversionStoreType => {
  const tempRoot =
    options.tempRoot ||
    process.env.MEDIA_TEMP_DIR ||
    join(tmpdir(), "webp-playground-video");
  const maxLiveJobs =
    options.maxLiveJobs ??
    parsePositiveInteger(
      process.env.MEDIA_MAX_LIVE_JOBS,
      DEFAULT_MAX_LIVE_JOBS,
      100
    );
  const maxReservedInputBytes =
    options.maxReservedInputBytes ??
    parsePositiveInteger(
      process.env.MEDIA_MAX_RESERVED_INPUT_BYTES,
      DEFAULT_MAX_RESERVED_INPUT_BYTES
    );
  const ttlMs =
    options.ttlMs ??
    parsePositiveInteger(process.env.MEDIA_JOB_TTL_MS, DEFAULT_JOB_TTL_MS);
  const diskSafetyBytes =
    options.diskSafetyBytes ??
    parsePositiveInteger(
      process.env.MEDIA_DISK_SAFETY_BYTES,
      DEFAULT_DISK_SAFETY_BYTES
    );
  const conversionConcurrency =
    options.conversionConcurrency ??
    parsePositiveInteger(
      process.env.MEDIA_CONVERSION_CONCURRENCY,
      DEFAULT_CONVERSION_CONCURRENCY,
      4
    );
  const getAvailableDiskBytes =
    options.getAvailableDiskBytes || defaultAvailableDiskBytes;
  const probe = options.probe || probeMedia;
  const convert = options.convert || convertVideoToAudio;
  const now = options.now || Date.now;
  const createId = options.createId || randomUUID;

  const jobs = new Map<string, InternalVideoJobType>();
  const queuedJobIds: string[] = [];
  let activeConversionCount = 0;
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;
  let disposed = false;

  const requireJob = (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) {
      throw new VideoConversionStoreError(
        "JOB_NOT_FOUND",
        "Video conversion job was not found",
        404
      );
    }
    return job;
  };

  const toPublicJob = (job: InternalVideoJobType): VideoJobPublicType => ({
    id: job.id,
    fileName: job.fileName,
    fileSize: job.fileSize,
    contentType: job.contentType,
    outputFormat: job.outputFormat,
    bitrateKbps: job.bitrateKbps,
    receivedBytes: job.receivedBytes,
    status: job.status,
    uploadProgress: job.uploadProgress,
    conversionProgress: job.conversionProgress,
    createdAt: new Date(job.createdAtMs).toISOString(),
    expiresAt: new Date(job.expiresAtMs).toISOString(),
    ...(job.durationSeconds !== undefined
      ? { durationSeconds: job.durationSeconds }
      : {}),
    ...(job.outputSize !== undefined ? { outputSize: job.outputSize } : {}),
    ...(job.errorCode ? { errorCode: job.errorCode } : {}),
    ...(job.errorMessage ? { errorMessage: job.errorMessage } : {}),
    ...(job.status === "completed"
      ? { downloadUrl: `/api/video-to-audio/jobs/${job.id}/download` }
      : {}),
  });

  const reservedInputBytes = () =>
    Array.from(jobs.values()).reduce((total, job) => {
      return ["uploading", "queued", "processing"].includes(job.status)
        ? total + job.fileSize
        : total;
    }, 0);

  const removeJobFiles = async (job: InternalVideoJobType) => {
    await rm(job.directoryPath, { recursive: true, force: true });
  };

  const failJob = async (
    job: InternalVideoJobType,
    error: VideoConversionStoreError
  ) => {
    job.status = "failed";
    job.errorCode = error.code;
    job.errorMessage = error.message;
    job.expiresAtMs = now() + ttlMs;
    await removeJobFiles(job);
  };

  const processQueue = () => {
    if (disposed) return;

    while (
      activeConversionCount < conversionConcurrency &&
      queuedJobIds.length > 0
    ) {
      const jobId = queuedJobIds.shift();
      const job = jobId ? jobs.get(jobId) : undefined;
      if (!job || job.status !== "queued") continue;

      activeConversionCount += 1;
      job.status = "processing";
      job.conversionProgress = 0;

      const conversionPromise = (async () => {
        try {
          await convert({
            inputPath: job.inputPath,
            outputPath: job.outputPath,
            outputFormat: job.outputFormat,
            bitrateKbps: job.bitrateKbps,
            durationSeconds: job.durationSeconds || 0,
            signal: job.cancelController.signal,
            onProgress: (progress) => {
              if (job.status === "processing") {
                job.conversionProgress = Math.min(
                  100,
                  Math.max(job.conversionProgress, progress)
                );
              }
            },
          });

          if (job.status === "cancelled") return;

          const outputInfo = await stat(job.outputPath);
          await rm(job.inputPath, { force: true });
          job.outputSize = outputInfo.size;
          job.conversionProgress = 100;
          job.status = "completed";
          job.expiresAtMs = now() + ttlMs;
        } catch (error) {
          if (job.status !== "cancelled") {
            await failJob(job, getSafeError(error));
          }
        } finally {
          activeConversionCount = Math.max(0, activeConversionCount - 1);
          job.activeConversion = undefined;
          queueMicrotask(processQueue);
        }
      })();

      job.activeConversion = conversionPromise;
    }
  };

  const createJob = async (input: CreateVideoJobInputType) => {
    if (disposed) {
      throw new VideoConversionStoreError(
        "STORE_UNAVAILABLE",
        "Video conversion service is unavailable",
        503
      );
    }

    await cleanupExpiredJobs(now());

    if (jobs.size >= maxLiveJobs) {
      throw new VideoConversionStoreError(
        "MEDIA_QUEUE_FULL",
        "Too many video jobs are active",
        429
      );
    }
    if (reservedInputBytes() + input.fileSize > maxReservedInputBytes) {
      throw new VideoConversionStoreError(
        "MEDIA_STORAGE_BUDGET_EXCEEDED",
        "The server upload budget is currently full",
        429
      );
    }

    await mkdir(tempRoot, { recursive: true });
    const availableBytes = await getAvailableDiskBytes(tempRoot);
    if (availableBytes < input.fileSize + diskSafetyBytes) {
      throw new VideoConversionStoreError(
        "INSUFFICIENT_DISK_SPACE",
        "The server does not have enough temporary disk space",
        507
      );
    }

    const id = createId();
    const extension = extname(input.fileName).slice(1).toLowerCase();
    const directoryPath = join(tempRoot, id);
    const inputPath = join(directoryPath, `input.${extension}`);
    const outputPath = join(directoryPath, `output.${input.outputFormat}`);
    await mkdir(directoryPath, { recursive: false });
    await writeFile(inputPath, new Uint8Array(), { flag: "wx" });

    const createdAtMs = now();
    const job: InternalVideoJobType = {
      ...input,
      id,
      extension,
      directoryPath,
      inputPath,
      outputPath,
      receivedBytes: 0,
      status: "uploading",
      uploadProgress: 0,
      conversionProgress: 0,
      createdAtMs,
      expiresAtMs: createdAtMs + ttlMs,
      isWriting: false,
      isFinalizing: false,
      cancelController: new AbortController(),
    };
    jobs.set(id, job);
    return toPublicJob(job);
  };

  const writeChunk = async (
    jobId: string,
    range: UploadContentRangeType,
    body: ReadableStream<Uint8Array>
  ): Promise<WriteChunkResultType> => {
    const job = requireJob(jobId);
    if (job.status !== "uploading") {
      throw new VideoConversionStoreError(
        "UPLOAD_NOT_ACTIVE",
        "This job is no longer accepting upload data",
        409,
        job.receivedBytes
      );
    }
    if (range.total !== job.fileSize) {
      throw new VideoConversionStoreError(
        "UPLOAD_SIZE_MISMATCH",
        "Content-Range total does not match the declared file size",
        409,
        job.receivedBytes
      );
    }
    if (range.length > VIDEO_UPLOAD_CHUNK_SIZE_BYTES) {
      throw new VideoConversionStoreError(
        "UPLOAD_CHUNK_TOO_LARGE",
        "Upload chunk exceeds the 16 MiB limit",
        413,
        job.receivedBytes
      );
    }
    if (range.start < job.receivedBytes) {
      if (range.end < job.receivedBytes) {
        return { receivedBytes: job.receivedBytes, duplicate: true };
      }
      throw new VideoConversionStoreError(
        "UPLOAD_OFFSET_MISMATCH",
        "Upload range overlaps data already received",
        409,
        job.receivedBytes
      );
    }
    if (range.start !== job.receivedBytes) {
      throw new VideoConversionStoreError(
        "UPLOAD_OFFSET_MISMATCH",
        "Upload chunk does not begin at the current offset",
        409,
        job.receivedBytes
      );
    }
    if (range.end >= job.fileSize) {
      throw new VideoConversionStoreError(
        "UPLOAD_EXCEEDS_DECLARED_SIZE",
        "Upload chunk exceeds the declared file size",
        413,
        job.receivedBytes
      );
    }
    if (job.isWriting) {
      throw new VideoConversionStoreError(
        "UPLOAD_IN_PROGRESS",
        "Another chunk is currently being written",
        409,
        job.receivedBytes
      );
    }

    const originalOffset = job.receivedBytes;
    job.isWriting = true;

    const writePromise = (async () => {
      const fileHandle = await open(job.inputPath, "r+");
      const reader = body.getReader();
      let totalWritten = 0;

      try {
        while (true) {
          if (job.cancelController.signal.aborted) {
            const error = new Error("Upload cancelled");
            error.name = "AbortError";
            throw error;
          }

          const { done, value } = await reader.read();
          if (done) break;
          if (!value || value.byteLength === 0) continue;
          if (totalWritten + value.byteLength > range.length) {
            throw new VideoConversionStoreError(
              "UPLOAD_LENGTH_MISMATCH",
              "Upload body is larger than its declared range",
              400,
              originalOffset
            );
          }

          let chunkOffset = 0;
          while (chunkOffset < value.byteLength) {
            const { bytesWritten } = await fileHandle.write(
              value,
              chunkOffset,
              value.byteLength - chunkOffset,
              originalOffset + totalWritten + chunkOffset
            );
            if (bytesWritten <= 0) {
              throw new Error("Unable to write upload bytes");
            }
            chunkOffset += bytesWritten;
          }
          totalWritten += value.byteLength;
        }

        if (totalWritten !== range.length) {
          throw new VideoConversionStoreError(
            "UPLOAD_LENGTH_MISMATCH",
            "Upload body length does not match its declared range",
            400,
            originalOffset
          );
        }

        job.receivedBytes = originalOffset + totalWritten;
        job.uploadProgress = (job.receivedBytes / job.fileSize) * 100;
        job.expiresAtMs = now() + ttlMs;
        return { receivedBytes: job.receivedBytes, duplicate: false };
      } catch (error) {
        await fileHandle.truncate(originalOffset);
        job.receivedBytes = originalOffset;
        job.uploadProgress = (originalOffset / job.fileSize) * 100;

        if (error instanceof VideoConversionStoreError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new VideoConversionStoreError(
            "UPLOAD_CANCELLED",
            "Video upload was cancelled",
            409,
            originalOffset
          );
        }
        throw new VideoConversionStoreError(
          "UPLOAD_WRITE_FAILED",
          "The upload chunk could not be saved",
          500,
          originalOffset
        );
      } finally {
        reader.releaseLock();
        await fileHandle.close();
      }
    })();

    job.activeWrite = writePromise;
    try {
      return await writePromise;
    } finally {
      if (job.activeWrite === writePromise) job.activeWrite = undefined;
      job.isWriting = false;
    }
  };

  const finalizeJob = async (jobId: string) => {
    const job = requireJob(jobId);
    if (["queued", "processing", "completed"].includes(job.status)) {
      return toPublicJob(job);
    }
    if (job.status !== "uploading") {
      throw new VideoConversionStoreError(
        "JOB_NOT_FINALIZABLE",
        "This job cannot be finalized",
        409
      );
    }
    if (job.isFinalizing) {
      throw new VideoConversionStoreError(
        "JOB_FINALIZING",
        "This upload is already being finalized",
        409
      );
    }
    if (job.receivedBytes !== job.fileSize) {
      throw new VideoConversionStoreError(
        "UPLOAD_INCOMPLETE",
        "Upload must finish before conversion can start",
        409,
        job.receivedBytes
      );
    }

    job.isFinalizing = true;
    try {
      const media = await probe(job.inputPath);
      const estimatedOutputBytes = Math.ceil(
        (media.durationSeconds * job.bitrateKbps * 1_000 * 1.1) / 8
      );
      const availableBytes = await getAvailableDiskBytes(tempRoot);
      if (availableBytes < estimatedOutputBytes + diskSafetyBytes) {
        throw new VideoConversionStoreError(
          "INSUFFICIENT_DISK_SPACE",
          "The server does not have enough space for the output file",
          507
        );
      }

      job.durationSeconds = media.durationSeconds;
      job.status = "queued";
      job.expiresAtMs = now() + ttlMs;
      queuedJobIds.push(job.id);
      queueMicrotask(processQueue);
      return toPublicJob(job);
    } catch (error) {
      const safeError = getSafeError(error);
      await failJob(job, safeError);
      throw safeError;
    } finally {
      job.isFinalizing = false;
    }
  };

  const cancelJob = async (jobId: string) => {
    const job = jobs.get(jobId);
    if (!job) return;
    if (job.status === "cancelled") return;

    job.status = "cancelled";
    job.errorCode = undefined;
    job.errorMessage = undefined;
    job.expiresAtMs = now() + ttlMs;
    job.cancelController.abort();

    for (let index = queuedJobIds.length - 1; index >= 0; index -= 1) {
      if (queuedJobIds[index] === jobId) queuedJobIds.splice(index, 1);
    }

    await job.activeWrite?.catch(() => undefined);
    await job.activeConversion?.catch(() => undefined);
    await removeJobFiles(job);
  };

  const getDownloadFile = async (jobId: string) => {
    const job = requireJob(jobId);
    if (job.status !== "completed" || job.outputSize === undefined) {
      throw new VideoConversionStoreError(
        "OUTPUT_NOT_READY",
        "Converted audio is not ready for download",
        409
      );
    }

    const outputInfo = await stat(job.outputPath).catch(() => null);
    if (!outputInfo?.isFile()) {
      throw new VideoConversionStoreError(
        "OUTPUT_NOT_FOUND",
        "Converted audio file is no longer available",
        410
      );
    }

    return {
      path: job.outputPath,
      fileName: `${sanitizeDownloadBaseName(job.fileName)}.${job.outputFormat}`,
      contentType:
        job.outputFormat === "mp3"
          ? ("audio/mpeg" as const)
          : ("audio/mp4" as const),
      size: outputInfo.size,
    };
  };

  async function cleanupExpiredJobs(atTime = now()) {
    const expiredJobs = Array.from(jobs.values()).filter(
      (job) => job.expiresAtMs <= atTime
    );
    for (const job of expiredJobs) {
      await cancelJob(job.id);
      await removeJobFiles(job);
      jobs.delete(job.id);
    }
  }

  const dispose = async () => {
    if (cleanupTimer) clearInterval(cleanupTimer);
    disposed = true;
    await Promise.all(Array.from(jobs.keys()).map((jobId) => cancelJob(jobId)));
    jobs.clear();
  };

  if (options.startCleanupTimer !== false) {
    cleanupTimer = setInterval(() => {
      void cleanupExpiredJobs();
    }, CLEANUP_INTERVAL_MS);
    cleanupTimer.unref?.();
  }

  return {
    createJob,
    getPublicJob: (jobId) => toPublicJob(requireJob(jobId)),
    writeChunk,
    finalizeJob,
    cancelJob,
    getDownloadFile,
    cleanupExpiredJobs,
    dispose,
  };
};

type GlobalVideoStoreType = typeof globalThis & {
  __webpPlaygroundVideoConversionStore?: VideoConversionStoreType;
};

const globalVideoStore = globalThis as GlobalVideoStoreType;

export const videoConversionStore =
  globalVideoStore.__webpPlaygroundVideoConversionStore ||
  createVideoConversionStore();

globalVideoStore.__webpPlaygroundVideoConversionStore = videoConversionStore;
