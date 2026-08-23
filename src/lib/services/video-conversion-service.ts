import { validateCreateVideoJobInput } from "@/lib/video-conversion/validation";
import type {
  VideoConversionApiErrorType,
  VideoConversionSettingsType,
  VideoJobPublicType,
} from "@/types/video-conversion";

const VIDEO_JOBS_ENDPOINT = "/api/video-to-audio/jobs";
const MAX_CHUNK_ATTEMPTS = 4;
const CHUNK_RETRY_DELAYS_MS = [500, 1_000, 2_000] as const;

type FetchType = typeof fetch;
type SleepType = (milliseconds: number, signal?: AbortSignal) => Promise<void>;

type VideoConversionServiceOptionsType = {
  fetcher?: FetchType;
  sleep?: SleepType;
  pollIntervalMs?: number;
};

export type ConvertVideoFileOptionsType = VideoConversionSettingsType & {
  signal?: AbortSignal;
  onJobUpdate?: (job: VideoJobPublicType) => void;
};

type CreateJobResponseType = {
  job: VideoJobPublicType;
  chunkSize: number;
  currentOffset: number;
};

type UploadChunkResponseType = {
  receivedBytes: number;
  duplicate: boolean;
  job: VideoJobPublicType;
};

export class VideoConversionClientError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly currentOffset?: number;

  constructor(
    message: string,
    code: string,
    options: { status?: number; currentOffset?: number } = {}
  ) {
    super(message);
    this.name = "VideoConversionClientError";
    this.code = code;
    this.status = options.status;
    this.currentOffset = options.currentOffset;
  }
}

const createAbortError = () => {
  const error = new Error("Video conversion was cancelled");
  error.name = "AbortError";
  return error;
};

const defaultSleep: SleepType = (milliseconds, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const handleAbort = () => {
      clearTimeout(timeout);
      reject(createAbortError());
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

export class VideoConversionService {
  private readonly fetcher: FetchType;
  private readonly sleep: SleepType;
  private readonly pollIntervalMs: number;

  constructor(options: VideoConversionServiceOptionsType = {}) {
    const fetcher = options.fetcher || fetch;
    this.fetcher = (input, init) => fetcher(input, init);
    this.sleep = options.sleep || defaultSleep;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
  }

  async convert(
    file: File,
    options: ConvertVideoFileOptionsType
  ): Promise<VideoJobPublicType> {
    if (options.signal?.aborted) throw createAbortError();

    const validation = validateCreateVideoJobInput({
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      outputFormat: options.outputFormat,
      bitrateKbps: options.bitrateKbps,
    });
    if (!validation.ok) {
      throw new VideoConversionClientError(
        validation.message,
        validation.code
      );
    }

    const created = await this.requestJson<CreateJobResponseType>(
      VIDEO_JOBS_ENDPOINT,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
        signal: options.signal,
      }
    );
    this.assertCreateResponse(created, file.size);
    options.onJobUpdate?.(created.job);

    let offset = created.currentOffset;
    while (offset < file.size) {
      if (options.signal?.aborted) throw createAbortError();

      const chunkEndExclusive = Math.min(offset + created.chunkSize, file.size);
      const chunk = file.slice(offset, chunkEndExclusive);
      const contentRange = `bytes ${offset}-${chunkEndExclusive - 1}/${file.size}`;

      try {
        const uploaded = await this.uploadChunkWithRetry(
          created.job.id,
          chunk,
          contentRange,
          options.signal
        );
        if (
          !Number.isSafeInteger(uploaded.receivedBytes) ||
          uploaded.receivedBytes <= offset ||
          uploaded.receivedBytes > file.size
        ) {
          throw new VideoConversionClientError(
            "Server returned an invalid upload offset",
            "INVALID_SERVER_RESPONSE"
          );
        }
        offset = uploaded.receivedBytes;
        options.onJobUpdate?.(uploaded.job);
      } catch (error) {
        if (
          error instanceof VideoConversionClientError &&
          error.status === 409 &&
          error.currentOffset !== undefined &&
          Number.isSafeInteger(error.currentOffset) &&
          error.currentOffset >= 0 &&
          error.currentOffset <= file.size &&
          error.currentOffset !== offset
        ) {
          offset = error.currentOffset;
          continue;
        }
        throw error;
      }
    }

    let job = await this.requestJson<VideoJobPublicType>(
      `${VIDEO_JOBS_ENDPOINT}/${created.job.id}`,
      { method: "POST", signal: options.signal }
    );
    options.onJobUpdate?.(job);

    while (!["completed", "failed", "cancelled"].includes(job.status)) {
      await this.sleep(this.pollIntervalMs, options.signal);
      job = await this.requestJson<VideoJobPublicType>(
        `${VIDEO_JOBS_ENDPOINT}/${created.job.id}`,
        { signal: options.signal, cache: "no-store" }
      );
      options.onJobUpdate?.(job);
    }

    if (job.status !== "completed") {
      throw new VideoConversionClientError(
        job.errorMessage ||
          (job.status === "cancelled"
            ? "Video conversion was cancelled"
            : "Video conversion failed"),
        job.errorCode ||
          (job.status === "cancelled" ? "CONVERSION_CANCELLED" : "JOB_FAILED")
      );
    }

    return job;
  }

  async cancel(jobId: string): Promise<void> {
    const response = await this.fetcher(`${VIDEO_JOBS_ENDPOINT}/${jobId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw await this.toClientError(response);
  }

  private async uploadChunkWithRetry(
    jobId: string,
    chunk: Blob,
    contentRange: string,
    signal?: AbortSignal
  ): Promise<UploadChunkResponseType> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS; attempt += 1) {
      try {
        return await this.requestJson<UploadChunkResponseType>(
          `${VIDEO_JOBS_ENDPOINT}/${jobId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Range": contentRange,
            },
            body: chunk,
            signal,
          }
        );
      } catch (error) {
        if (isAbortError(error)) throw error;
        lastError = error;

        const status =
          error instanceof VideoConversionClientError
            ? error.status
            : undefined;
        const isConflict = status === 409;
        const isTransient =
          status === 429 ||
          (typeof status === "number" && status >= 500) ||
          !(error instanceof VideoConversionClientError);

        if (isConflict || !isTransient || attempt === MAX_CHUNK_ATTEMPTS - 1) {
          throw error;
        }

        await this.sleep(CHUNK_RETRY_DELAYS_MS[attempt] || 2_000, signal);
      }
    }

    throw lastError;
  }

  private async requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(url, init);
    } catch (error) {
      if (isAbortError(error) || init?.signal?.aborted) throw createAbortError();
      throw error;
    }

    if (!response.ok) throw await this.toClientError(response);

    try {
      return (await response.json()) as T;
    } catch {
      throw new VideoConversionClientError(
        "Server returned an invalid response",
        "INVALID_SERVER_RESPONSE",
        { status: response.status }
      );
    }
  }

  private async toClientError(response: Response) {
    const payload = (await response.json().catch(() => null)) as
      | VideoConversionApiErrorType
      | null;
    return new VideoConversionClientError(
      payload?.error || "Video conversion request failed",
      payload?.code || "REQUEST_FAILED",
      {
        status: response.status,
        currentOffset: payload?.currentOffset,
      }
    );
  }

  private assertCreateResponse(
    response: CreateJobResponseType,
    fileSize: number
  ) {
    if (
      !response?.job?.id ||
      !Number.isSafeInteger(response.chunkSize) ||
      response.chunkSize <= 0 ||
      !Number.isSafeInteger(response.currentOffset) ||
      response.currentOffset < 0 ||
      response.currentOffset > fileSize
    ) {
      throw new VideoConversionClientError(
        "Server returned invalid upload settings",
        "INVALID_SERVER_RESPONSE"
      );
    }
  }
}

export const videoConversionService = new VideoConversionService();
