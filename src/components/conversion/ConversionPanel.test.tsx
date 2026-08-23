// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConversionPanel from "@/components/conversion/ConversionPanel";
import type { ConversionSettingsType } from "@/types/conversion";

const accessibilityMocks = vi.hoisted(() => ({
  announce: vi.fn(),
}));

vi.mock("@/hooks/ui/useAccessibility", () => ({
  useAccessibility: () => ({
    accessibilityMode: "normal",
    announce: accessibilityMocks.announce,
    isReducedMotion: false,
  }),
  useKeyboardNavigation: () => ({ onKeyDown: vi.fn() }),
}));

class ResizeObserverMock {
  observe = vi.fn();
  disconnect = vi.fn();
}

const JPEG_SETTINGS: ConversionSettingsType = {
  format: "jpeg",
  quality: 85,
  progressive: true,
  chromaSubsampling: "auto",
  mozjpeg: true,
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
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ConversionPanel", () => {
  it("changes image format through the shared compact option cards", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(
      <ConversionPanel
        settings={JPEG_SETTINGS}
        onSettingsChange={onSettingsChange}
        isProcessing={false}
      />
    );

    await user.click(screen.getByRole("radio", { name: "PNG" }));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "png",
        quality: 100,
        compressionLevel: 6,
        interlace: true,
      })
    );
  });

  it("changes chroma subsampling through the labeled Radix Select", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(
      <ConversionPanel
        settings={JPEG_SETTINGS}
        onSettingsChange={onSettingsChange}
        isProcessing={false}
      />
    );

    await user.click(
      screen.getByRole("combobox", { name: "Chroma Subsampling" })
    );
    await user.click(screen.getByRole("option", { name: "4:4:4 (Best quality)" }));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ chromaSubsampling: "4:4:4" })
    );
  });

  it("changes quality through the shared range control", () => {
    const onSettingsChange = vi.fn();
    render(
      <ConversionPanel
        settings={JPEG_SETTINGS}
        onSettingsChange={onSettingsChange}
        isProcessing={false}
      />
    );

    fireEvent.change(screen.getByRole("slider", { name: "Quality" }), {
      target: { value: "72" },
    });

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 72 })
    );
  });

  it("uses aria-pressed for the progressive JPEG toggle", async () => {
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    render(
      <ConversionPanel
        settings={JPEG_SETTINGS}
        onSettingsChange={onSettingsChange}
        isProcessing={false}
      />
    );
    const toggle = screen.getByRole("button", { name: "Progressive JPEG" });

    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await user.click(toggle);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ progressive: false })
    );
  });

  it("initializes WebP lossless quality when it is missing", () => {
    const onSettingsChange = vi.fn();
    render(
      <ConversionPanel
        settings={{
          format: "webp",
          quality: 80,
          lossless: true,
        }}
        onSettingsChange={onSettingsChange}
        isProcessing={false}
      />
    );

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ nearLossless: 100 })
    );
  });

  it("disables standardized controls while processing", () => {
    render(
      <ConversionPanel
        settings={JPEG_SETTINGS}
        onSettingsChange={vi.fn()}
        isProcessing
      />
    );

    expect(screen.getByRole("radio", { name: "PNG" })).toHaveProperty(
      "disabled",
      true
    );
    expect(
      screen.getByRole("combobox", { name: "Chroma Subsampling" })
    ).toHaveProperty("disabled", true);
    expect(screen.getByRole("slider", { name: "Quality" })).toHaveProperty(
      "disabled",
      true
    );
    expect(
      screen.getByRole("button", { name: "Progressive JPEG" })
    ).toHaveProperty("disabled", true);
  });
});
