/**
 * Chunked Processing Service
 * Handles large file processing by breaking them into smaller chunks
 * to prevent memory issues and improve performance
 */

import { MemoryManagementService } from "./memory-management-service";

type ChunkType = {
  id: string;
  data: ArrayBuffer;
  width: number;
  height: number;
  x: number;
  y: number;
  chunkWidth: number;
  chunkHeight: number;
};

type ChunkedProcessingOptionsType = {
  maxChunkSize: number; // Maximum chunk size in MB
  maxConcurrentChunks: number; // Maximum concurrent chunk processing
  overlapPixels: number; // Overlap between chunks to prevent artifacts
};

type ChunkProcessingResultType = {
  chunkId: string;
  processedData: ArrayBuffer;
  success: boolean;
  error?: Error;
};

export class ChunkedProcessingService {
  private static readonly DEFAULT_OPTIONS: ChunkedProcessingOptionsType = {
    maxChunkSize: 50, // 50MB per chunk
    maxConcurrentChunks: 3, // Process 3 chunks concurrently
    overlapPixels: 16, // 16 pixel overlap
  };

  private memoryService = MemoryManagementService.getInstance();

  /**
   * Determine if a file should be processed in chunks
   */
  public shouldUseChunkedProcessing(
    file: File,
    targetDimensions?: { width: number; height: number }
  ): boolean {
    // Check file size threshold (>25MB)
    if (file.size > 25 * 1024 * 1024) {
      return true;
    }

    // Check estimated memory usage if dimensions are known
    if (targetDimensions) {
      const { width, height } = targetDimensions;
      const estimatedMemoryMB = (width * height * 4) / (1024 * 1024); // 4 bytes per pixel (RGBA)

      // Use chunked processing if estimated memory > 200MB
      if (estimatedMemoryMB > 200) {
        return true;
      }
    }

    // Check current memory pressure
    return this.memoryService.isMemoryPressureHigh();
  }

  /**
   * Calculate optimal chunk dimensions for an image
   */
  public calculateChunkDimensions(
    imageWidth: number,
    imageHeight: number,
    options: Partial<ChunkedProcessingOptionsType> = {}
  ): {
    chunkWidth: number;
    chunkHeight: number;
    chunksX: number;
    chunksY: number;
  } {
    const opts = { ...ChunkedProcessingService.DEFAULT_OPTIONS, ...options };

    // Calculate target chunk size in pixels based on memory limit
    const maxPixelsPerChunk = (opts.maxChunkSize * 1024 * 1024) / 4; // 4 bytes per pixel
    const targetChunkSize = Math.sqrt(maxPixelsPerChunk);

    // Calculate chunk dimensions while maintaining aspect ratio
    const aspectRatio = imageWidth / imageHeight;

    let chunkWidth: number;
    let chunkHeight: number;

    if (aspectRatio >= 1) {
      // Landscape or square
      chunkWidth = Math.min(
        Math.floor(targetChunkSize * aspectRatio),
        imageWidth
      );
      chunkHeight = Math.min(Math.floor(targetChunkSize), imageHeight);
    } else {
      // Portrait
      chunkWidth = Math.min(Math.floor(targetChunkSize), imageWidth);
      chunkHeight = Math.min(
        Math.floor(targetChunkSize / aspectRatio),
        imageHeight
      );
    }

    // Ensure minimum chunk size (to avoid too many small chunks)
    chunkWidth = Math.max(chunkWidth, 512);
    chunkHeight = Math.max(chunkHeight, 512);

    // Calculate number of chunks needed
    const chunksX = Math.ceil(imageWidth / chunkWidth);
    const chunksY = Math.ceil(imageHeight / chunkHeight);

    return { chunkWidth, chunkHeight, chunksX, chunksY };
  }

  /**
   * Split image data into chunks for processing
   */
  public async splitImageIntoChunks(
    imageData: ImageData,
    options: Partial<ChunkedProcessingOptionsType> = {}
  ): Promise<ChunkType[]> {
    const opts = { ...ChunkedProcessingService.DEFAULT_OPTIONS, ...options };
    const { width: imageWidth, height: imageHeight, data } = imageData;

    const { chunkWidth, chunkHeight, chunksX, chunksY } =
      this.calculateChunkDimensions(imageWidth, imageHeight, opts);

    const chunks: ChunkType[] = [];

    for (let y = 0; y < chunksY; y++) {
      for (let x = 0; x < chunksX; x++) {
        const startX = x * chunkWidth;
        const startY = y * chunkHeight;

        // Add overlap except for edges
        const overlapLeft = x > 0 ? opts.overlapPixels : 0;
        const overlapTop = y > 0 ? opts.overlapPixels : 0;
        const overlapRight = x < chunksX - 1 ? opts.overlapPixels : 0;
        const overlapBottom = y < chunksY - 1 ? opts.overlapPixels : 0;

        const chunkStartX = Math.max(0, startX - overlapLeft);
        const chunkStartY = Math.max(0, startY - overlapTop);
        const chunkEndX = Math.min(
          imageWidth,
          startX + chunkWidth + overlapRight
        );
        const chunkEndY = Math.min(
          imageHeight,
          startY + chunkHeight + overlapBottom
        );

        const actualChunkWidth = chunkEndX - chunkStartX;
        const actualChunkHeight = chunkEndY - chunkStartY;

        // Extract chunk data
        const chunkData = new Uint8ClampedArray(
          actualChunkWidth * actualChunkHeight * 4
        );

        for (let row = 0; row < actualChunkHeight; row++) {
          const sourceRow = chunkStartY + row;
          const sourceStart = (sourceRow * imageWidth + chunkStartX) * 4;
          const targetStart = row * actualChunkWidth * 4;
          const copyLength = actualChunkWidth * 4;

          chunkData.set(
            data.subarray(sourceStart, sourceStart + copyLength),
            targetStart
          );
        }

        chunks.push({
          id: `chunk-${x}-${y}`,
          data: chunkData.buffer.slice(0),
          width: imageWidth,
          height: imageHeight,
          x: chunkStartX,
          y: chunkStartY,
          chunkWidth: actualChunkWidth,
          chunkHeight: actualChunkHeight,
        });
      }
    }

    return chunks;
  }

  /**
   * Process chunks concurrently with memory management
   */
  public async processChunksConcurrently(
    chunks: ChunkType[],
    processingFunction: (
      chunk: ChunkType
    ) => Promise<ChunkProcessingResultType>,
    options: Partial<ChunkedProcessingOptionsType> = {},
    onProgress?: (
      completed: number,
      total: number,
      currentChunk?: string
    ) => void
  ): Promise<ChunkProcessingResultType[]> {
    const opts = { ...ChunkedProcessingService.DEFAULT_OPTIONS, ...options };
    const results: ChunkProcessingResultType[] = [];
    const activePromises = new Map<
      string,
      Promise<ChunkProcessingResultType>
    >();
    let completedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Wait if we've reached the concurrent limit
      while (activePromises.size >= opts.maxConcurrentChunks) {
        const [completedChunkId] = await Promise.race(
          Array.from(activePromises.entries()).map(async ([id, promise]) => {
            const result = await promise;
            return [id, result] as const;
          })
        );

        const result = await activePromises.get(completedChunkId)!;
        activePromises.delete(completedChunkId);
        results.push(result);
        completedCount++;

        onProgress?.(completedCount, chunks.length, result.chunkId);

        // Check memory pressure and cleanup if needed
        if (this.memoryService.isMemoryPressureHigh()) {
          this.memoryService.forceCleanup();

          // Wait a bit for cleanup to take effect
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Start processing the next chunk
      const promise = this.processChunkWithErrorHandling(
        chunk,
        processingFunction
      );
      activePromises.set(chunk.id, promise);
    }

    // Wait for all remaining chunks to complete
    while (activePromises.size > 0) {
      const [completedChunkId] = await Promise.race(
        Array.from(activePromises.entries()).map(async ([id, promise]) => {
          const result = await promise;
          return [id, result] as const;
        })
      );

      const result = await activePromises.get(completedChunkId)!;
      activePromises.delete(completedChunkId);
      results.push(result);
      completedCount++;

      onProgress?.(completedCount, chunks.length, result.chunkId);
    }

    // Sort results by chunk ID to maintain order
    results.sort((a, b) => a.chunkId.localeCompare(b.chunkId));

    return results;
  }

  /**
   * Process a single chunk with error handling
   */
  private async processChunkWithErrorHandling(
    chunk: ChunkType,
    processingFunction: (chunk: ChunkType) => Promise<ChunkProcessingResultType>
  ): Promise<ChunkProcessingResultType> {
    try {
      return await processingFunction(chunk);
    } catch (_error) {
      return {
        chunkId: chunk.id,
        processedData: new ArrayBuffer(0),
        success: false,
        error:
          _error instanceof Error
            ? _error
            : new Error("Unknown chunk processing error"),
      };
    }
  }

  /**
   * Reassemble processed chunks back into a single image
   */
  public async reassembleChunks(
    processedChunks: ChunkProcessingResultType[],
    originalWidth: number,
    originalHeight: number,
    options: Partial<ChunkedProcessingOptionsType> = {}
  ): Promise<ImageData> {
    const opts = { ...ChunkedProcessingService.DEFAULT_OPTIONS, ...options };

    // Create output image data
    const outputData = new Uint8ClampedArray(
      originalWidth * originalHeight * 4
    );
    const outputImageData = new ImageData(
      outputData,
      originalWidth,
      originalHeight
    );

    // Sort chunks by ID to ensure correct order
    const sortedChunks = processedChunks
      .filter((chunk) => chunk.success)
      .sort((a, b) => a.chunkId.localeCompare(b.chunkId));

    if (sortedChunks.length === 0) {
      throw new Error("No successfully processed chunks to reassemble");
    }

    // Calculate chunk layout
    const { chunkWidth, chunkHeight, chunksX, chunksY } =
      this.calculateChunkDimensions(originalWidth, originalHeight, opts);

    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      const chunkImageData = new Uint8ClampedArray(chunk.processedData);

      // Calculate chunk position
      const chunkIndex = i;
      const chunkX = chunkIndex % chunksX;
      const chunkY = Math.floor(chunkIndex / chunksX);

      const startX = chunkX * chunkWidth;
      const startY = chunkY * chunkHeight;

      // Handle overlap removal
      const overlapLeft = chunkX > 0 ? opts.overlapPixels : 0;
      const overlapTop = chunkY > 0 ? opts.overlapPixels : 0;

      const actualStartX = Math.max(0, startX - overlapLeft);
      const actualStartY = Math.max(0, startY - overlapTop);

      // Calculate dimensions for copying (excluding overlap)
      const copyStartX = startX;
      const copyStartY = startY;
      const copyEndX = Math.min(originalWidth, startX + chunkWidth);
      const copyEndY = Math.min(originalHeight, startY + chunkHeight);

      const copyWidth = copyEndX - copyStartX;
      const copyHeight = copyEndY - copyStartY;

      // Calculate source offset within chunk (to skip overlap)
      const sourceOffsetX = copyStartX - actualStartX;
      const sourceOffsetY = copyStartY - actualStartY;

      // Copy chunk data to output, excluding overlap
      for (let row = 0; row < copyHeight; row++) {
        const sourceRow = sourceOffsetY + row;
        const targetRow = copyStartY + row;

        const sourceStart =
          (sourceRow * (copyWidth + sourceOffsetX * 2) + sourceOffsetX) * 4;
        const targetStart = (targetRow * originalWidth + copyStartX) * 4;
        const copyLength = copyWidth * 4;

        outputData.set(
          chunkImageData.subarray(sourceStart, sourceStart + copyLength),
          targetStart
        );
      }
    }

    return outputImageData;
  }

  /**
   * Get memory usage estimate for chunked processing
   */
  public getMemoryEstimate(
    imageWidth: number,
    imageHeight: number,
    options: Partial<ChunkedProcessingOptionsType> = {}
  ): { totalMemoryMB: number; peakMemoryMB: number; chunkCount: number } {
    const opts = { ...ChunkedProcessingService.DEFAULT_OPTIONS, ...options };

    const { chunksX, chunksY } = this.calculateChunkDimensions(
      imageWidth,
      imageHeight,
      opts
    );
    const chunkCount = chunksX * chunksY;

    // Estimate memory per chunk (input + output + processing overhead)
    const avgChunkPixels = (imageWidth * imageHeight) / chunkCount;
    const memoryPerChunkMB = (avgChunkPixels * 4 * 3) / (1024 * 1024); // 3x for input, output, and processing

    // Peak memory is for concurrent chunks plus original image
    const originalImageMB = (imageWidth * imageHeight * 4) / (1024 * 1024);
    const peakMemoryMB =
      originalImageMB + memoryPerChunkMB * opts.maxConcurrentChunks;

    // Total memory includes all chunks processed sequentially
    const totalMemoryMB = originalImageMB + memoryPerChunkMB * chunkCount;

    return { totalMemoryMB, peakMemoryMB, chunkCount };
  }
}
