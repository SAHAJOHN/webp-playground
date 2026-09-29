import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { DownloadService } from "./download-service";
import type { ConversionResultType } from "@/types/conversion";

type CapturedDownloadType = {
  filename: string;
  blob: Blob;
};

const downloads: CapturedDownloadType[] = [];
const blobsByUrl = new Map<string, Blob>();
let blobUrlCounter = 0;

const createResult = (
  name: string,
  format: ConversionResultType["format"] = "webp"
): ConversionResultType => {
  const originalFile = new File([`original:${name}`], name, {
    type: "image/jpeg",
  });
  const convertedBlob = new Blob([`converted:${name}`], {
    type: `image/${format}`,
  });

  return {
    originalFile,
    convertedBlob,
    originalSize: originalFile.size,
    convertedSize: convertedBlob.size,
    compressionRatio: 0.5,
    format,
  };
};

const getZipEntryNames = async (blob: Blob): Promise<string[]> => {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return Object.keys(zip.files).sort();
};

beforeEach(() => {
  downloads.length = 0;
  blobsByUrl.clear();
  blobUrlCounter = 0;

  vi.spyOn(URL, "createObjectURL").mockImplementation(
    (object: Blob | MediaSource) => {
      const url = `blob:test-${++blobUrlCounter}`;
      blobsByUrl.set(url, object as Blob);
      return url;
    }
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

  vi.stubGlobal("document", {
    createElement: () => {
      const anchor = {
        href: "",
        download: "",
        style: {} as Record<string, string>,
        click: () => {
          downloads.push({
            filename: anchor.download,
            blob: blobsByUrl.get(anchor.href) as Blob,
          });
        },
      };
      return anchor;
    },
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DownloadService ZIP entry names", () => {
  it("keeps the original base name and swaps in the converted extension", async () => {
    await DownloadService.downloadAsZip(
      [createResult("IMG_1234.jpg"), createResult("holiday photo.png")],
      { preserveNames: true, addTimestamp: true, customPrefix: "converted_images" }
    );

    const zipDownload = downloads.at(-1);

    expect(zipDownload).toBeDefined();
    expect(zipDownload?.filename).toMatch(
      /^converted_images_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/
    );
    expect(await getZipEntryNames(zipDownload!.blob)).toEqual([
      "IMG_1234.webp",
      "holiday photo.webp",
    ]);
  });

  it("applies the converted format extension to every entry", async () => {
    await DownloadService.downloadAsZip(
      [createResult("shot.png", "jpeg"), createResult("art.webp", "avif")],
      { preserveNames: true }
    );

    expect(await getZipEntryNames(downloads.at(-1)!.blob)).toEqual([
      "art.avif",
      "shot.jpg",
    ]);
  });

  it("dedupes entries that share a base name after the extension swap", async () => {
    await DownloadService.downloadAsZip(
      [createResult("photo.jpg"), createResult("photo.png")],
      { preserveNames: true }
    );

    expect(await getZipEntryNames(downloads.at(-1)!.blob)).toEqual([
      "photo (2).webp",
      "photo.webp",
    ]);
  });

  it("strips directory parts and control characters from entry names", async () => {
    await DownloadService.downloadAsZip(
      [createResult("nested/dir/photo.jpg"), createResult("bad\u0001name.png")],
      { preserveNames: true }
    );

    expect(await getZipEntryNames(downloads.at(-1)!.blob)).toEqual([
      "badname.webp",
      "photo.webp",
    ]);
  });

  it("falls back to a generic name when the name is blank", async () => {
    await DownloadService.downloadAsZip([createResult("   ")], {
      preserveNames: true,
    });

    expect(await getZipEntryNames(downloads.at(-1)!.blob)).toEqual([
      "image.webp",
    ]);
  });

  it("legacy preserveNames:false rebuilds names with prefix, timestamp and converted extension", async () => {
    await DownloadService.downloadAsZip(
      [createResult("shot.png", "jpeg"), createResult("cat.gif")],
      {
        preserveNames: false,
        customPrefix: "converted",
        addTimestamp: false,
      }
    );

    expect(await getZipEntryNames(downloads.at(-1)!.blob)).toEqual([
      "converted_cat.webp",
      "converted_shot.jpg",
    ]);
  });

  it("legacy preserveNames:false can append a timestamp", async () => {
    await DownloadService.downloadAsZip([createResult("cat.gif")], {
      preserveNames: false,
      customPrefix: "converted",
      addTimestamp: true,
    });

    const entryNames = await getZipEntryNames(downloads.at(-1)!.blob);

    expect(entryNames).toHaveLength(1);
    expect(entryNames[0]).toMatch(
      /^converted_cat_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.webp$/
    );
  });
});

describe("DownloadService individual downloads", () => {
  it("keeps original base names for individual downloads", async () => {
    await DownloadService.downloadMultipleFiles([createResult("dog.jpg")], {
      preserveNames: true,
      addTimestamp: true,
    });

    expect(downloads.map((download) => download.filename)).toEqual(["dog.webp"]);
  });

  it("applies the converted extension for single file downloads", async () => {
    await DownloadService.downloadSingleFile(createResult("cat.jpeg", "jpeg"));

    expect(downloads.map((download) => download.filename)).toEqual(["cat.jpg"]);
  });
});
