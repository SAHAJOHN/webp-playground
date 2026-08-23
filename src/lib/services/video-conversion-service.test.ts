import { afterEach, describe, expect, it, vi } from "vitest";
import {
  VideoConversionClientError,
  VideoConversionService,
} from "@/lib/services/video-conversion-service";
import type { VideoJobPublicType } from "@/types/video-conversion";

const makeJob = (
  status: VideoJobPublicType["status"],
  overrides: Partial<VideoJobPublicType> = {}
): VideoJobPublicType => ({
  id: "job-1",
  fileName: "clip.mov",
  fileSize: 6,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
  receivedBytes: status === "uploading" ? 0 : 6,
  status,
  uploadProgress: status === "uploading" ? 0 : 100,
  conversionProgress: status === "completed" ? 100 : 0,
  createdAt: "2026-08-23T00:00:00.000Z",
  expiresAt: "2026-08-23T06:00:00.000Z",
  ...overrides,
});

const jsonResponse = (payload: unknown, status = 200) =>
  Response.json(payload, { status });

const toRequest = (input: RequestInfo | URL, init?: RequestInit) =>
  input instanceof Request
    ? input
    : new Request(new URL(input.toString(), "http://localhost"), init);

const file = new File([Uint8Array.from([1, 2, 3, 4, 5, 6])], "clip.mov", {
  type: "video/quicktime",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VideoConversionService", () => {
  it("uploads sequential server-sized chunks and polls to completion", async () => {
    const requests: Request[] = [];
    let statusPoll = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = toRequest(input, init);
      requests.push(request);

      if (request.method === "POST" && request.url.endsWith("/jobs")) {
        return jsonResponse({
          job: makeJob("uploading"),
          chunkSize: 4,
          currentOffset: 0,
        }, 201);
      }
      if (request.method === "PATCH") {
        const range = request.headers.get("Content-Range");
        const receivedBytes = range === "bytes 0-3/6" ? 4 : 6;
        return jsonResponse({
          receivedBytes,
          duplicate: false,
          job: makeJob("uploading", {
            receivedBytes,
            uploadProgress: (receivedBytes / 6) * 100,
          }),
        });
      }
      if (request.method === "POST") {
        return jsonResponse(makeJob("queued"), 202);
      }

      statusPoll += 1;
      return jsonResponse(
        statusPoll === 1
          ? makeJob("processing", { conversionProgress: 50 })
          : makeJob("completed", {
              outputSize: 3,
              downloadUrl: "/api/video-to-audio/jobs/job-1/download",
            })
      );
    });
    const updates: string[] = [];
    const service = new VideoConversionService({
      fetcher,
      sleep: async () => undefined,
    });

    const result = await service.convert(file, {
      outputFormat: "m4a",
      bitrateKbps: 64,
      onJobUpdate: (job) => updates.push(job.status),
    });

    expect(result.status).toBe("completed");
    expect(
      requests
        .filter((request) => request.method === "PATCH")
        .map((request) => request.headers.get("Content-Range"))
    ).toEqual(["bytes 0-3/6", "bytes 4-5/6"]);
    expect(updates).toContain("processing");
    expect(updates.at(-1)).toBe("completed");
  });

  it("resumes from the authoritative server offset after a conflict", async () => {
    const ranges: string[] = [];
    let patchCount = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = toRequest(input, init);
      if (request.method === "POST" && request.url.endsWith("/jobs")) {
        return jsonResponse({
          job: makeJob("uploading"),
          chunkSize: 3,
          currentOffset: 0,
        }, 201);
      }
      if (request.method === "PATCH") {
        patchCount += 1;
        ranges.push(request.headers.get("Content-Range") || "");
        if (patchCount === 1) {
          return jsonResponse(
            {
              error: "Offset conflict",
              code: "UPLOAD_OFFSET_MISMATCH",
              currentOffset: 3,
            },
            409
          );
        }
        return jsonResponse({
          receivedBytes: 6,
          duplicate: false,
          job: makeJob("uploading", {
            receivedBytes: 6,
            uploadProgress: 100,
          }),
        });
      }
      return jsonResponse(
        makeJob("completed", {
          outputSize: 3,
          downloadUrl: "/api/video-to-audio/jobs/job-1/download",
        }),
        202
      );
    });
    const service = new VideoConversionService({
      fetcher,
      sleep: async () => undefined,
    });

    await service.convert(file, { outputFormat: "m4a", bitrateKbps: 64 });

    expect(ranges).toEqual(["bytes 0-2/6", "bytes 3-5/6"]);
  });

  it("retries transient chunk failures with bounded backoff", async () => {
    const delays: number[] = [];
    let patchCount = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = toRequest(input, init);
      if (request.method === "POST" && request.url.endsWith("/jobs")) {
        return jsonResponse({
          job: makeJob("uploading"),
          chunkSize: 6,
          currentOffset: 0,
        }, 201);
      }
      if (request.method === "PATCH") {
        patchCount += 1;
        if (patchCount === 1) {
          return jsonResponse(
            { error: "Busy", code: "MEDIA_QUEUE_FULL" },
            503
          );
        }
        return jsonResponse({
          receivedBytes: 6,
          duplicate: false,
          job: makeJob("uploading", {
            receivedBytes: 6,
            uploadProgress: 100,
          }),
        });
      }
      return jsonResponse(makeJob("completed"), 202);
    });
    const service = new VideoConversionService({
      fetcher,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    await service.convert(file, { outputFormat: "m4a", bitrateKbps: 64 });

    expect(patchCount).toBe(2);
    expect(delays).toEqual([500]);
  });

  it("surfaces a terminal server job error", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = toRequest(input, init);
      if (request.url.endsWith("/jobs")) {
        return jsonResponse({
          job: makeJob("uploading"),
          chunkSize: 6,
          currentOffset: 0,
        }, 201);
      }
      if (request.method === "PATCH") {
        return jsonResponse({
          receivedBytes: 6,
          duplicate: false,
          job: makeJob("uploading", { receivedBytes: 6 }),
        });
      }
      return jsonResponse(
        makeJob("failed", {
          errorCode: "NO_AUDIO_STREAM",
          errorMessage: "No audio stream",
        }),
        202
      );
    });
    const service = new VideoConversionService({ fetcher });

    await expect(
      service.convert(file, { outputFormat: "m4a", bitrateKbps: 64 })
    ).rejects.toMatchObject({
      code: "NO_AUDIO_STREAM",
      message: "No audio stream",
    });
  });

  it("does not start a request when already aborted", async () => {
    const fetcher = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const service = new VideoConversionService({ fetcher });

    await expect(
      service.convert(file, {
        outputFormat: "m4a",
        bitrateKbps: 64,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("exposes structured non-success API errors", async () => {
    const service = new VideoConversionService({
      fetcher: async () =>
        jsonResponse({ error: "No capacity", code: "MEDIA_QUEUE_FULL" }, 429),
    });

    await expect(
      service.convert(file, { outputFormat: "m4a", bitrateKbps: 64 })
    ).rejects.toBeInstanceOf(VideoConversionClientError);
  });

  it("does not rebind the default browser fetch to the service instance", async () => {
    const receiverSensitiveFetch = function (
      this: unknown
    ): Promise<Response> {
      if (this instanceof VideoConversionService) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(
        jsonResponse({ error: "No capacity", code: "MEDIA_QUEUE_FULL" }, 429)
      );
    } as typeof fetch;
    vi.stubGlobal("fetch", receiverSensitiveFetch);
    const service = new VideoConversionService();

    await expect(
      service.convert(file, { outputFormat: "m4a", bitrateKbps: 64 })
    ).rejects.toBeInstanceOf(VideoConversionClientError);
  });
});
