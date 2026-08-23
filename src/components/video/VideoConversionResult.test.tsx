// @vitest-environment jsdom

import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoConversionResult } from "@/components/video/VideoConversionResult";

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

afterEach(() => {
  cleanup();
  ResizeObserverMock.instances = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VideoConversionResult signal rail", () => {
  it("fills the rail and changes bar count when the rail width changes", async () => {
    let railWidth = 260;
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        if (this.classList.contains("signal-rail")) {
          return { width: railWidth } as DOMRect;
        }

        return originalGetBoundingClientRect.call(this);
      }
    );

    const { container } = render(
      <VideoConversionResult
        file={null}
        previewUrl={null}
        job={null}
        error={null}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const getBarCount = () =>
      container.querySelectorAll(".signal-rail .signal-bar").length;

    await waitFor(() => expect(getBarCount()).toBe(20));

    railWidth = 520;
    ResizeObserverMock.instances[0]?.trigger();

    await waitFor(() => expect(getBarCount()).toBe(40));
  });

  it("measures the rail when the empty state mounts after a selected file", async () => {
    const railWidth = 260;
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect(this: HTMLElement) {
        if (this.classList.contains("signal-rail")) {
          return { width: railWidth } as DOMRect;
        }

        return originalGetBoundingClientRect.call(this);
      }
    );

    const file = new File(["video"], "clip.mov", { type: "video/quicktime" });
    const view = render(
      <VideoConversionResult
        file={file}
        previewUrl={null}
        job={null}
        error={null}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    view.rerender(
      <VideoConversionResult
        file={null}
        previewUrl={null}
        job={null}
        error={null}
        isBusy={false}
        onCancel={vi.fn()}
        onReset={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(view.container.querySelectorAll(".signal-rail .signal-bar")).toHaveLength(20)
    );
  });
});
