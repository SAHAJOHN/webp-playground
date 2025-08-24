import {
  ConversionSettingsType,
  SupportedFormatType,
  ConversionResultType,
} from "@/types/conversion";
import { ImageConversionWorkerService } from "./image-conversion-worker-service";
import { MemoryManagementService } from "./memory-management-service";
import { ChunkedProcessingService } from "./chunked-processing-service";
import { WebAssemblyFallbackService } from "./webassembly-fallback-service";
import { ProgressiveEnhancementService } from "./progressive-enhancement-service";
import { convertImageOnServer, shouldUseServerConversion } from "./server-conversion-service";

export class ImageConversionService {
  private static readonly MAX_CANVAS_SIZE = 32767; // Maximum canvas dimension
  private static readonly MAX_MEMORY_MB = 512; // Maximum memory usage in MB
  private static readonly CHUNKED_PROCESSING_THRESHOLD = 25 * 1024 * 1024; // 25MB threshold for chunked processing

  private static chunkedProcessingService = new ChunkedProcessingService();
  private static wasmFallbackService = WebAssemblyFallbackService.getInstance();
  private static progressiveEnhancementService =
    ProgressiveEnhancementService.getInstance();

  /**
   * Convert an image file to the specified format with given settings
   * Uses optimized conversion method based on file size and browser capabilities
   */
  static async convertImage(
    file: File,
    settings: ConversionSettingsType,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ConversionResultType> {
    console.log(
      "ImageConversionService.convertImage called:",
      file.name,
      settings
    );

    try {
      // Check if server-side conversion should be used
      if (shouldUseServerConversion(file, settings)) {
        console.log("Using server-side conversion for better compression");
        onProgress?.(0, "Using server for better compression...");
        
        try {
          const serverResult = await convertImageOnServer(file, settings, {
            useServer: true,
            effort: 6, // Maximum compression effort
            nearLossless: false, // True lossless for maximum quality
          });
          
          onProgress?.(100, "Server conversion complete");
          
          return {
            originalFile: file,
            convertedBlob: serverResult.convertedBlob,
            originalSize: serverResult.originalSize,
            convertedSize: serverResult.convertedSize,
            compressionRatio: serverResult.compressionRatio,
            format: serverResult.format,
          };
        } catch (serverError) {
          console.warn("Server conversion failed, falling back to client:", serverError);
          onProgress?.(0, "Server unavailable, using client conversion...");
          // Fall through to client-side conversion
        }
      }

      // Client-side conversion
      onProgress?.(0, "Starting conversion...");

      // Validate input file
      this.validateFile(file);
      onProgress?.(10, "File validated");
      console.log("File validated:", file.name);

      // Load image into canvas
      const canvas = await this.loadImageToCanvas(file);
      onProgress?.(50, "Image loaded to canvas");
      console.log("Image loaded to canvas:", canvas.width, "x", canvas.height);

      // Validate canvas dimensions for memory safety
      this.validateCanvasDimensions(canvas);
      onProgress?.(60, "Canvas validated");

      // Convert to target format
      const convertedBlob = await this.convertCanvasToFormat(canvas, settings);
      onProgress?.(90, "Format conversion complete");
      console.log("Conversion complete:", convertedBlob.size, "bytes");

      // Calculate compression metrics
      const compressionRatio = file.size / convertedBlob.size;

      // Cleanup canvas
      this.cleanupCanvas(canvas);
      onProgress?.(100, "Conversion complete");

      const result = {
        originalFile: file,
        convertedBlob,
        originalSize: file.size,
        convertedSize: convertedBlob.size,
        compressionRatio,
        format: settings.format,
      };

      console.log("Returning conversion result:", result);
      return result;
    } catch (error) {
      console.error("ImageConversionService error:", error);
      throw new Error(
        `Conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Convert image using Web Worker (non-blocking)
   */
  private static async convertImageWithWorker(
    file: File,
    settings: ConversionSettingsType,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ConversionResultType> {
    return new Promise((resolve, reject) => {
      const workerService = ImageConversionWorkerService.getInstance();
      const jobId = `job-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const job = {
        id: jobId,
        file,
        settings,
        onProgress: onProgress || (() => {}),
        onComplete: resolve,
        onError: reject,
      };

      workerService.convertImage(job);
    });
  }

  /**
   * Convert large image using chunked processing
   */
  private static async convertLargeImageWithChunking(
    file: File,
    settings: ConversionSettingsType,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ConversionResultType> {
    const memoryService = MemoryManagementService.getInstance();

    try {
      onProgress?.(0, "Starting chunked processing for large file...");

      // Validate input file
      this.validateFile(file);
      onProgress?.(5, "File validated");

      // Load image to get dimensions
      const canvas = await this.loadImageToCanvas(file);
      onProgress?.(15, "Image loaded, analyzing dimensions");

      // Check if chunked processing is needed
      const shouldUseChunking =
        this.chunkedProcessingService.shouldUseChunkedProcessing(file, {
          width: canvas.width,
          height: canvas.height,
        });

      if (!shouldUseChunking) {
        // File is not as large as expected, use regular processing
        this.cleanupCanvas(canvas);
        return this.convertImageMainThreadEnhanced(file, settings, onProgress);
      }

      onProgress?.(20, "Preparing chunked processing...");

      // Get image data for chunking
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas 2D context");
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onProgress?.(30, "Image data extracted");

      // Split into chunks
      const chunks = await this.chunkedProcessingService.splitImageIntoChunks(
        imageData
      );
      onProgress?.(40, `Split into ${chunks.length} chunks`);

      // Process chunks concurrently
      const processedChunks =
        await this.chunkedProcessingService.processChunksConcurrently(
          chunks,
          async (chunk) => {
            // Process individual chunk
            const chunkImageData = new ImageData(
              new Uint8ClampedArray(chunk.data),
              chunk.chunkWidth,
              chunk.chunkHeight
            );

            // Use WebAssembly fallback for chunk processing if available
            const convertedBlob = await this.wasmFallbackService.convertImage(
              chunkImageData,
              settings
            );

            return {
              chunkId: chunk.id,
              processedData: await convertedBlob.arrayBuffer(),
              success: true,
            };
          },
          {},
          (completed, total, currentChunk) => {
            const chunkProgress = 40 + (completed / total) * 40; // 40-80% for chunk processing
            onProgress?.(
              chunkProgress,
              `Processing chunk ${completed}/${total}`
            );
          }
        );

      onProgress?.(80, "Reassembling chunks...");

      // Reassemble chunks
      const reassembledImageData =
        await this.chunkedProcessingService.reassembleChunks(
          processedChunks,
          canvas.width,
          canvas.height
        );

      onProgress?.(90, "Final conversion...");

      // Convert reassembled image to final format
      const convertedBlob = await this.wasmFallbackService.convertImage(
        reassembledImageData,
        settings
      );

      // Calculate compression metrics
      const compressionRatio = file.size / convertedBlob.size;

      // Cleanup
      this.cleanupCanvas(canvas);
      onProgress?.(100, "Chunked conversion complete");

      return {
        originalFile: file,
        convertedBlob,
        originalSize: file.size,
        convertedSize: convertedBlob.size,
        compressionRatio,
        format: settings.format,
      };
    } catch (error) {
      throw new Error(
        `Chunked conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Convert image on main thread with enhanced capabilities (blocking, fallback)
   */
  private static async convertImageMainThreadEnhanced(
    file: File,
    settings: ConversionSettingsType,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ConversionResultType> {
    const memoryService = MemoryManagementService.getInstance();

    try {
      onProgress?.(0, "Starting conversion...");

      // Check memory pressure before starting
      if (memoryService.isMemoryPressureHigh()) {
        onProgress?.(5, "Performing memory cleanup...");
        memoryService.forceCleanup();

        // Wait a bit for cleanup to take effect
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Validate input file
      this.validateFile(file);
      onProgress?.(10, "File validated");

      // Load image into canvas
      const canvas = await this.loadImageToCanvas(file);
      onProgress?.(40, "Image loaded to canvas");

      // Validate canvas dimensions for memory safety
      this.validateCanvasDimensions(canvas);
      onProgress?.(50, "Canvas validated");

      // Convert to target format using best available method
      const convertedBlob = await this.convertCanvasToFormatEnhanced(
        canvas,
        settings
      );
      onProgress?.(90, "Format conversion complete");

      // Calculate compression metrics
      const compressionRatio = file.size / convertedBlob.size;

      // Cleanup canvas
      this.cleanupCanvas(canvas);
      onProgress?.(100, "Conversion complete");

      return {
        originalFile: file,
        convertedBlob,
        originalSize: file.size,
        convertedSize: convertedBlob.size,
        compressionRatio,
        format: settings.format,
      };
    } catch (error) {
      throw new Error(
        `Conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if Web Workers are supported
   */
  private static isWebWorkerSupported(): boolean {
    return typeof Worker !== "undefined";
  }

  /**
   * Load image file into a canvas element
   */
  private static async loadImageToCanvas(
    file: File
  ): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let blobUrl: string | null = null;

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Failed to get canvas 2D context");
          }

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          // Cleanup blob URL
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }

          resolve(canvas);
        } catch (error) {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
          reject(error);
        }
      };

      img.onerror = () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        reject(new Error("Failed to load image"));
      };

      blobUrl = URL.createObjectURL(file);
      img.src = blobUrl;
    });
  }

  /**
   * Convert canvas to specified format with enhanced capabilities
   */
  private static async convertCanvasToFormatEnhanced(
    canvas: HTMLCanvasElement,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    try {
      // Get image data from canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas 2D context");
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Try WebAssembly fallback first for better format support
      try {
        return await this.wasmFallbackService.convertImage(imageData, settings);
      } catch {
        // Fall back to regular canvas conversion
        return this.convertCanvasToFormat(canvas, settings);
      }
    } catch (error) {
      throw new Error(`Enhanced conversion failed: ${error}`);
    }
  }

  /**
   * Convert canvas to specified format with settings (original method)
   */
  private static async convertCanvasToFormat(
    canvas: HTMLCanvasElement,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const mimeType = this.getMimeType(settings.format);
        const quality = this.getQualityValue(settings);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error(`Failed to convert to ${settings.format}`));
            }
          },
          mimeType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get MIME type for format
   */
  private static getMimeType(format: SupportedFormatType): string {
    const mimeTypes: Record<SupportedFormatType, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };

    return mimeTypes[format];
  }

  /**
   * Get quality value for canvas.toBlob()
   */
  private static getQualityValue(
    settings: ConversionSettingsType
  ): number | undefined {
    // Special handling for WebP - check lossless mode
    if (settings.format === "webp") {
      if (settings.lossless) {
        // For lossless WebP, use quality = 1.0
        // Firefox 105+ and some other browsers use this to trigger lossless encoding
        return 1.0;
      }
      return settings.quality / 100; // Convert 1-100 to 0-1 for lossy WebP
    }

    // Other lossy formats always use quality
    const lossyFormats: SupportedFormatType[] = ["jpeg", "avif"];
    if (lossyFormats.includes(settings.format)) {
      return settings.quality / 100; // Convert 1-100 to 0-1
    }

    return undefined; // Lossless formats don't use quality
  }

  /**
   * Validate input file
   */
  private static validateFile(file: File): void {
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size === 0) {
      throw new Error("File is empty");
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 100MB limit");
    }
  }

  /**
   * Validate canvas dimensions for memory safety
   */
  private static validateCanvasDimensions(canvas: HTMLCanvasElement): void {
    const { width, height } = canvas;

    // Check individual dimension limits
    if (width > this.MAX_CANVAS_SIZE || height > this.MAX_CANVAS_SIZE) {
      throw new Error(
        `Image dimensions too large. Maximum: ${this.MAX_CANVAS_SIZE}px`
      );
    }

    // Check memory usage (4 bytes per pixel for RGBA)
    const memoryMB = (width * height * 4) / (1024 * 1024);
    if (memoryMB > this.MAX_MEMORY_MB) {
      throw new Error(
        `Image requires too much memory: ${memoryMB.toFixed(1)}MB (max: ${
          this.MAX_MEMORY_MB
        }MB)`
      );
    }
  }

  /**
   * Cleanup canvas resources
   */
  private static cleanupCanvas(canvas: HTMLCanvasElement): void {
    try {
      const memoryService = MemoryManagementService.getInstance();
      memoryService.cleanupCanvas(canvas);
    } catch {
      // Fallback cleanup if memory service is not available
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  /**
   * Check if format is supported by the browser (enhanced)
   */
  static async isFormatSupported(
    format: SupportedFormatType
  ): Promise<boolean> {
    // Initialize progressive enhancement if not already done
    await this.progressiveEnhancementService.initialize();

    // Check using progressive enhancement service
    const supportedFormats =
      this.progressiveEnhancementService.getSupportedFormats();
    return supportedFormats.includes(format);
  }

  /**
   * Get supported formats for current browser (enhanced)
   */
  static async getSupportedFormats(): Promise<SupportedFormatType[]> {
    // Initialize progressive enhancement if not already done
    await this.progressiveEnhancementService.initialize();

    return this.progressiveEnhancementService.getSupportedFormats();
  }

  /**
   * Check if format is supported by the browser (synchronous, legacy)
   */
  static isFormatSupportedSync(format: SupportedFormatType): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;

    const mimeType = this.getMimeType(format);

    // Test if browser can create blob in this format
    try {
      canvas.toBlob(() => {}, mimeType, 0.5);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get supported formats for current browser (synchronous, legacy)
   */
  static getSupportedFormatsSync(): SupportedFormatType[] {
    const allFormats: SupportedFormatType[] = [
      "jpeg",
      "png",
      "gif",
      "webp",
      "avif",
      "svg",
      "ico",
    ];
    return allFormats.filter((format) => this.isFormatSupportedSync(format));
  }

  /**
   * Get the Web Worker service instance
   */
  static getWorkerService(): ImageConversionWorkerService | null {
    if (this.isWebWorkerSupported()) {
      return ImageConversionWorkerService.getInstance();
    }
    return null;
  }

  /**
   * Cancel all active conversion jobs
   */
  static cancelAllJobs(): void {
    const workerService = this.getWorkerService();
    if (workerService) {
      workerService.cancelAllJobs();
    }
  }

  /**
   * Get conversion job statistics
   */
  static getJobStats() {
    const workerService = this.getWorkerService();
    if (workerService) {
      return workerService.getJobStats();
    }
    return { pending: 0, processing: 0, completed: 0, errors: 0 };
  }

  /**
   * Get performance metrics and optimization recommendations
   */
  static async getPerformanceMetrics(): Promise<{
    browserCapabilities: Record<string, unknown>;
    memoryUsage: unknown;
    recommendedSettings: unknown;
    optimizationTips: string[];
  }> {
    await this.progressiveEnhancementService.initialize();

    const capabilities = this.progressiveEnhancementService.getFeatures();
    const memoryService = MemoryManagementService.getInstance();
    const memoryStats = memoryService.getMemoryStats();

    const optimizationTips: string[] = [];

    // Generate optimization recommendations
    if (!capabilities?.webWorkers) {
      optimizationTips.push(
        "Enable Web Workers for better performance with large files"
      );
    }

    if (!capabilities?.webAssembly) {
      optimizationTips.push(
        "WebAssembly support would improve conversion speed"
      );
    }

    if (memoryStats.estimatedCanvasMemory > 200) {
      optimizationTips.push(
        "Consider using smaller images or chunked processing to reduce memory usage"
      );
    }

    if (!capabilities?.webp) {
      optimizationTips.push(
        "WebP format not supported - consider using JPEG for lossy compression"
      );
    }

    if (!capabilities?.avif) {
      optimizationTips.push(
        "AVIF format not supported - WebP or JPEG recommended for modern compression"
      );
    }

    return {
      browserCapabilities: capabilities as Record<string, unknown>,
      memoryUsage: memoryStats,
      recommendedSettings: {
        maxConcurrentJobs: capabilities?.webWorkers ? 4 : 1,
        useChunkedProcessing: memoryStats.estimatedCanvasMemory > 100,
        preferredFormats:
          this.progressiveEnhancementService.getSupportedFormats(),
      },
      optimizationTips,
    };
  }

  /**
   * Optimize conversion settings based on file and browser capabilities
   */
  static async optimizeConversionSettings(
    file: File,
    targetFormat: SupportedFormatType,
    userSettings: Partial<ConversionSettingsType> = {}
  ): Promise<ConversionSettingsType> {
    await this.progressiveEnhancementService.initialize();

    // Get recommended settings from progressive enhancement
    const recommended =
      this.progressiveEnhancementService.getRecommendedSettings(targetFormat);

    // Adjust based on file size
    let quality = userSettings.quality ?? recommended.quality ?? 80;

    if (file.size > 50 * 1024 * 1024) {
      // >50MB
      quality = Math.min(quality, 70); // Reduce quality for very large files
    } else if (file.size < 1024 * 1024) {
      // <1MB
      quality = Math.max(quality, 90); // Higher quality for small files
    }

    // Adjust based on memory pressure
    const memoryService = MemoryManagementService.getInstance();
    if (memoryService.isMemoryPressureHigh()) {
      quality = Math.min(quality, 60); // Aggressive compression under memory pressure
    }

    return {
      format: recommended.format ?? targetFormat,
      quality,
      ...userSettings, // User settings take precedence
    };
  }

  /**
   * Estimate conversion time and memory usage
   */
  static async estimateConversionMetrics(
    file: File,
    settings: ConversionSettingsType
  ): Promise<{
    estimatedTimeMs: number;
    estimatedMemoryMB: number;
    recommendChunkedProcessing: boolean;
    recommendWebWorker: boolean;
  }> {
    await this.progressiveEnhancementService.initialize();

    const capabilities = this.progressiveEnhancementService.getFeatures();

    // Estimate based on file size (rough approximation)
    const fileSizeMB = file.size / (1024 * 1024);

    // Base processing time: ~100ms per MB
    let estimatedTimeMs = fileSizeMB * 100;

    // Adjust for browser capabilities
    if (capabilities?.webWorkers) {
      estimatedTimeMs *= 0.7; // 30% faster with workers
    }

    if (capabilities?.webAssembly) {
      estimatedTimeMs *= 0.8; // 20% faster with WASM
    }

    // Estimate memory usage (4 bytes per pixel, assuming average compression)
    const estimatedPixels = fileSizeMB * 1024 * 256; // Rough estimate
    const estimatedMemoryMB = (estimatedPixels * 4) / (1024 * 1024);

    return {
      estimatedTimeMs,
      estimatedMemoryMB,
      recommendChunkedProcessing: fileSizeMB > 25 || estimatedMemoryMB > 200,
      recommendWebWorker: fileSizeMB > 5 && capabilities?.webWorkers === true,
    };
  }
}
