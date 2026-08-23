// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoFileUpload } from "@/components/video/VideoFileUpload";
import { VideoConversionPanel } from "@/components/video/VideoConversionPanel";
import { VideoConversionResult } from "@/components/video/VideoConversionResult";
import { VideoToAudioWorkspace } from "@/components/video/VideoToAudioWorkspace";
import type { VideoJobPublicType } from "@/types/video-conversion";

const createVideoFile = () =>
  new File([Uint8Array.from([1])], "lesson.mov", {
    type: "video/quicktime",
  });

const hookMocks = vi.hoisted(() => ({
  useVideoToAudioConversion: vi.fn(),
}));

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

vi.mock("@/hooks/conversion/useVideoToAudioConversion", () => ({
  useVideoToAudioConversion: hookMocks.useVideoToAudioConversion,
}));

const completedJob: VideoJobPublicType = {
  id: "job-1",
  fileName: "lesson.mov",
  fileSize: 149_149_344,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
  receivedBytes: 149_149_344,
  status: "completed",
  uploadProgress: 100,
  conversionProgress: 100,
  createdAt: "2026-08-23T00:00:00.000Z",
  expiresAt: "2026-08-23T06:00:00.000Z",
  durationSeconds: 3508.69,
  outputSize: 28_100_000,
  downloadUrl: "/api/video-to-audio/jobs/job-1/download",
};

const uploadingJob: VideoJobPublicType = {
  ...completedJob,
  receivedBytes: 37_287_336,
  status: "uploading",
  uploadProgress: 25,
  conversionProgress: 0,
  durationSeconds: undefined,
  outputSize: undefined,
  downloadUrl: undefined,
};

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  vi.stubGlobal("PointerEvent", MouseEvent);
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:lesson-preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  hookMocks.useVideoToAudioConversion.mockReturnValue({
    job: null,
    error: null,
    isBusy: false,
    startConversion: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("VideoFileUpload", () => {
  it("accepts a supported MOV file", async () => {
    const onFileSelected = vi.fn();
    const user = userEvent.setup();
    render(
      <VideoFileUpload
        file={null}
        onFileSelected={onFileSelected}
        disabled={false}
      />
    );
    const input = screen.getByLabelText("Choose a video file");
    const file = createVideoFile();

    expect(
      screen.getByRole("button", { name: "Choose video" }).getAttribute(
        "data-variant"
      )
    ).toBe("secondary");

    await user.upload(input, file);

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("announces an unsupported extension", () => {
    render(
      <VideoFileUpload
        file={null}
        onFileSelected={vi.fn()}
        disabled={false}
      />
    );
    const input = screen.getByLabelText("Choose a video file");

    fireEvent.change(input, {
      target: {
        files: [
          new File([Uint8Array.from([1])], "malware.exe", {
            type: "application/octet-stream",
          }),
        ],
      },
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Video format is not supported"
    );
  });

  it("announces a file above the 8 GiB boundary", () => {
    render(
      <VideoFileUpload
        file={null}
        onFileSelected={vi.fn()}
        disabled={false}
      />
    );
    const oversizedFile = new File([Uint8Array.from([1])], "huge.mov", {
      type: "video/quicktime",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: 8 * 1024 * 1024 * 1024 + 1,
    });

    fireEvent.change(screen.getByLabelText("Choose a video file"), {
      target: { files: [oversizedFile] },
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "File exceeds the 8 GiB limit"
    );
  });
});

describe("VideoConversionPanel", () => {
  it("changes output format and bitrate through labeled controls", async () => {
    const onSettingsChange = vi.fn();
    const user = userEvent.setup();
    render(
      <VideoConversionPanel
        settings={{ outputFormat: "m4a", bitrateKbps: 64 }}
        onSettingsChange={onSettingsChange}
        disabled={false}
      />
    );

    await user.click(
      screen.getByRole("radio", { name: "MP3 Widest compatibility" })
    );
    const bitrate = screen.getByRole("combobox", { name: "Audio bitrate" });
    expect(bitrate.getAttribute("data-slot")).toBe("select-trigger");
    await user.click(bitrate);
    await user.click(screen.getByRole("option", { name: "96 kbps" }));

    expect(onSettingsChange).toHaveBeenNthCalledWith(1, {
      outputFormat: "mp3",
      bitrateKbps: 64,
    });
    expect(onSettingsChange).toHaveBeenNthCalledWith(2, {
      outputFormat: "m4a",
      bitrateKbps: 96,
    });
  });
});

describe("VideoConversionResult", () => {
  it("renders playable and downloadable completed audio", () => {
    render(
      <VideoConversionResult
        file={createVideoFile()}
        previewUrl="blob:lesson-preview"
        job={completedJob}
        error={null}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const audio = screen.getByLabelText("Converted audio preview");
    const download = screen.getByRole("link", { name: "Download M4A" });
    expect(audio.getAttribute("src")).toBe(completedJob.downloadUrl);
    expect(download.getAttribute("href")).toBe(completedJob.downloadUrl);
    expect(download.getAttribute("download")).toBe("lesson.m4a");
    expect(download.getAttribute("data-variant")).toBe("primary");
    expect(
      screen.getByRole("button", { name: "Convert another" }).getAttribute(
        "data-variant"
      )
    ).toBe("secondary");
  });

  it("announces conversion errors", () => {
    render(
      <VideoConversionResult
        file={createVideoFile()}
        previewUrl="blob:lesson-preview"
        job={null}
        error={new Error("No audio stream")}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole("alert").textContent).toContain("No audio stream");
  });

  it("shows the selected video and the conversion process before upload", () => {
    render(
      <VideoConversionResult
        file={createVideoFile()}
        previewUrl="blob:lesson-preview"
        job={null}
        error={null}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByLabelText("Selected video preview").getAttribute("src")
    ).toBe("blob:lesson-preview");
    expect(
      screen.getByRole("heading", { name: "Ready to convert" })
    ).toBeTruthy();
    expect(
      screen.getByRole("list", { name: "Conversion process" })
    ).toBeTruthy();
  });

  it("shows immediate upload preparation while the server job is being created", () => {
    render(
      <VideoConversionResult
        file={createVideoFile()}
        previewUrl="blob:lesson-preview"
        job={null}
        error={null}
        isBusy
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Preparing secure upload" })
    ).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Preparing video upload" })
    ).toBeTruthy();
  });

  it("keeps upload progress and the active process step visible after job creation", () => {
    render(
      <VideoConversionResult
        file={createVideoFile()}
        previewUrl="blob:lesson-preview"
        job={uploadingJob}
        error={null}
        isBusy
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Streaming video to temporary disk",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("progressbar", { name: "Video upload progress" })
    ).toHaveProperty("value", 25);
    const activeStep = screen
      .getByRole("list", { name: "Conversion process" })
      .querySelector('[aria-current="step"]');
    expect(activeStep?.textContent).toContain("Upload");
    expect(activeStep?.getAttribute("data-state")).toBe("active");
  });

});

describe("VideoToAudioWorkspace", () => {
  it("shows converter navigation and small-file defaults", () => {
    render(<VideoToAudioWorkspace />);

    expect(
      screen.getByRole("link", { name: "Video to audio" }).getAttribute(
        "aria-current"
      )
    ).toBe("page");
    expect(
      screen.getByRole("radio", { name: "M4A Smaller AAC audio" })
    ).toHaveProperty("checked", true);
    expect(
      screen.getByRole("combobox", { name: "Audio bitrate" }).textContent
    ).toContain("64 kbps");
    expect(
      screen.getByRole("button", { name: "Convert video" })
    ).toHaveProperty("disabled", true);
    expect(
      screen.getByRole("button", { name: "Convert video" }).getAttribute(
        "data-variant"
      )
    ).toBe("primary");
  });

  it("previews an uploaded video and exposes the conversion action region", async () => {
    const user = userEvent.setup();
    render(<VideoToAudioWorkspace />);

    await user.upload(
      screen.getByLabelText("Choose a video file"),
      createVideoFile()
    );

    expect(screen.getByLabelText("Selected video preview")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Video settings and actions" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Convert video" })
    ).toHaveProperty("disabled", false);
  });

  it("releases the local video preview URL when the workspace unmounts", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<VideoToAudioWorkspace />);

    await user.upload(
      screen.getByLabelText("Choose a video file"),
      createVideoFile()
    );
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:lesson-preview");
  });

  it("uses image-style progress rails and shadows for both scroll panels", async () => {
    render(<VideoToAudioWorkspace />);

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-scroll-progress="true"]')
      ).toHaveLength(2);
      expect(
        document.querySelectorAll('[data-scroll-shadow="true"]')
      ).toHaveLength(2);
    });
  });
});
