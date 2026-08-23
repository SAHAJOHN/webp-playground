import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createVideoDownloadHandler,
  createVideoJobCollectionHandlers,
  createVideoJobHandlers,
} from "@/lib/video-conversion/route-handlers";
import {
  createVideoConversionStore,
  type VideoConversionStoreType,
} from "@/lib/video-conversion/store";
import { MAX_VIDEO_FILE_SIZE_BYTES } from "@/types/video-conversion";
import type { CreateVideoJobInputType } from "@/types/video-conversion";

const roots: string[] = [];
const stores: VideoConversionStoreType[] = [];

const setup = async (outputBytes = Uint8Array.from([9, 8, 7])) => {
  const root = await mkdtemp(join(tmpdir(), "video-routes-test-"));
  roots.push(root);
  const store = createVideoConversionStore({
    tempRoot: root,
    startCleanupTimer: false,
    getAvailableDiskBytes: async () => 100 * 1024 * 1024 * 1024,
    probe: async () => ({ durationSeconds: 60, audioCodec: "aac" }),
     convert: async ({ outputPath }) => {
       await writeFile(outputPath, outputBytes);
    },
  });
  stores.push(store);

  return {
    store,
    collection: createVideoJobCollectionHandlers(store),
    job: createVideoJobHandlers(store),
    download: createVideoDownloadHandler(store),
  };
};

const validPayload: CreateVideoJobInputType = {
  fileName: "lesson.mov",
  fileSize: 6,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
};

const context = (jobId: string) => ({ params: Promise.resolve({ jobId }) });

const uploadRequest = (jobId: string, bytes: number[], range: string) =>
  new Request(`http://localhost/api/video-to-audio/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Range": range },
    body: Uint8Array.from(bytes),
    duplex: "half",
  } as RequestInit & { duplex: "half" });

const waitForCompleted = async (
  store: VideoConversionStoreType,
  jobId: string
) => {
  const startedAt = Date.now();
  while (store.getPublicJob(jobId).status !== "completed") {
    if (Date.now() - startedAt > 1_000) throw new Error("Job did not complete");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.dispose()));
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe("video job collection handler", () => {
  it("creates an upload job and advertises the chunk size", async () => {
    const { collection } = await setup();
    const response = await collection.POST(
      new Request("http://localhost/api/video-to-audio/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      chunkSize: 16 * 1024 * 1024,
      job: { status: "uploading", fileName: "lesson.mov" },
    });
  });

  it("rejects invalid JSON and files above 8 GiB", async () => {
    const { collection } = await setup();
    const invalidJson = await collection.POST(
      new Request("http://localhost/api/video-to-audio/jobs", {
        method: "POST",
        body: "{",
      })
    );
    const oversized = await collection.POST(
      new Request("http://localhost/api/video-to-audio/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...validPayload,
          fileSize: MAX_VIDEO_FILE_SIZE_BYTES + 1,
        }),
      })
    );

    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toMatchObject({
      code: "INVALID_JSON",
    });
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });
});

describe("video job handlers", () => {
  it("streams an upload, finalizes it, and returns status", async () => {
    const { store, job } = await setup();
    const created = await store.createJob(validPayload);

    const uploadResponse = await job.PATCH(
      uploadRequest(created.id, [1, 2, 3, 4, 5, 6], "bytes 0-5/6"),
      context(created.id)
    );
    const finalizeResponse = await job.POST(
      new Request(`http://localhost/jobs/${created.id}`, { method: "POST" }),
      context(created.id)
    );
    const statusResponse = await job.GET(
      new Request(`http://localhost/jobs/${created.id}`),
      context(created.id)
    );

    expect(uploadResponse.status).toBe(200);
    await expect(uploadResponse.json()).resolves.toMatchObject({
      receivedBytes: 6,
      duplicate: false,
    });
    expect(finalizeResponse.status).toBe(202);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns the authoritative offset on a range conflict", async () => {
    const { store, job } = await setup();
    const created = await store.createJob(validPayload);

    const response = await job.PATCH(
      uploadRequest(created.id, [4, 5, 6], "bytes 3-5/6"),
      context(created.id)
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "UPLOAD_OFFSET_MISMATCH",
      currentOffset: 0,
    });
  });

  it("rejects malformed upload ranges", async () => {
    const { store, job } = await setup();
    const created = await store.createJob(validPayload);

    const response = await job.PATCH(
      uploadRequest(created.id, [1], "bytes=0-0/6"),
      context(created.id)
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_CONTENT_RANGE",
    });
  });

  it("cancels idempotently", async () => {
    const { store, job } = await setup();
    const created = await store.createJob(validPayload);
    const request = new Request(`http://localhost/jobs/${created.id}`, {
      method: "DELETE",
    });

    expect((await job.DELETE(request, context(created.id))).status).toBe(204);
    expect((await job.DELETE(request, context(created.id))).status).toBe(204);
  });
});

describe("video download handler", () => {
  it("rejects download before conversion completes", async () => {
    const { store, download } = await setup();
    const created = await store.createJob(validPayload);

    const response = await download(
      new Request(`http://localhost/jobs/${created.id}/download`),
      context(created.id)
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "OUTPUT_NOT_READY",
    });
  });

  it("streams a valid byte range from completed output", async () => {
    const { store, job, download } = await setup();
    const created = await store.createJob(validPayload);
    await job.PATCH(
      uploadRequest(created.id, [1, 2, 3, 4, 5, 6], "bytes 0-5/6"),
      context(created.id)
    );
    await store.finalizeJob(created.id);
    await waitForCompleted(store, created.id);

    const response = await download(
      new Request(`http://localhost/jobs/${created.id}/download`, {
        headers: { Range: "bytes=1-2" },
      }),
      context(created.id)
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 1-2/3");
    expect(response.headers.get("Content-Type")).toBe("audio/mp4");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      Uint8Array.from([8, 7])
    );
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const { store, job, download } = await setup();
    const created = await store.createJob(validPayload);
    await job.PATCH(
      uploadRequest(created.id, [1, 2, 3, 4, 5, 6], "bytes 0-5/6"),
      context(created.id)
    );
    await store.finalizeJob(created.id);
    await waitForCompleted(store, created.id);

    const response = await download(
      new Request(`http://localhost/jobs/${created.id}/download`, {
        headers: { Range: "bytes=10-" },
      }),
      context(created.id)
    );

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */3");
  });

  it("cancels an in-flight range stream without surfacing a closed-controller error", async () => {
    const outputBytes = new Uint8Array(4 * 1024 * 1024);
    outputBytes.fill(7);
    const { store, job, download } = await setup(outputBytes);
    const created = await store.createJob(validPayload);
    await job.PATCH(
      uploadRequest(created.id, [1, 2, 3, 4, 5, 6], "bytes 0-5/6"),
      context(created.id)
    );
    await store.finalizeJob(created.id);
    await waitForCompleted(store, created.id);

    const response = await download(
      new Request(`http://localhost/jobs/${created.id}/download`, {
        headers: { Range: "bytes=0-" },
      }),
      context(created.id)
    );
    const reader = response.body?.getReader();

    expect(reader).not.toBeUndefined();
    const uncaughtErrors: unknown[] = [];
    const onUncaughtException = (error: unknown) => {
      uncaughtErrors.push(error);
    };

    process.on("uncaughtException", onUncaughtException);
    try {
      const pendingRead = reader!.read();
      await reader!.cancel("client disconnected");
      await pendingRead;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } finally {
      process.off("uncaughtException", onUncaughtException);
    }

    expect(uncaughtErrors).toEqual([]);
  });
});
