// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClearAllArea } from "@/components/conversion/ClearAllArea";
import { DownloadArea } from "@/components/conversion/DownloadArea";
import { FileQueue } from "@/components/conversion/FileQueue";
import { FileUpload } from "@/components/ui/FileUpload";

const uploadMocks = vi.hoisted(() => ({
  announce: vi.fn(),
  openFilePicker: vi.fn(),
}));

vi.mock("@/hooks/ui/useAccessibility", () => ({
  useAccessibility: () => ({
    accessibilityMode: "normal",
    announce: uploadMocks.announce,
  }),
}));

vi.mock("@/hooks/ui/useFileUpload", () => ({
  useFileUpload: () => ({
    files: [],
    fileInfos: [],
    isDragOver: false,
    validationErrors: new Map(),
    isValidating: false,
    hasValidationErrors: false,
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handleInputChange: vi.fn(),
    openFilePicker: uploadMocks.openFilePicker,
    fileInputRef: { current: null },
    acceptedTypes: "image/jpeg,image/png,image/webp,image/avif",
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("active Image workflow actions", () => {
  it("uses shared Clear and Convert variants without changing callbacks", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const onConvertAll = vi.fn();
    render(
      <ClearAllArea
        filesInQueue={2}
        onClearAll={onClearAll}
        onConvertAll={onConvertAll}
        canConvert
      />
    );

    const clear = screen.getByRole("button", { name: "Clear All" });
    const convert = screen.getByRole("button", { name: "Convert All" });
    expect(clear.getAttribute("data-variant")).toBe("danger");
    expect(convert.getAttribute("data-variant")).toBe("primary");

    await user.click(clear);
    await user.click(convert);
    expect(onClearAll).toHaveBeenCalledOnce();
    expect(onConvertAll).toHaveBeenCalledOnce();
  });

  it("preserves disabled rules and busy copy for queue actions", () => {
    render(
      <ClearAllArea
        filesInQueue={0}
        onClearAll={vi.fn()}
        onConvertAll={vi.fn()}
        canConvert={false}
        isProcessing
        isClearing
      />
    );

    expect(screen.getByRole("button", { name: "Clearing..." })).toHaveProperty(
      "disabled",
      true
    );
    expect(
      screen.getByRole("button", { name: "Converting..." })
    ).toHaveProperty("disabled", true);
  });

  it("uses shared Download variants and preserves callbacks", async () => {
    const user = userEvent.setup();
    const onDownloadAll = vi.fn();
    const onDownloadIndividual = vi.fn();
    render(
      <DownloadArea
        filesReady={2}
        totalSaved="1 MB"
        onDownloadAll={onDownloadAll}
        onDownloadIndividual={onDownloadIndividual}
      />
    );

    const downloadAll = screen.getByRole("button", {
      name: "Download All as ZIP",
    });
    const individual = screen.getByRole("button", { name: "Individual" });
    expect(downloadAll.getAttribute("data-variant")).toBe("primary");
    expect(individual.getAttribute("data-variant")).toBe("secondary");

    await user.click(downloadAll);
    await user.click(individual);
    expect(onDownloadAll).toHaveBeenCalledOnce();
    expect(onDownloadIndividual).toHaveBeenCalledOnce();
  });

  it("uses a shared ghost remove action with a file-specific name", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <FileQueue
        files={[
          {
            id: "image-1",
            name: "sample.png",
            size: "12 KB",
            status: "pending",
          },
        ]}
        onRemove={onRemove}
      />
    );

    const remove = screen.getByRole("button", { name: "Remove sample.png" });
    expect(remove.getAttribute("data-variant")).toBe("ghost");
    await user.click(remove);
    expect(onRemove).toHaveBeenCalledWith("image-1");
  });

  it("uses the shared primary upload action without bubbling to the zone", async () => {
    const user = userEvent.setup();
    render(
      <FileUpload
        onFilesSelected={vi.fn()}
        acceptedFormats={["jpeg", "png", "webp", "avif"]}
        maxFileSize={15 * 1024 * 1024}
      />
    );

    const chooseFiles = screen.getByRole("button", {
      name: "Choose files to upload",
    });
    expect(chooseFiles.getAttribute("data-variant")).toBe("primary");

    await user.click(chooseFiles);
    expect(uploadMocks.openFilePicker).toHaveBeenCalledOnce();
  });
});
