import { describe, expect, it } from "vitest";
import {
  MAX_VIDEO_FILE_SIZE_BYTES,
  validateCreateVideoJobInput,
} from "@/lib/video-conversion/validation";

const validInput = {
  fileName: "705432-Ch1-Part1.mov",
  fileSize: 149_149_344,
  contentType: "video/quicktime",
  outputFormat: "m4a",
  bitrateKbps: 64,
};

describe("validateCreateVideoJobInput", () => {
  it("accepts a supported video and preserves normalized settings", () => {
    expect(validateCreateVideoJobInput(validInput)).toEqual({
      ok: true,
      value: validInput,
    });
  });

  it("accepts a file exactly at the 8 GiB boundary", () => {
    expect(
      validateCreateVideoJobInput({
        ...validInput,
        fileSize: MAX_VIDEO_FILE_SIZE_BYTES,
      })
    ).toMatchObject({ ok: true });
  });

  it("rejects a file larger than 8 GiB", () => {
    expect(
      validateCreateVideoJobInput({
        ...validInput,
        fileSize: MAX_VIDEO_FILE_SIZE_BYTES + 1,
      })
    ).toMatchObject({ ok: false, code: "FILE_TOO_LARGE" });
  });

  it("rejects unsupported file extensions", () => {
    expect(
      validateCreateVideoJobInput({ ...validInput, fileName: "video.exe" })
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_VIDEO_FORMAT" });
  });

  it("matches supported extensions without case sensitivity", () => {
    expect(
      validateCreateVideoJobInput({ ...validInput, fileName: "VIDEO.MKV" })
    ).toMatchObject({ ok: true });
  });

  it("rejects unsupported output formats", () => {
    expect(
      validateCreateVideoJobInput({ ...validInput, outputFormat: "wav" })
    ).toMatchObject({ ok: false, code: "INVALID_OUTPUT_FORMAT" });
  });

  it("rejects bitrates outside the explicit allowlist", () => {
    expect(
      validateCreateVideoJobInput({ ...validInput, bitrateKbps: 72 })
    ).toMatchObject({ ok: false, code: "INVALID_BITRATE" });
  });

  it.each([
    null,
    {},
    { ...validInput, fileName: "" },
    { ...validInput, fileSize: 0 },
    { ...validInput, fileSize: Number.NaN },
  ])("rejects malformed create-job payload %#", (input) => {
    expect(validateCreateVideoJobInput(input)).toMatchObject({ ok: false });
  });
});
