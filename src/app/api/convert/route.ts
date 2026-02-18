import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_SERVER_QUEUE = 100;
const MAX_SERVER_CONCURRENCY = 5;
const MAX_SERVER_MEMORY_BUDGET_BYTES = 100 * 1024 * 1024;

type ConversionJobType = {
  id: string;
  formData: FormData;
  fileSize: number;
  signal: AbortSignal;
  resolve: (response: NextResponse) => void;
  cleanupAbortListener: () => void;
};

const pendingConversions: ConversionJobType[] = [];
let activeConversionCount = 0;
let pendingBytes = 0;
let activeBytes = 0;

const textEncoder = new TextEncoder();
const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();

const getQueueTotal = () => pendingConversions.length + activeConversionCount;
const getReservedBytes = () => pendingBytes + activeBytes;

const getServerStatusPayload = () => ({
  queueTotal: getQueueTotal(),
  processing: activeConversionCount,
  maxQueue: MAX_SERVER_QUEUE,
  maxProcessing: MAX_SERVER_CONCURRENCY,
  memoryBytes: getReservedBytes(),
  memoryLimitBytes: MAX_SERVER_MEMORY_BUDGET_BYTES,
});

const sendSsePayload = (
  controller: ReadableStreamDefaultController<Uint8Array>
) => {
  const payload = getServerStatusPayload();
  controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
};

const broadcastServerStatus = () => {
  for (const controller of sseClients) {
    try {
      sendSsePayload(controller);
    } catch {
      sseClients.delete(controller);
    }
  }
};

const buildServerBusyResponse = (
  reason: "QUEUE_FULL" | "MEMORY_BUDGET_EXCEEDED"
) =>
  NextResponse.json(
    reason === "QUEUE_FULL"
      ? {
          error: "Server queue is full",
          code: "QUEUE_FULL",
          details: `Server queue limit is ${MAX_SERVER_QUEUE} items`,
        }
      : {
          error: "Server memory budget is full",
          code: "MEMORY_BUDGET_EXCEEDED",
          details: `Server memory budget limit is ${Math.round(
            MAX_SERVER_MEMORY_BUDGET_BYTES / 1024 / 1024
          )}MB`,
        },
    {
      status: 429,
      headers: {
        "Retry-After": "1",
      },
    }
  );

const buildAbortedResponse = () =>
  NextResponse.json(
    {
      error: "Request aborted",
    },
    { status: 499 }
  );

const dequeueJobById = (jobId: string) => {
  const pendingIndex = pendingConversions.findIndex((job) => job.id === jobId);

  if (pendingIndex === -1) {
    return false;
  }

  const [removedJob] = pendingConversions.splice(pendingIndex, 1);
  pendingBytes = Math.max(0, pendingBytes - (removedJob?.fileSize || 0));
  return true;
};

const processQueuedJobs = () => {
  while (
    activeConversionCount < MAX_SERVER_CONCURRENCY &&
    pendingConversions.length > 0
  ) {
    const job = pendingConversions.shift();

    if (!job) {
      continue;
    }

    pendingBytes = Math.max(0, pendingBytes - job.fileSize);

    if (job.signal.aborted) {
      job.cleanupAbortListener();
      job.resolve(buildAbortedResponse());
      continue;
    }

    activeConversionCount += 1;
    activeBytes += job.fileSize;
    broadcastServerStatus();

    void (async () => {
      try {
        const response = await processSingleConversion(job.formData, job.signal);
        job.resolve(response);
      } catch (error) {
        console.error("Conversion error:", error);
        job.resolve(
          NextResponse.json(
            {
              error: "Conversion failed",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          )
        );
      } finally {
        job.cleanupAbortListener();
        activeConversionCount = Math.max(0, activeConversionCount - 1);
        activeBytes = Math.max(0, activeBytes - job.fileSize);
        broadcastServerStatus();
        processQueuedJobs();
      }
    })();
  }
};

const enqueueConversionJob = (
  formData: FormData,
  fileSize: number,
  signal: AbortSignal
): Promise<NextResponse> => {
  const conversionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `conversion-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return new Promise<NextResponse>((resolve) => {
    let settled = false;

    const finalize = (response: NextResponse) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(response);
    };

    const handleAbort = () => {
      if (settled) {
        return;
      }

      const removedFromQueue = dequeueJobById(conversionId);

      if (removedFromQueue) {
        broadcastServerStatus();
        finalize(buildAbortedResponse());
      }
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    const job: ConversionJobType = {
      id: conversionId,
      formData,
      fileSize,
      signal,
      resolve: finalize,
      cleanupAbortListener: () => {
        signal.removeEventListener("abort", handleAbort);
      },
    };

    pendingConversions.push(job);
    pendingBytes += fileSize;
    broadcastServerStatus();
    processQueuedJobs();
  });
};

const processSingleConversion = async (
  formData: FormData,
  signal: AbortSignal
): Promise<NextResponse> => {
  if (signal.aborted) {
    return buildAbortedResponse();
  }

  const file = formData.get("file") as File;
  const format = formData.get("format") as string;
  const quality = parseInt(formData.get("quality") as string) || 80;
  const lossless = formData.get("lossless") === "true";
  const nearLosslessEnabled = formData.get("nearLossless") === "true";
  const nearLosslessValue =
    parseInt(formData.get("nearLosslessValue") as string) || 100;
  const effort = parseInt(formData.get("effort") as string) || 6;
  const progressive = formData.get("progressive") === "true";
  const interlace = formData.get("interlace") === "true";
  const chromaSubsampling = formData.get("chromaSubsampling") as string;
  const mozjpeg = formData.get("mozjpeg") !== "false";
  const alphaQuality = parseInt(formData.get("alphaQuality") as string) || 100;
  const preset = (formData.get("preset") as string) || "default";
  const palette = formData.get("palette") === "true";
  const colors = parseInt(formData.get("colors") as string) || 256;
  const dithering = parseFloat(formData.get("dithering") as string) || 1.0;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
      { status: 400 }
    );
  }

  if (!format || !["jpeg", "png", "webp", "avif"].includes(format)) {
    return NextResponse.json({ error: "Invalid output format" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();

  let outputBuffer: Buffer;

  switch (format) {
    case "webp":
      if (lossless) {
        const webpOptions: {
          lossless: boolean;
          effort: number;
          quality: number;
          nearLossless?: boolean;
        } = {
          lossless: true,
          effort: Math.min(effort, 6),
          quality: 100,
        };

        if (nearLosslessEnabled && nearLosslessValue < 100) {
          webpOptions.nearLossless = true;
          webpOptions.quality = nearLosslessValue;
        }

        outputBuffer = await sharpInstance.webp(webpOptions).toBuffer();
      } else {
        const webpLossyOptions: {
          quality: number;
          effort: number;
          smartSubsample: boolean;
          reductionEffort: number;
          alphaQuality: number;
          preset?: "default" | "photo" | "picture" | "drawing" | "icon" | "text";
        } = {
          quality,
          effort: Math.min(effort, 6),
          smartSubsample: true,
          reductionEffort: 6,
          alphaQuality,
        };

        if (preset !== "default") {
          webpLossyOptions.preset = preset as
            | "photo"
            | "picture"
            | "drawing"
            | "icon"
            | "text";
        }

        outputBuffer = await sharpInstance.webp(webpLossyOptions).toBuffer();
      }
      break;

    case "avif":
      outputBuffer = await sharpInstance
        .avif({
          quality: lossless ? 100 : quality,
          lossless,
          effort: effort || 4,
          chromaSubsampling: lossless ? "4:4:4" : "4:2:0",
        })
        .toBuffer();
      break;

    case "png": {
      const pngOptions: {
        compressionLevel: number;
        quality: number;
        effort: number;
        progressive: boolean;
        palette?: boolean;
        colors?: number;
        dither?: number;
      } = {
        compressionLevel: 9,
        quality: 100,
        effort: 10,
        progressive: interlace,
      };

      if (palette) {
        pngOptions.palette = true;
        pngOptions.colors = colors;
        pngOptions.dither = dithering;
      }

      outputBuffer = await sharpInstance.png(pngOptions).toBuffer();
      break;
    }

    case "jpeg": {
      const jpegOptions: {
        quality: number;
        mozjpeg: boolean;
        progressive: boolean;
        optimizeCoding: boolean;
        optimizeScans: boolean;
        trellisQuantisation: boolean;
        chromaSubsampling?: string;
      } = {
        quality,
        mozjpeg,
        progressive,
        optimizeCoding: true,
        optimizeScans: progressive,
        trellisQuantisation: true,
      };

      if (chromaSubsampling && chromaSubsampling !== "auto") {
        jpegOptions.chromaSubsampling = chromaSubsampling;
      } else {
        jpegOptions.chromaSubsampling = quality >= 90 ? "4:4:4" : "4:2:0";
      }

      outputBuffer = await sharpInstance.jpeg(jpegOptions).toBuffer();
      break;
    }

    default:
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const outputInfo = await sharp(outputBuffer).metadata();

  return new NextResponse(outputBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": `image/${format}`,
      "Content-Length": outputBuffer.length.toString(),
      "X-Original-Size": file.size.toString(),
      "X-Converted-Size": outputBuffer.length.toString(),
      "X-Compression-Ratio": (file.size / outputBuffer.length).toFixed(2),
      "X-Original-Format": metadata.format || "unknown",
      "X-Image-Width": (outputInfo.width || 0).toString(),
      "X-Image-Height": (outputInfo.height || 0).toString(),
      "X-Progressive": (format === "jpeg" && progressive).toString(),
      "X-Encoding-Info":
        format === "jpeg"
          ? progressive
            ? "Progressive JPEG with optimized scans"
            : "Baseline JPEG"
          : format === "webp" && lossless && nearLosslessEnabled
          ? `Near-lossless WebP (${nearLosslessValue}%)`
          : format === "webp" && lossless
          ? "Lossless WebP"
          : `${format.toUpperCase()} encoded`,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    if (getQueueTotal() >= MAX_SERVER_QUEUE) {
      return buildServerBusyResponse("QUEUE_FULL");
    }

    if (getReservedBytes() + file.size > MAX_SERVER_MEMORY_BUDGET_BYTES) {
      return buildServerBusyResponse("MEMORY_BUDGET_EXCEEDED");
    }

    return await enqueueConversionJob(formData, file.size, request.signal);
  } catch (error) {
    console.error("Conversion request error:", error);
    return NextResponse.json(
      {
        error: "Conversion request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const acceptsSse = (request.headers.get("accept") || "").includes(
    "text/event-stream"
  );

  if (!acceptsSse) {
    return NextResponse.json(getServerStatusPayload());
  }

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (controllerRef) {
      sseClients.delete(controllerRef);
      controllerRef = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      sseClients.add(controller);

      controller.enqueue(textEncoder.encode("retry: 2000\n\n"));
      sendSsePayload(controller);

      heartbeatInterval = setInterval(() => {
        if (!controllerRef) {
          return;
        }

        try {
          controllerRef.enqueue(textEncoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
