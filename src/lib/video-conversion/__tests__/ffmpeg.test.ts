import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFfmpegArgs,
  parseFfmpegProgressLine,
  probeMedia,
  resolveMediaExecutablePaths,
} from "@/lib/video-conversion/ffmpeg";

const fixturePath = resolve("public/testfiles/705432-Ch1-Part1.mov");

describe("FFmpeg command construction", () => {
  it("builds an MP3 command without shell interpolation", () => {
    expect(buildFfmpegArgs("/tmp/in.mov", "/tmp/out.mp3", "mp3", 96)).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-progress",
      "pipe:1",
      "-nostats",
      "-i",
      "/tmp/in.mov",
      "-map",
      "0:a:0",
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "96k",
      "/tmp/out.mp3",
    ]);
  });

  it("builds an AAC M4A command with fast-start metadata", () => {
    expect(buildFfmpegArgs("/tmp/in.mov", "/tmp/out.m4a", "m4a", 64)).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-progress",
      "pipe:1",
      "-nostats",
      "-i",
      "/tmp/in.mov",
      "-map",
      "0:a:0",
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "64k",
      "-movflags",
      "+faststart",
      "/tmp/out.m4a",
    ]);
  });

  it("derives bounded progress from FFmpeg microseconds", () => {
    expect(
      parseFfmpegProgressLine("out_time_us=1754351500", 3508.703)
    ).toBeCloseTo(50, 3);
    expect(parseFfmpegProgressLine("progress=continue", 3508.703)).toBeNull();
    expect(parseFfmpegProgressLine("out_time_us=-5", 3508.703)).toBeNull();
  });
});

describe("packaged media executables", () => {
  it("resolves executable FFmpeg and FFprobe paths", async () => {
    const paths = resolveMediaExecutablePaths();
    await expect(access(paths.ffmpegPath)).resolves.toBeUndefined();
    await expect(access(paths.ffprobePath)).resolves.toBeUndefined();
  });

  it("probes the real MOV fixture and finds its AAC audio stream", async () => {
    const result = await probeMedia(fixturePath);

    expect(result.durationSeconds).toBeGreaterThan(3508);
    expect(result.durationSeconds).toBeLessThan(3509);
    expect(result.audioCodec).toBe("aac");
  });
});
