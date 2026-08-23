#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

const [
  baseUrlArg = "http://localhost:3000",
  inputArg = "public/testfiles/705432-Ch1-Part1.mov",
  formatArg = "m4a",
  bitrateArg = "64",
] = process.argv.slice(2);

const baseUrl = baseUrlArg.replace(/\/$/, "");
const inputPath = resolve(inputArg);
const outputFormat = formatArg.toLowerCase();
const bitrateKbps = Number(bitrateArg);
const allowedFormats = new Set(["mp3", "m4a"]);
const allowedBitrates = new Set([32, 48, 64, 96, 128, 160, 192, 256, 320]);

if (!allowedFormats.has(outputFormat) || !allowedBitrates.has(bitrateKbps)) {
  throw new Error(
    "Usage: verify-video-to-audio.mjs <base-url> <input> <mp3|m4a> <32|48|64|96|128|160|192|256|320>"
  );
}

const parseJson = async (response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${payload?.code || response.status}: ${payload?.error || response.statusText}`
    );
  }
  return payload;
};

const probeOutput = (path) =>
  new Promise((resolveProbe, rejectProbe) => {
    const ffprobePath = process.env.FFPROBE_PATH || ffprobeInstaller.path;
    const child = spawn(
      ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "format=format_name,duration,bit_rate:stream=codec_name,codec_type,bit_rate",
        "-of",
        "json",
        path,
      ],
      { shell: false, stdio: ["ignore", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", rejectProbe);
    child.once("close", (code) => {
      if (code !== 0) {
        rejectProbe(new Error(stderr || `FFprobe exited with ${code}`));
        return;
      }
      try {
        resolveProbe(JSON.parse(stdout));
      } catch (error) {
        rejectProbe(error);
      }
    });
  });

const sourceInfo = await stat(inputPath);
const temporaryOutputDirectory = await mkdtemp(
  join(tmpdir(), "video-audio-verification-")
);
const sourceBaseName = basename(inputPath, extname(inputPath));
const outputPath = join(
  temporaryOutputDirectory,
  `${sourceBaseName}.${outputFormat}`
);

let jobId;
let inputHandle;

try {
  const createResponse = await fetch(`${baseUrl}/api/video-to-audio/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: basename(inputPath),
      fileSize: sourceInfo.size,
      contentType:
        extname(inputPath).toLowerCase() === ".mov"
          ? "video/quicktime"
          : "application/octet-stream",
      outputFormat,
      bitrateKbps,
    }),
  });
  const created = await parseJson(createResponse);
  jobId = created.job.id;
  const chunkSize = created.chunkSize;
  let offset = created.currentOffset;
  let lastPrintedUpload = -1;
  inputHandle = await open(inputPath, "r");
  const buffer = Buffer.allocUnsafe(chunkSize);

  while (offset < sourceInfo.size) {
    const requestedBytes = Math.min(chunkSize, sourceInfo.size - offset);
    const { bytesRead } = await inputHandle.read(
      buffer,
      0,
      requestedBytes,
      offset
    );
    if (bytesRead <= 0) throw new Error("Source file ended before declared size");

    const end = offset + bytesRead - 1;
    const response = await fetch(
      `${baseUrl}/api/video-to-audio/jobs/${jobId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Range": `bytes ${offset}-${end}/${sourceInfo.size}`,
        },
        body: buffer.subarray(0, bytesRead),
        duplex: "half",
      }
    );
    const payload = await response.json().catch(() => null);
    if (response.status === 409 && Number.isSafeInteger(payload?.currentOffset)) {
      offset = payload.currentOffset;
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `${payload?.code || response.status}: ${payload?.error || response.statusText}`
      );
    }
    offset = payload.receivedBytes;

    const uploadPercent = Math.floor((offset / sourceInfo.size) * 100);
    if (uploadPercent >= lastPrintedUpload + 10 || uploadPercent === 100) {
      console.log(`Upload ${uploadPercent}% (${offset}/${sourceInfo.size} bytes)`);
      lastPrintedUpload = uploadPercent;
    }
  }

  await inputHandle.close();
  inputHandle = undefined;

  const finalized = await parseJson(
    await fetch(`${baseUrl}/api/video-to-audio/jobs/${jobId}`, {
      method: "POST",
    })
  );
  console.log(`Job ${jobId} entered ${finalized.status}`);

  const deadline = Date.now() + 30 * 60 * 1000;
  let job = finalized;
  let lastPrintedConversion = -1;
  while (!["completed", "failed", "cancelled"].includes(job.status)) {
    if (Date.now() >= deadline) throw new Error("Conversion timed out after 30 minutes");
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
    job = await parseJson(
      await fetch(`${baseUrl}/api/video-to-audio/jobs/${jobId}`, {
        cache: "no-store",
      })
    );
    const conversionPercent = Math.floor(job.conversionProgress || 0);
    if (
      conversionPercent >= lastPrintedConversion + 10 ||
      conversionPercent === 100
    ) {
      console.log(`Conversion ${conversionPercent}% (${job.status})`);
      lastPrintedConversion = conversionPercent;
    }
  }

  if (job.status !== "completed") {
    throw new Error(`${job.errorCode || job.status}: ${job.errorMessage || "Job failed"}`);
  }

  const downloadResponse = await fetch(`${baseUrl}${job.downloadUrl}`);
  if (!downloadResponse.ok || !downloadResponse.body) {
    throw new Error(`Download failed with HTTP ${downloadResponse.status}`);
  }
  const expectedContentType = outputFormat === "mp3" ? "audio/mpeg" : "audio/mp4";
  if (downloadResponse.headers.get("content-type") !== expectedContentType) {
    throw new Error(
      `Expected ${expectedContentType}, received ${downloadResponse.headers.get("content-type")}`
    );
  }

  await pipeline(
    Readable.fromWeb(downloadResponse.body),
    createWriteStream(outputPath)
  );
  const outputInfo = await stat(outputPath);
  if (outputInfo.size <= 0) throw new Error("Downloaded output is empty");

  const metadata = await probeOutput(outputPath);
  const audioStream = metadata.streams?.find(
    (stream) => stream.codec_type === "audio"
  );
  if (!audioStream) throw new Error("Output does not contain an audio stream");
  const measuredBitrate = Number(
    audioStream.bit_rate || metadata.format?.bit_rate || 0
  );
  const targetBitrate = bitrateKbps * 1_000;
  if (
    measuredBitrate > 0 &&
    (measuredBitrate < targetBitrate * 0.75 ||
      measuredBitrate > targetBitrate * 1.25)
  ) {
    throw new Error(
      `Output bitrate ${measuredBitrate} is not close to ${targetBitrate}`
    );
  }

  console.log(
    JSON.stringify(
      {
        status: "verified",
        format: outputFormat,
        requestedBitrateKbps: bitrateKbps,
        measuredBitrate,
        sourceBytes: sourceInfo.size,
        outputBytes: outputInfo.size,
        codec: audioStream.codec_name,
        durationSeconds: Number(metadata.format?.duration || 0),
      },
      null,
      2
    )
  );
} finally {
  await inputHandle?.close().catch(() => undefined);
  if (jobId) {
    await fetch(`${baseUrl}/api/video-to-audio/jobs/${jobId}`, {
      method: "DELETE",
    }).catch(() => undefined);
  }
  await rm(temporaryOutputDirectory, { recursive: true, force: true });
}
