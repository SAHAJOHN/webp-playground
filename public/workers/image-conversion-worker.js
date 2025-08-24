// Image Conversion Web Worker
// Handles image processing operations in a separate thread to prevent UI blocking

// Worker message types
const MESSAGE_TYPES = {
  CONVERT_IMAGE: "CONVERT_IMAGE",
  CONVERT_CHUNK: "CONVERT_CHUNK",
  PROGRESS_UPDATE: "PROGRESS_UPDATE",
  CONVERSION_COMPLETE: "CONVERSION_COMPLETE",
  CONVERSION_ERROR: "CONVERSION_ERROR",
  WORKER_READY: "WORKER_READY",
  CLEANUP_MEMORY: "CLEANUP_MEMORY",
  PERFORMANCE_BENCHMARK: "PERFORMANCE_BENCHMARK",
};

// Configuration constants
const MAX_CANVAS_SIZE = 32767;
const MAX_MEMORY_MB = 512;

// Job queue for managing multiple conversion requests
const jobQueue = new Map();

// Memory management for worker
const workerMemory = {
  activeBlobUrls: new Set(),
  canvasMemoryEstimate: 0,
  lastCleanup: 0,

  registerBlobUrl(url) {
    this.activeBlobUrls.add(url);
  },

  revokeBlobUrl(url) {
    if (this.activeBlobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeBlobUrls.delete(url);
    }
  },

  registerCanvas(canvas) {
    const memoryMB = (canvas.width * canvas.height * 4) / (1024 * 1024);
    this.canvasMemoryEstimate += memoryMB;
  },

  cleanupCanvas(canvas) {
    const memoryMB = (canvas.width * canvas.height * 4) / (1024 * 1024);
    this.canvasMemoryEstimate = Math.max(
      0,
      this.canvasMemoryEstimate - memoryMB
    );

    // Reset canvas dimensions
    canvas.width = 0;
    canvas.height = 0;
  },

  performCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < 5000) return; // Throttle cleanup

    this.lastCleanup = now;

    // Cleanup old blob URLs
    this.activeBlobUrls.forEach((url) => {
      this.revokeBlobUrl(url);
    });

    // Reset memory estimates
    this.canvasMemoryEstimate = Math.max(0, this.canvasMemoryEstimate * 0.5);

    // Force garbage collection attempt
    if (typeof gc === "function") {
      try {
        gc();
      } catch {
        // Ignore errors
      }
    }
  },

  isMemoryPressureHigh() {
    return this.canvasMemoryEstimate > 300 || this.activeBlobUrls.size > 50;
  },
};

// Initialize worker
self.addEventListener("message", handleMessage);

// Send ready signal when worker loads
self.postMessage({
  type: MESSAGE_TYPES.WORKER_READY,
  timestamp: Date.now(),
});

/**
 * Handle incoming messages from main thread
 */
function handleMessage(event) {
  const { type, payload } = event.data;

  switch (type) {
    case MESSAGE_TYPES.CONVERT_IMAGE:
      handleConversionRequest(payload);
      break;
    case MESSAGE_TYPES.CONVERT_CHUNK:
      handleChunkConversionRequest(payload);
      break;
    case MESSAGE_TYPES.CLEANUP_MEMORY:
      workerMemory.performCleanup();
      break;
    case MESSAGE_TYPES.PERFORMANCE_BENCHMARK:
      handlePerformanceBenchmark(payload);
      break;
    default:
      console.warn("Unknown message type:", type);
  }
}

/**
 * Handle image conversion request
 */
async function handleConversionRequest(payload) {
  const { jobId, fileData, fileName, settings } = payload;

  try {
    // Add job to queue
    jobQueue.set(jobId, { status: "processing", startTime: Date.now() });

    // Check memory pressure before starting
    if (workerMemory.isMemoryPressureHigh()) {
      reportProgress(jobId, 2, "Performing memory cleanup...");
      workerMemory.performCleanup();

      // Wait a bit for cleanup to take effect
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Report initial progress
    reportProgress(jobId, 0, "Starting conversion...");

    // Convert ArrayBuffer back to File-like object
    const file = new File([fileData], fileName, { type: "image/*" });

    // Perform conversion
    const result = await convertImage(file, settings, jobId);

    // Report completion
    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_COMPLETE,
      payload: {
        jobId,
        result: {
          convertedBlob: result.convertedBlob,
          originalSize: result.originalSize,
          convertedSize: result.convertedSize,
          compressionRatio: result.compressionRatio,
          format: result.format,
        },
      },
    });

    // Clean up job
    jobQueue.delete(jobId);
  } catch (error) {
    // Report error
    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_ERROR,
      payload: {
        jobId,
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
    });

    // Clean up job
    jobQueue.delete(jobId);
  }
}

/**
 * Convert image file to specified format
 */
async function convertImage(file, settings, jobId) {
  try {
    // Validate input file
    validateFile(file);
    reportProgress(jobId, 10, "File validated");

    // Load image into canvas
    const canvas = await loadImageToCanvas(file, jobId);
    reportProgress(jobId, 40, "Image loaded to canvas");

    // Validate canvas dimensions
    validateCanvasDimensions(canvas);
    reportProgress(jobId, 50, "Canvas validated");

    // Convert to target format
    const convertedBlob = await convertCanvasToFormat(canvas, settings, jobId);
    reportProgress(jobId, 90, "Format conversion complete");

    // Calculate metrics
    const compressionRatio = file.size / convertedBlob.size;

    // Cleanup
    cleanupCanvas(canvas);
    reportProgress(jobId, 100, "Conversion complete");

    return {
      convertedBlob,
      originalSize: file.size,
      convertedSize: convertedBlob.size,
      compressionRatio,
      format: settings.format,
    };
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}

/**
 * Load image file into canvas
 */
async function loadImageToCanvas(file, jobId) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let blobUrl = null;
      try {
        // Create OffscreenCanvas for better performance in worker
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Failed to get canvas 2D context");
        }

        ctx.drawImage(img, 0, 0);
        reportProgress(jobId, 30, "Image drawn to canvas");

        // Register canvas with memory management
        workerMemory.registerCanvas(canvas);

        // Cleanup blob URL
        blobUrl = img.src;
        workerMemory.revokeBlobUrl(blobUrl);

        resolve(canvas);
      } catch (error) {
        if (blobUrl) {
          workerMemory.revokeBlobUrl(blobUrl);
        }
        reject(error);
      }
    };

    img.onerror = () => {
      const blobUrl = img.src;
      workerMemory.revokeBlobUrl(blobUrl);
      reject(new Error("Failed to load image"));
    };

    const blobUrl = URL.createObjectURL(file);
    workerMemory.registerBlobUrl(blobUrl);
    img.src = blobUrl;
    reportProgress(jobId, 20, "Loading image...");
  });
}

/**
 * Convert canvas to specified format with optimizations
 */
async function convertCanvasToFormat(canvas, settings, jobId) {
  return new Promise(async (resolve, reject) => {
    try {
      const mimeType = getMimeType(settings.format);
      let quality = getQualityValue(settings);

      reportProgress(jobId, 70, `Converting to ${settings.format}...`);

      // For WebP lossless, try multiple encoding approaches
      if (settings.format === "webp" && settings.lossless) {
        // First, ensure we're using the highest quality settings
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Disable image smoothing for pixel-perfect conversion
          ctx.imageSmoothingEnabled = false;
          ctx.imageSmoothingQuality = "high";
        }

        // Try with explicit lossless parameters if supported
        let blob = null;
        
        // Method 1: Use quality = 1.0 (standard approach)
        try {
          blob = await canvas.convertToBlob({
            type: mimeType,
            quality: 1.0,
          });
        } catch (e) {
          console.warn("Standard lossless WebP conversion failed:", e);
        }

        // Method 2: Try without quality parameter (some browsers handle this better)
        if (!blob || blob.size === 0) {
          try {
            blob = await canvas.convertToBlob({
              type: mimeType,
            });
          } catch (e) {
            console.warn("WebP conversion without quality failed:", e);
          }
        }

        // Method 3: Force PNG first, then convert to WebP for better quality
        if (!blob || settings.forceHighQuality) {
          try {
            // First get PNG (lossless)
            const pngBlob = await canvas.convertToBlob({
              type: "image/png",
            });
            
            // Load PNG and reconvert to WebP
            const img = await createImageBitmap(pngBlob);
            const newCanvas = new OffscreenCanvas(img.width, img.height);
            const newCtx = newCanvas.getContext("2d");
            if (newCtx) {
              newCtx.imageSmoothingEnabled = false;
              newCtx.drawImage(img, 0, 0);
              blob = await newCanvas.convertToBlob({
                type: mimeType,
                quality: 1.0,
              });
            }
          } catch (e) {
            console.warn("PNG to WebP conversion failed:", e);
          }
        }

        if (blob) {
          reportProgress(jobId, 85, "Lossless WebP created successfully");
          resolve(blob);
        } else {
          reject(new Error("Failed to create lossless WebP"));
        }
      } else {
        // Standard conversion for other formats
        canvas
          .convertToBlob({
            type: mimeType,
            quality: quality,
          })
          .then((blob) => {
            if (blob) {
              reportProgress(jobId, 85, "Blob created successfully");
              resolve(blob);
            } else {
              reject(new Error(`Failed to convert to ${settings.format}`));
            }
          })
          .catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get MIME type for format
 */
function getMimeType(format) {
  const mimeTypes = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };

  return mimeTypes[format];
}

/**
 * Get quality value for conversion
 */
function getQualityValue(settings) {
  // Special handling for WebP - check lossless mode
  if (settings.format === "webp") {
    if (settings.lossless) {
      // For lossless WebP, always use quality = 1.0
      // This ensures maximum quality preservation
      return 1.0;
    }
    return settings.quality / 100; // Convert 1-100 to 0-1 for lossy WebP
  }

  // Other lossy formats always use quality
  const lossyFormats = ["jpeg", "avif"];
  if (lossyFormats.includes(settings.format)) {
    return settings.quality / 100; // Convert 1-100 to 0-1
  }

  return undefined; // Lossless formats don't use quality
}

/**
 * Validate input file
 */
function validateFile(file) {
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
function validateCanvasDimensions(canvas) {
  const { width, height } = canvas;

  // Check individual dimension limits
  if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
    throw new Error(
      `Image dimensions too large. Maximum: ${MAX_CANVAS_SIZE}px`
    );
  }

  // Check memory usage (4 bytes per pixel for RGBA)
  const memoryMB = (width * height * 4) / (1024 * 1024);
  if (memoryMB > MAX_MEMORY_MB) {
    throw new Error(
      `Image requires too much memory: ${memoryMB.toFixed(
        1
      )}MB (max: ${MAX_MEMORY_MB}MB)`
    );
  }
}

/**
 * Cleanup canvas resources
 */
function cleanupCanvas(canvas) {
  workerMemory.cleanupCanvas(canvas);
}

/**
 * Handle chunk conversion request (optimized for chunked processing)
 */
async function handleChunkConversionRequest(payload) {
  const { jobId, chunkId, chunkData, chunkWidth, chunkHeight, settings } =
    payload;

  try {
    // Add chunk to queue
    jobQueue.set(jobId, { status: "processing", startTime: Date.now() });

    reportProgress(jobId, 0, `Processing chunk ${chunkId}...`);

    // Create ImageData from chunk
    const imageData = new ImageData(
      new Uint8ClampedArray(chunkData),
      chunkWidth,
      chunkHeight
    );

    // Convert chunk using optimized processing
    const result = await convertImageDataOptimized(imageData, settings, jobId);

    // Report completion
    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_COMPLETE,
      payload: {
        jobId,
        chunkId,
        result: {
          convertedBlob: result.convertedBlob,
          originalSize: chunkData.byteLength,
          convertedSize: result.convertedSize,
          compressionRatio: result.compressionRatio,
          format: result.format,
        },
      },
    });

    // Clean up job
    jobQueue.delete(jobId);
  } catch (error) {
    // Report error
    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_ERROR,
      payload: {
        jobId,
        chunkId,
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
    });

    // Clean up job
    jobQueue.delete(jobId);
  }
}

/**
 * Optimized image conversion for chunks and performance
 */
async function convertImageDataOptimized(imageData, settings, jobId) {
  try {
    reportProgress(jobId, 10, "Starting optimized conversion...");

    // Use OffscreenCanvas for better performance if available
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(imageData.width, imageData.height);
    } else {
      // Fallback to regular canvas (though this shouldn't happen in worker)
      canvas = { width: imageData.width, height: imageData.height };
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context for optimized conversion");
    }

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);
    reportProgress(jobId, 40, "Image data applied to canvas");

    // Convert using optimized method
    const mimeType = getMimeType(settings.format);
    const quality = getQualityValue(settings);

    reportProgress(jobId, 70, `Converting to ${settings.format}...`);

    let convertedBlob;
    if (canvas.convertToBlob) {
      // Use OffscreenCanvas method
      convertedBlob = await canvas.convertToBlob({
        type: mimeType,
        quality: quality,
      });
    } else {
      // Fallback method
      throw new Error("OffscreenCanvas.convertToBlob not available");
    }

    if (!convertedBlob) {
      throw new Error(`Failed to convert to ${settings.format}`);
    }

    reportProgress(jobId, 90, "Conversion complete, calculating metrics");

    // Calculate metrics
    const originalSize = imageData.data.byteLength;
    const convertedSize = convertedBlob.size;
    const compressionRatio = originalSize / convertedSize;

    reportProgress(jobId, 100, "Optimized conversion complete");

    return {
      convertedBlob,
      originalSize,
      convertedSize,
      compressionRatio,
      format: settings.format,
    };
  } catch (error) {
    throw new Error(`Optimized conversion failed: ${error.message}`);
  }
}

/**
 * Handle performance benchmark request
 */
async function handlePerformanceBenchmark(payload) {
  const { benchmarkId, testType, testData } = payload;

  try {
    let result;
    const startTime = performance.now();

    switch (testType) {
      case "memory_usage":
        result = await benchmarkMemoryUsage(testData);
        break;
      case "conversion_speed":
        result = await benchmarkConversionSpeed(testData);
        break;
      case "chunk_processing":
        result = await benchmarkChunkProcessing(testData);
        break;
      default:
        throw new Error(`Unknown benchmark type: ${testType}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_COMPLETE,
      payload: {
        benchmarkId,
        result: {
          ...result,
          duration,
          timestamp: Date.now(),
        },
      },
    });
  } catch (error) {
    self.postMessage({
      type: MESSAGE_TYPES.CONVERSION_ERROR,
      payload: {
        benchmarkId,
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
    });
  }
}

/**
 * Benchmark memory usage patterns
 */
async function benchmarkMemoryUsage(testData) {
  const { iterations, imageSize } = testData;
  const memorySnapshots = [];

  for (let i = 0; i < iterations; i++) {
    createTestImageData(imageSize.width, imageSize.height);

    const memoryBefore = workerMemory.canvasMemoryEstimate;
    workerMemory.registerCanvas({
      width: imageSize.width,
      height: imageSize.height,
    });
    const memoryAfter = workerMemory.canvasMemoryEstimate;

    memorySnapshots.push({
      iteration: i,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
    });

    // Cleanup every 10 iterations
    if (i % 10 === 0) {
      workerMemory.performCleanup();
    }
  }

  return {
    memorySnapshots,
    averageMemoryUsage:
      memorySnapshots.reduce((sum, snap) => sum + snap.memoryDelta, 0) /
      iterations,
    peakMemoryUsage: Math.max(
      ...memorySnapshots.map((snap) => snap.memoryAfter)
    ),
  };
}

/**
 * Benchmark conversion speed for different formats
 */
async function benchmarkConversionSpeed(testData) {
  const { formats, imageSize, quality } = testData;
  const results = [];

  const imageData = createTestImageData(imageSize.width, imageSize.height);

  for (const format of formats) {
    const settings = { format, quality };
    const startTime = performance.now();

    try {
      await convertImageDataOptimized(
        imageData,
        settings,
        `benchmark-${format}`
      );
      const endTime = performance.now();

      results.push({
        format,
        duration: endTime - startTime,
        success: true,
      });
    } catch (error) {
      results.push({
        format,
        duration: -1,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    conversionResults: results,
    fastestFormat: results
      .filter((r) => r.success)
      .sort((a, b) => a.duration - b.duration)[0],
    averageDuration:
      results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) /
      results.filter((r) => r.success).length,
  };
}

/**
 * Benchmark chunk processing efficiency
 */
async function benchmarkChunkProcessing(testData) {
  const { chunkSizes, imageSize } = testData;
  const results = [];

  for (const chunkSize of chunkSizes) {
    const startTime = performance.now();

    // Simulate chunk processing
    const chunksX = Math.ceil(imageSize.width / chunkSize);
    const chunksY = Math.ceil(imageSize.height / chunkSize);
    const totalChunks = chunksX * chunksY;

    let processedChunks = 0;
    for (let y = 0; y < chunksY; y++) {
      for (let x = 0; x < chunksX; x++) {
        const chunkWidth = Math.min(chunkSize, imageSize.width - x * chunkSize);
        const chunkHeight = Math.min(
          chunkSize,
          imageSize.height - y * chunkSize
        );

        createTestImageData(chunkWidth, chunkHeight);

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 1));
        processedChunks++;
      }
    }

    const endTime = performance.now();

    results.push({
      chunkSize,
      totalChunks,
      processedChunks,
      duration: endTime - startTime,
      averageTimePerChunk: (endTime - startTime) / totalChunks,
    });
  }

  return {
    chunkResults: results,
    optimalChunkSize: results.sort(
      (a, b) => a.averageTimePerChunk - b.averageTimePerChunk
    )[0].chunkSize,
  };
}

/**
 * Create test image data for benchmarking
 */
function createTestImageData(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);

  // Fill with test pattern for realistic data
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);

    data[i] = (x * 255) / width; // R
    data[i + 1] = (y * 255) / height; // G
    data[i + 2] = ((x + y) * 255) / (width + height); // B
    data[i + 3] = 255; // A
  }

  return new ImageData(data, width, height);
}

/**
 * Report progress to main thread
 */
function reportProgress(jobId, progress, message) {
  self.postMessage({
    type: MESSAGE_TYPES.PROGRESS_UPDATE,
    payload: {
      jobId,
      progress,
      message,
      timestamp: Date.now(),
    },
  });
}
