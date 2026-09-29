// Download service for handling individual and batch file downloads with ZIP generation

import { MemoryManagementService } from "./memory-management-service";
import type { ConversionResultType } from "@/types/conversion";
import type { DownloadOptionsType } from "@/types/components";

export type DownloadProgressType = {
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  progress: number; // 0-100
  status: "preparing" | "processing" | "completed" | "error";
  error?: Error;
};

export type DownloadJobType = {
  id: string;
  results: ConversionResultType[];
  options: DownloadOptionsType;
  onProgress?: (progress: DownloadProgressType) => void;
  onComplete?: (downloadUrl: string) => void;
  onError?: (error: Error) => void;
};

export class DownloadService {
  private static readonly MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB limit for ZIP files
  private static activeJobs = new Map<string, AbortController>();

  /**
   * Download a single converted file
   */
  static async downloadSingleFile(
    result: ConversionResultType,
    options: Partial<DownloadOptionsType> = {}
  ): Promise<void> {
    const memoryService = MemoryManagementService.getInstance();

    try {
      const filename = this.generateFilename(result, options);
      const url = URL.createObjectURL(result.convertedBlob);

      // Register blob URL for tracking
      memoryService.registerBlobUrl(url);

      this.triggerDownload(url, filename);

      // Cleanup URL after a delay to ensure download starts
      setTimeout(() => {
        memoryService.revokeBlobUrl(url);
      }, 1000);
    } catch (_error) {
      throw new Error(
        `Failed to download file: ${
          _error instanceof Error ? _error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Download multiple files as individual downloads
   */
  static async downloadMultipleFiles(
    results: ConversionResultType[],
    options: Partial<DownloadOptionsType> = {},
    onProgress?: (progress: DownloadProgressType) => void
  ): Promise<void> {
    const memoryService = MemoryManagementService.getInstance();
    const totalFiles = results.length;
    let processedFiles = 0;

    try {
      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 0,
        status: "preparing",
      });

      for (const result of results) {
        const filename = this.generateFilename(result, options);
        const url = URL.createObjectURL(result.convertedBlob);

        // Register blob URL for tracking
        memoryService.registerBlobUrl(url);

        this.triggerDownload(url, filename);

        processedFiles++;
        const progress = (processedFiles / totalFiles) * 100;

        onProgress?.({
          totalFiles,
          processedFiles,
          currentFile: filename,
          progress,
          status: "processing",
        });

        // Small delay between downloads to prevent browser blocking
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Cleanup URL
        setTimeout(() => {
          memoryService.revokeBlobUrl(url);
        }, 1000);
      }

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 100,
        status: "completed",
      });
    } catch (_error) {
      const downloadError =
        _error instanceof Error ? _error : new Error("Unknown error");
      onProgress?.({
        totalFiles,
        processedFiles,
        progress: (processedFiles / totalFiles) * 100,
        status: "error",
        error: downloadError,
      });
      throw downloadError;
    }
  }

  /**
   * Download multiple files as a ZIP archive
   */
  static async downloadAsZip(
    results: ConversionResultType[],
    options: Partial<DownloadOptionsType> = {},
    onProgress?: (progress: DownloadProgressType) => void
  ): Promise<void> {
    const memoryService = MemoryManagementService.getInstance();
    const jobId = this.generateJobId();
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);

    try {
      const totalFiles = results.length;
      let processedFiles = 0;

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 0,
        status: "preparing",
      });

      // Check total size before creating ZIP
      const totalSize = results.reduce(
        (sum, result) => sum + result.convertedSize,
        0
      );
      if (totalSize > this.MAX_ZIP_SIZE) {
        throw new Error(
          `Total file size (${this.formatFileSize(
            totalSize
          )}) exceeds ZIP limit (${this.formatFileSize(this.MAX_ZIP_SIZE)})`
        );
      }

      // Import JSZip dynamically to avoid bundling if not needed
      const JSZip = await this.loadJSZip();
      const zip = new JSZip();

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 10,
        status: "processing",
      });

      // Add files to ZIP
      const usedFilenames = new Set<string>();

      for (const result of results) {
        if (abortController.signal.aborted) {
          throw new Error("Download cancelled");
        }

        const filename = this.getUniqueZipFilename(
          this.generateFilename(result, options),
          usedFilenames
        );
        const arrayBuffer = await result.convertedBlob.arrayBuffer();

        zip.file(filename, arrayBuffer);

        processedFiles++;
        const progress = 10 + (processedFiles / totalFiles) * 70; // 10-80% for adding files

        onProgress?.({
          totalFiles,
          processedFiles,
          currentFile: filename,
          progress,
          status: "processing",
        });
      }

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 80,
        status: "processing",
        currentFile: "Generating ZIP file...",
      });

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 95,
        status: "processing",
        currentFile: "Preparing download...",
      });

      // Create download
      const zipFilename = this.generateZipFilename(options);
      const url = URL.createObjectURL(zipBlob);

      // Register blob URL for tracking
      memoryService.registerBlobUrl(url);

      this.triggerDownload(url, zipFilename);

      onProgress?.({
        totalFiles,
        processedFiles,
        progress: 100,
        status: "completed",
      });

      // Cleanup
      setTimeout(() => {
        memoryService.revokeBlobUrl(url);
      }, 1000);
    } catch (_error) {
      const downloadError =
        _error instanceof Error ? _error : new Error("Unknown error");
      onProgress?.({
        totalFiles: results.length,
        processedFiles: 0,
        progress: 0,
        status: "error",
        error: downloadError,
      });
      throw downloadError;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Cancel a download job
   */
  static cancelDownload(jobId: string): void {
    const abortController = this.activeJobs.get(jobId);
    if (abortController) {
      abortController.abort();
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Cancel all active downloads
   */
  static cancelAllDownloads(): void {
    this.activeJobs.forEach((controller) => {
      controller.abort();
    });
    this.activeJobs.clear();
  }

  /**
   * Generate filename for a downloaded / converted file
   *
   * The original file base name is always preserved and the extension follows
   * the converted format (`holiday.jpg` -> `holiday.webp`), so a converted
   * WebP is never saved with a `.jpg`/`.png` extension.
   * `customPrefix`/`addTimestamp` are legacy naming options that apply to the
   * generated name only when `preserveNames: false` is passed explicitly;
   * otherwise they only affect the ZIP archive name (see `generateZipFilename`).
   */
  private static generateFilename(
    result: ConversionResultType,
    options: Partial<DownloadOptionsType> = {}
  ): string {
    const {
      preserveNames = true,
      addTimestamp = false,
      customPrefix,
    } = options;

    let baseName = this.getBaseName(result.originalFile.name);

    if (!preserveNames) {
      // Add custom prefix if provided
      if (customPrefix) {
        baseName = `${customPrefix}_${baseName}`;
      }

      // Add timestamp if requested
      if (addTimestamp) {
        baseName = `${baseName}_${this.generateTimestamp()}`;
      }
    }

    // Add the converted format extension
    const extension = this.getFileExtension(result.format);

    return `${baseName}.${extension}`;
  }

  /**
   * Extract a safe file name: no directory parts, no control characters.
   */
  private static getSafeFileName(filename: string): string {
    const lastPathSeparatorIndex = Math.max(
      filename.lastIndexOf("/"),
      filename.lastIndexOf("\\")
    );
    const withoutPath =
      lastPathSeparatorIndex >= 0
        ? filename.slice(lastPathSeparatorIndex + 1)
        : filename;

    const sanitized = withoutPath
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim();

    return sanitized || "image";
  }

  /**
   * Extract a safe base name from a file name: no directory parts, no control
   * characters, no extension.
   */
  private static getBaseName(filename: string): string {
    const safeName = this.getSafeFileName(filename);
    const lastDotIndex = safeName.lastIndexOf(".");
    const withoutExtension =
      lastDotIndex > 0 ? safeName.substring(0, lastDotIndex) : safeName;

    return withoutExtension.trim() || "image";
  }

  /**
   * Ensure every entry inside a ZIP has a unique name. Results are keyed by
   * the full original file name, so `photo.jpg` and `photo.png` both map to
   * `photo.webp`; later duplicates become `photo (2).webp`, `photo (3).webp`, ...
   */
  private static getUniqueZipFilename(
    filename: string,
    usedFilenames: Set<string>
  ): string {
    if (!usedFilenames.has(filename)) {
      usedFilenames.add(filename);
      return filename;
    }

    const lastDotIndex = filename.lastIndexOf(".");
    const baseName =
      lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : "";

    let duplicateIndex = 2;
    let candidate = `${baseName} (${duplicateIndex})${extension}`;

    while (usedFilenames.has(candidate)) {
      duplicateIndex += 1;
      candidate = `${baseName} (${duplicateIndex})${extension}`;
    }

    usedFilenames.add(candidate);
    return candidate;
  }

  /**
   * Generate a filesystem-safe timestamp (e.g. `2026-09-29T12-36-00`)
   */
  private static generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  }

  /**
   * Generate ZIP filename
   */
  private static generateZipFilename(
    options: Partial<DownloadOptionsType> = {}
  ): string {
    const { addTimestamp = true, customPrefix = "converted_images" } = options;

    let filename = customPrefix;

    if (addTimestamp) {
      filename = `${filename}_${this.generateTimestamp()}`;
    }

    return `${filename}.zip`;
  }

  /**
   * Get file extension for format
   */
  private static getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      jpeg: "jpg",
      png: "png",
      gif: "gif",
      webp: "webp",
      avif: "avif",
      svg: "svg",
      ico: "ico",
    };

    return extensions[format] || format;
  }

  /**
   * Trigger browser download
   */
  private static triggerDownload(url: string, filename: string): void {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Load JSZip library dynamically
   */
  private static async loadJSZip(): Promise<typeof import("jszip")> {
    try {
      // Try to import JSZip
      const JSZip = await import("jszip");
      return JSZip.default || JSZip;
    } catch (_error) {
      throw new Error(
        "JSZip library is required for ZIP downloads. Please install it: npm install jszip"
      );
    }
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Generate unique job ID
   */
  private static generateJobId(): string {
    return `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active download statistics
   */
  static getDownloadStats() {
    return {
      activeDownloads: this.activeJobs.size,
    };
  }

  /**
   * Check if ZIP downloads are supported
   */
  static isZipDownloadSupported(): boolean {
    try {
      // Check if dynamic imports are supported in the environment
      return typeof window !== "undefined";
    } catch {
      return false;
    }
  }
}
