import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConvertVideoToAudioOptionsType } from "@/lib/video-conversion/ffmpeg";
import type { CreateVideoJobInputType } from "@/types/video-conversion";
import {
  VideoConversionStoreError,
  createVideoConversionStore,
  type VideoConversionStoreType,
} from "@/lib/video-conversion/store";

const input: CreateVideoJobInputType = {
  fileName: "lesson.mov",
  fileSize: 6,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
};

const streamBytes = (...chunks: number[][]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(Uint8Array.from(chunk)));
      controller.close();
    },
  });

const waitFor = async (predicate: () => boolean, timeoutMs = 1_000) => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for store state");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const roots: string[] = [];
const stores: VideoConversionStoreType[] = [];

const setupStore = async (
  overrides: {
    convert?: (options: ConvertVideoToAudioOptionsType) => Promise<void>;
    now?: () => number;
    ttlMs?: number;
  } = {}
) => {
  const root = await mkdtemp(join(tmpdir(), "video-store-test-"));
  roots.push(root);

  const store = createVideoConversionStore({
    tempRoot: root,
    startCleanupTimer: false,
    getAvailableDiskBytes: async () => 100 * 1024 * 1024 * 1024,
    probe: async () => ({ durationSeconds: 60, audioCodec: "aac" }),
    convert:
      overrides.convert ||
      (async ({ outputPath, onProgress }) => {
        onProgress?.(50);
        await writeFile(outputPath, Uint8Array.from([9, 8, 7]));
      }),
    now: overrides.now,
    ttlMs: overrides.ttlMs,
  });
  stores.push(store);

  return { root, store };
};

const readOnlyInputFile = async (root: string) => {
  const [jobDirectory] = await readdir(root);
  const entries = await readdir(join(root, jobDirectory));
  const inputName = entries.find((name) => name.startsWith("input."));
  if (!inputName) throw new Error("Input file not found");
  return readFile(join(root, jobDirectory, inputName));
};

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.dispose()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("video conversion store", () => {
  it("creates a generated empty input file and reserves the upload", async () => {
    const { root, store } = await setupStore();

    const job = await store.createJob(input);

    expect(job).toMatchObject({
      fileName: "lesson.mov",
      fileSize: 6,
      receivedBytes: 0,
      status: "uploading",
      uploadProgress: 0,
    });
    await expect(readOnlyInputFile(root)).resolves.toEqual(Buffer.alloc(0));
  });

  it("writes sequential stream chunks and reports upload progress", async () => {
    const { root, store } = await setupStore();
    const job = await store.createJob(input);

    await store.writeChunk(
      job.id,
      { start: 0, end: 2, total: 6, length: 3 },
      streamBytes([1], [2, 3])
    );
    const result = await store.writeChunk(
      job.id,
      { start: 3, end: 5, total: 6, length: 3 },
      streamBytes([4, 5, 6])
    );

    expect(result).toEqual({ receivedBytes: 6, duplicate: false });
    expect(store.getPublicJob(job.id).uploadProgress).toBe(100);
    await expect(readOnlyInputFile(root)).resolves.toEqual(
      Buffer.from([1, 2, 3, 4, 5, 6])
    );
  });

  it("returns the authoritative offset for a repeated chunk", async () => {
    const { store } = await setupStore();
    const job = await store.createJob(input);
    const range = { start: 0, end: 2, total: 6, length: 3 };

    await store.writeChunk(job.id, range, streamBytes([1, 2, 3]));
    await expect(
      store.writeChunk(job.id, range, streamBytes([1, 2, 3]))
    ).resolves.toEqual({ receivedBytes: 3, duplicate: true });
  });

  it("rejects a future offset without changing the file", async () => {
    const { root, store } = await setupStore();
    const job = await store.createJob(input);

    await expect(
      store.writeChunk(
        job.id,
        { start: 3, end: 5, total: 6, length: 3 },
        streamBytes([4, 5, 6])
      )
    ).rejects.toMatchObject({
      code: "UPLOAD_OFFSET_MISMATCH",
      currentOffset: 0,
    });
    await expect(readOnlyInputFile(root)).resolves.toEqual(Buffer.alloc(0));
  });

  it("rolls back a chunk whose body exceeds its declared range", async () => {
    const { root, store } = await setupStore();
    const job = await store.createJob(input);

    await expect(
      store.writeChunk(
        job.id,
        { start: 0, end: 2, total: 6, length: 3 },
        streamBytes([1, 2, 3, 4])
      )
    ).rejects.toMatchObject({ code: "UPLOAD_LENGTH_MISMATCH" });
    expect(store.getPublicJob(job.id).receivedBytes).toBe(0);
    await expect(readOnlyInputFile(root)).resolves.toEqual(Buffer.alloc(0));
  });

  it("rejects finalization until all declared bytes arrive", async () => {
    const { store } = await setupStore();
    const job = await store.createJob(input);

    await expect(store.finalizeJob(job.id)).rejects.toMatchObject({
      code: "UPLOAD_INCOMPLETE",
    });
  });

  it("probes, converts, and removes input after completion", async () => {
    const { root, store } = await setupStore();
    const job = await store.createJob(input);
    await store.writeChunk(
      job.id,
      { start: 0, end: 5, total: 6, length: 6 },
      streamBytes([1, 2, 3, 4, 5, 6])
    );

    await store.finalizeJob(job.id);
    await waitFor(() => store.getPublicJob(job.id).status === "completed");

    expect(store.getPublicJob(job.id)).toMatchObject({
      status: "completed",
      durationSeconds: 60,
      conversionProgress: 100,
      outputSize: 3,
      downloadUrl: `/api/video-to-audio/jobs/${job.id}/download`,
    });
    const download = await store.getDownloadFile(job.id);
    await expect(readFile(download.path)).resolves.toEqual(Buffer.from([9, 8, 7]));
    const [jobDirectory] = await readdir(root);
    expect(await readdir(join(root, jobDirectory))).toEqual(["output.m4a"]);
  });

  it("aborts active conversion and removes temporary files", async () => {
    const { root, store } = await setupStore({
      convert: ({ signal }) =>
        new Promise((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("cancelled");
              error.name = "AbortError";
              reject(error);
            },
            { once: true }
          );
        }),
    });
    const job = await store.createJob(input);
    await store.writeChunk(
      job.id,
      { start: 0, end: 5, total: 6, length: 6 },
      streamBytes([1, 2, 3, 4, 5, 6])
    );
    await store.finalizeJob(job.id);
    await waitFor(() => store.getPublicJob(job.id).status === "processing");

    await store.cancelJob(job.id);

    expect(store.getPublicJob(job.id).status).toBe("cancelled");
    await expect(readdir(root)).resolves.toEqual([]);
  });

  it("removes expired job state and files", async () => {
    let currentTime = 1_000;
    const { root, store } = await setupStore({
      now: () => currentTime,
      ttlMs: 1_000,
    });
    const job = await store.createJob(input);

    currentTime = 2_001;
    await store.cleanupExpiredJobs(currentTime);

    expect(() => store.getPublicJob(job.id)).toThrow(
      VideoConversionStoreError
    );
    await expect(readdir(root)).resolves.toEqual([]);
  });

  it("shares one store across production route module bundles", async () => {
    const globalStore = globalThis as typeof globalThis & {
      __webpPlaygroundVideoConversionStore?: VideoConversionStoreType;
    };
    const previousStore = globalStore.__webpPlaygroundVideoConversionStore;
    delete globalStore.__webpPlaygroundVideoConversionStore;
    vi.stubEnv("NODE_ENV", "production");

    vi.resetModules();
    const firstModule = await import("@/lib/video-conversion/store");
    vi.resetModules();
    const secondModule = await import("@/lib/video-conversion/store");

    try {
      expect(firstModule.videoConversionStore).toBe(
        secondModule.videoConversionStore
      );
    } finally {
      await firstModule.videoConversionStore.dispose();
      if (
        secondModule.videoConversionStore !== firstModule.videoConversionStore
      ) {
        await secondModule.videoConversionStore.dispose();
      }
      if (previousStore) {
        globalStore.__webpPlaygroundVideoConversionStore = previousStore;
      } else {
        delete globalStore.__webpPlaygroundVideoConversionStore;
      }
      vi.unstubAllEnvs();
    }
  });
});
