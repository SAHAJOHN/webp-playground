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
      for (const result of results) {
        if (abortController.signal.aborted) {
          throw new Error("Download cancelled");
        }

        const filename = this.generateFilename(result, options);
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
   * Generate filename for converted file
   */
  private static generateFilename(
    result: ConversionResultType,
    options: Partial<DownloadOptionsType> = {}
  ): string {
    const {
      // preserveNames = true,
      addTimestamp = false,
      customPrefix,
    } = options;

    let baseName = result.originalFile.name;

    // Remove original extension
    const lastDotIndex = baseName.lastIndexOf(".");
    if (lastDotIndex !== -1) {
      baseName = baseName.substring(0, lastDotIndex);
    }

    // Add custom prefix if provided
    if (customPrefix) {
      baseName = `${customPrefix}_${baseName}`;
    }

    // Add timestamp if requested
    if (addTimestamp) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      baseName = `${baseName}_${timestamp}`;
    }

    // Add new extension
    const extension = this.getFileExtension(result.format);

    return `${baseName}.${extension}`;
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
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      filename = `${filename}_${timestamp}`;
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
