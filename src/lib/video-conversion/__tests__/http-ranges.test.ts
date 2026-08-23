import { describe, expect, it } from "vitest";
import {
  parseDownloadRange,
  parseUploadContentRange,
} from "@/lib/video-conversion/http-ranges";

describe("parseUploadContentRange", () => {
  it("parses a bounded upload chunk", () => {
    expect(
      parseUploadContentRange("bytes 0-16777215/149149344")
    ).toEqual({
      start: 0,
      end: 16_777_215,
      total: 149_149_344,
      length: 16_777_216,
    });
  });

  it.each([
    "bytes 0-9/*",
    "bytes=0-9/10",
    "bytes 10-9/20",
    "bytes 0-20/20",
    "bytes -1-9/20",
    "bytes 0-9/0",
    "bytes 0-9/20, bytes 10-19/20",
  ])("rejects malformed upload range %s", (header) => {
    expect(parseUploadContentRange(header)).toBeNull();
  });
});

describe("parseDownloadRange", () => {
  it("parses an explicit byte range", () => {
    expect(parseDownloadRange("bytes=100-199", 1_000)).toEqual({
      start: 100,
      end: 199,
      length: 100,
    });
  });

  it("parses a suffix byte range", () => {
    expect(parseDownloadRange("bytes=-100", 1_000)).toEqual({
      start: 900,
      end: 999,
      length: 100,
    });
  });

  it("parses an open-ended byte range", () => {
    expect(parseDownloadRange("bytes=900-", 1_000)).toEqual({
      start: 900,
      end: 999,
      length: 100,
    });
  });

  it("clamps an end beyond the file boundary", () => {
    expect(parseDownloadRange("bytes=900-1200", 1_000)).toEqual({
      start: 900,
      end: 999,
      length: 100,
    });
  });

  it.each([
    ["bytes=2000-", 1_000],
    ["bytes=200-100", 1_000],
    ["bytes=-0", 1_000],
    ["bytes=0-1,2-3", 1_000],
    ["items=0-1", 1_000],
    ["bytes=0-1", 0],
  ] as const)("rejects invalid download range %s", (header, size) => {
    expect(parseDownloadRange(header, size)).toBeNull();
  });
});
