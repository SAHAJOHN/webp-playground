// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useVideoToAudioConversion } from "@/hooks/conversion/useVideoToAudioConversion";
import type { VideoJobPublicType } from "@/types/video-conversion";

const file = new File([Uint8Array.from([1])], "lesson.mov", {
  type: "video/quicktime",
});

const makeJob = (
  status: VideoJobPublicType["status"]
): VideoJobPublicType => ({
  id: "job-1",
  fileName: "lesson.mov",
  fileSize: 1,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
  receivedBytes: status === "uploading" ? 0 : 1,
  status,
  uploadProgress: status === "uploading" ? 0 : 100,
  conversionProgress: status === "completed" ? 100 : 0,
  createdAt: "2026-08-23T00:00:00.000Z",
  expiresAt: "2026-08-23T06:00:00.000Z",
});

describe("useVideoToAudioConversion", () => {
  it("publishes server job updates and the completed result", async () => {
    const service = {
      convert: vi.fn(async (_file, options) => {
        options.onJobUpdate?.(makeJob("processing"));
        return makeJob("completed");
      }),
      cancel: vi.fn(async () => undefined),
    };
    const { result } = renderHook(() =>
      useVideoToAudioConversion(service)
    );

    await act(async () => {
      await result.current.startConversion(file, {
        outputFormat: "m4a",
        bitrateKbps: 64,
      });
    });

    expect(result.current.job?.status).toBe("completed");
    expect(result.current.error).toBeNull();
    expect(result.current.isBusy).toBe(false);
  });

  it("aborts active requests and cancels the known server job", async () => {
    const service = {
      convert: vi.fn(
        (_file, options) =>
          new Promise<VideoJobPublicType>((_resolve, reject) => {
            options.onJobUpdate?.(makeJob("uploading"));
            options.signal?.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          })
      ),
      cancel: vi.fn(async () => undefined),
    };
    const { result } = renderHook(() =>
      useVideoToAudioConversion(service)
    );

    act(() => {
      void result.current.startConversion(file, {
        outputFormat: "m4a",
        bitrateKbps: 64,
      });
    });
    await waitFor(() => expect(result.current.isBusy).toBe(true));

    await act(async () => {
      await result.current.cancel();
    });

    expect(service.cancel).toHaveBeenCalledWith("job-1");
    expect(result.current.isBusy).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
