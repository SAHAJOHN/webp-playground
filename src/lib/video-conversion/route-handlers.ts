import { createReadStream } from "node:fs";
import {
  parseDownloadRange,
  parseUploadContentRange,
} from "@/lib/video-conversion/http-ranges";
import {
  VideoConversionStoreError,
  type VideoConversionStoreType,
} from "@/lib/video-conversion/store";
import { validateCreateVideoJobInput } from "@/lib/video-conversion/validation";
import { VIDEO_UPLOAD_CHUNK_SIZE_BYTES } from "@/types/video-conversion";

export type VideoJobRouteContextType = {
  params: Promise<{ jobId: string }>;
};

const json = (payload: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(payload, { status, headers });

const errorResponse = (error: unknown) => {
  if (error instanceof VideoConversionStoreError) {
    return json(
      {
        error: error.message,
        code: error.code,
        ...(error.currentOffset !== undefined
          ? { currentOffset: error.currentOffset }
          : {}),
      },
      error.status,
      error.status === 429 ? { "Retry-After": "2" } : undefined
    );
  }

  console.error("Video conversion request failed:", error);
  return json(
    {
      error: "Video conversion request failed",
      code: "INTERNAL_SERVER_ERROR",
    },
    500
  );
};

const createFileDownloadStream = (
  path: string,
  start: number,
  end: number
) => {
  const nodeStream = createReadStream(path, { start, end });
  const iterator = nodeStream[Symbol.asyncIterator]();
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;

      try {
        const result = await iterator.next();
        if (finished) return;

        if (result.done) {
          finished = true;
          controller.close();
          return;
        }

        controller.enqueue(result.value);
      } catch (error) {
        if (finished) return;

        finished = true;
        try {
          controller.error(error);
        } catch {
          // The response may have been cancelled while the file read failed.
        }
      }
    },
    cancel() {
      finished = true;
      nodeStream.destroy();
    },
  });
};

export const createVideoJobCollectionHandlers = (
  store: VideoConversionStoreType
) => ({
  POST: async (request: Request) => {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json(
        { error: "Request body must be valid JSON", code: "INVALID_JSON" },
        400
      );
    }

    const validation = validateCreateVideoJobInput(input);
    if (!validation.ok) {
      return json(
        { error: validation.message, code: validation.code },
        validation.code === "FILE_TOO_LARGE" ? 413 : 400
      );
    }

    try {
      const job = await store.createJob(validation.value);
      return json(
        {
          job,
          chunkSize: VIDEO_UPLOAD_CHUNK_SIZE_BYTES,
          currentOffset: job.receivedBytes,
        },
        201
      );
    } catch (error) {
      return errorResponse(error);
    }
  },
});

export const createVideoJobHandlers = (store: VideoConversionStoreType) => ({
  GET: async (_request: Request, context: VideoJobRouteContextType) => {
    const { jobId } = await context.params;
    try {
      return json(store.getPublicJob(jobId), 200, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      return errorResponse(error);
    }
  },

  PATCH: async (request: Request, context: VideoJobRouteContextType) => {
    const { jobId } = await context.params;
    const range = parseUploadContentRange(request.headers.get("Content-Range"));
    if (!range) {
      return json(
        {
          error: "A valid Content-Range header is required",
          code: "INVALID_CONTENT_RANGE",
        },
        400
      );
    }
    if (!request.body) {
      return json(
        { error: "Upload chunk body is required", code: "NO_UPLOAD_BODY" },
        400
      );
    }

    try {
      const result = await store.writeChunk(jobId, range, request.body);
      return json({ ...result, job: store.getPublicJob(jobId) });
    } catch (error) {
      return errorResponse(error);
    }
  },

  POST: async (_request: Request, context: VideoJobRouteContextType) => {
    const { jobId } = await context.params;
    try {
      return json(await store.finalizeJob(jobId), 202);
    } catch (error) {
      return errorResponse(error);
    }
  },

  DELETE: async (_request: Request, context: VideoJobRouteContextType) => {
    const { jobId } = await context.params;
    try {
      await store.cancelJob(jobId);
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error);
    }
  },
});

export const createVideoDownloadHandler = (
  store: VideoConversionStoreType
) => {
  return async (request: Request, context: VideoJobRouteContextType) => {
    const { jobId } = await context.params;

    try {
      const file = await store.getDownloadFile(jobId);
      const rangeHeader = request.headers.get("Range");
      const range = rangeHeader
        ? parseDownloadRange(rangeHeader, file.size)
        : null;

      if (rangeHeader && !range) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${file.size}` },
        });
      }

      const start = range?.start ?? 0;
      const end = range?.end ?? file.size - 1;
      const contentLength = range?.length ?? file.size;
      const body = createFileDownloadStream(file.path, start, end);
      const encodedFileName = encodeURIComponent(file.fileName);
      const headers = new Headers({
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": contentLength.toString(),
        "Content-Type": file.contentType,
        "X-Accel-Buffering": "no",
      });

      if (range) {
        headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
      }

      return new Response(body, {
        status: range ? 206 : 200,
        headers,
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
};
