import { spawn } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import type {
  AudioBitrateKbpsType,
  AudioOutputFormatType,
} from "@/types/video-conversion";

const MAX_PROCESS_ERROR_LENGTH = 64 * 1024;

export class MediaConversionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "MediaConversionError";
    this.code = code;
  }
}

export type MediaProbeResultType = {
  durationSeconds: number;
  audioCodec: string;
};

export type ConvertVideoToAudioOptionsType = {
  inputPath: string;
  outputPath: string;
  outputFormat: AudioOutputFormatType;
  bitrateKbps: AudioBitrateKbpsType;
  durationSeconds: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export const resolveMediaExecutablePaths = () => ({
  ffmpegPath: process.env.FFMPEG_PATH || ffmpegInstaller.path,
  ffprobePath: process.env.FFPROBE_PATH || ffprobeInstaller.path,
});

export const buildFfmpegArgs = (
  inputPath: string,
  outputPath: string,
  outputFormat: AudioOutputFormatType,
  bitrateKbps: AudioBitrateKbpsType
) => {
  const codecArgs =
    outputFormat === "mp3"
      ? ["-c:a", "libmp3lame", "-b:a", `${bitrateKbps}k`]
      : [
          "-c:a",
          "aac",
          "-b:a",
          `${bitrateKbps}k`,
          "-movflags",
          "+faststart",
        ];

  return [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-progress",
    "pipe:1",
    "-nostats",
    "-i",
    inputPath,
    "-map",
    "0:a:0",
    "-vn",
    ...codecArgs,
    outputPath,
  ];
};

export const parseFfmpegProgressLine = (
  line: string,
  durationSeconds: number
): number | null => {
  const match = /^out_time_(?:us|ms)=(\d+)$/.exec(line.trim());
  if (!match || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const processedMicroseconds = Number(match[1]);
  if (!Number.isSafeInteger(processedMicroseconds)) return null;

  const progress =
    (processedMicroseconds / 1_000_000 / durationSeconds) * 100;
  return Math.min(99.9, Math.max(0, progress));
};

const appendBounded = (current: string, chunk: Buffer | string) =>
  (current + chunk.toString()).slice(-MAX_PROCESS_ERROR_LENGTH);

export const probeMedia = async (
  inputPath: string
): Promise<MediaProbeResultType> => {
  const { ffprobePath } = resolveMediaExecutablePaths();

  return new Promise((resolve, reject) => {
    const child = spawn(
      ffprobePath,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "format=duration:stream=index,codec_name,codec_type,duration",
        "-of",
        "json",
        inputPath,
      ],
      { shell: false, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk);
    });

    child.once("error", () => {
      reject(
        new MediaConversionError(
          "FFPROBE_UNAVAILABLE",
          "FFprobe could not be started"
        )
      );
    });

    child.once("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(
          new MediaConversionError(
            "MEDIA_PROBE_FAILED",
            stderr.trim() || "Unable to inspect the uploaded media"
          )
        );
        return;
      }

      try {
        const payload = JSON.parse(stdout) as {
          streams?: Array<{
            codec_type?: string;
            codec_name?: string;
            duration?: string;
          }>;
          format?: { duration?: string };
        };
        const audioStream = payload.streams?.find(
          (stream) => stream.codec_type === "audio"
        );

        if (!audioStream) {
          reject(
            new MediaConversionError(
              "NO_AUDIO_STREAM",
              "The uploaded video does not contain an audio stream"
            )
          );
          return;
        }

        const durationSeconds = Number(
          audioStream.duration || payload.format?.duration
        );
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
          reject(
            new MediaConversionError(
              "MEDIA_PROBE_FAILED",
              "The media duration could not be determined"
            )
          );
          return;
        }

        resolve({
          durationSeconds,
          audioCodec: audioStream.codec_name || "unknown",
        });
      } catch {
        reject(
          new MediaConversionError(
            "MEDIA_PROBE_FAILED",
            "FFprobe returned invalid metadata"
          )
        );
      }
    });
  });
};

const createAbortError = () => {
  const error = new Error("Video conversion was cancelled");
  error.name = "AbortError";
  return error;
};

export const convertVideoToAudio = async ({
  inputPath,
  outputPath,
  outputFormat,
  bitrateKbps,
  durationSeconds,
  signal,
  onProgress,
}: ConvertVideoToAudioOptionsType): Promise<void> => {
  if (signal?.aborted) throw createAbortError();

  const { ffmpegPath } = resolveMediaExecutablePaths();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegPath,
      buildFfmpegArgs(inputPath, outputPath, outputFormat, bitrateKbps),
      { shell: false, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stderr = "";
    let progressBuffer = "";
    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", handleAbort);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      callback();
    };

    const handleAbort = () => {
      if (settled) return;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        if (!settled) child.kill("SIGKILL");
      }, 5_000);
      forceKillTimer.unref?.();
    };

    signal?.addEventListener("abort", handleAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      progressBuffer += chunk.toString();
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || "";

      for (const line of lines) {
        const progress = parseFfmpegProgressLine(line, durationSeconds);
        if (progress !== null) onProgress?.(progress);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk);
    });

    child.once("error", () => {
      settle(() => {
        reject(
          new MediaConversionError(
            "FFMPEG_UNAVAILABLE",
            "FFmpeg could not be started"
          )
        );
      });
    });

    child.once("close", (exitCode) => {
      if (signal?.aborted) {
        settle(() => reject(createAbortError()));
        return;
      }

      if (exitCode !== 0) {
        settle(() => {
          reject(
            new MediaConversionError(
              "CONVERSION_FAILED",
              stderr.trim() || "FFmpeg failed to create the audio file"
            )
          );
        });
        return;
      }

      onProgress?.(100);
      settle(resolve);
    });
  });
};
