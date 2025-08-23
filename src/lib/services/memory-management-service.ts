/**
 * Memory Management Service
 * Handles automatic cleanup of canvas contexts, blob objects, and memory monitoring
 */

type MemoryStatsType = {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  estimatedCanvasMemory: number;
  activeBlobUrls: number;
  activeCanvases: number;
};

type CleanupCallbackType = () => void;

type MemoryThresholdType = {
  warning: number; // Percentage of heap limit
  critical: number; // Percentage of heap limit
  emergency: number; // Percentage of heap limit
};

export class MemoryManagementService {
  private static instance: MemoryManagementService | null = null;

  // Tracking active resources
  private activeBlobUrls = new Set<string>();
  private activeCanvases = new WeakSet<HTMLCanvasElement | OffscreenCanvas>();
  private canvasMemoryEstimate = 0;
  private cleanupCallbacks = new Set<CleanupCallbackType>();

  // Memory monitoring
  private memoryCheckInterval: number | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly MEMORY_THRESHOLDS: MemoryThresholdType = {
    warning: 70, // 70% of heap limit
    critical: 85, // 85% of heap limit
    emergency: 95, // 95% of heap limit
  };

  // Garbage collection triggers
  private lastGCTrigger = 0;
  private readonly GC_COOLDOWN = 10000; // 10 seconds between forced GC attempts

  private constructor() {
    this.initializeMemoryMonitoring();
    this.setupSessionCleanup();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MemoryManagementService {
    if (!this.instance) {
      this.instance = new MemoryManagementService();
    }
    return this.instance;
  }

  /**
   * Initialize memory monitoring
   */
  private initializeMemoryMonitoring(): void {
    if (typeof window !== "undefined") {
      this.memoryCheckInterval = window.setInterval(() => {
        this.checkMemoryUsage();
      }, this.MEMORY_CHECK_INTERVAL);
    }
  }

  /**
   * Setup session-based cleanup on browser close
   */
  private setupSessionCleanup(): void {
    if (typeof window !== "undefined") {
      // Cleanup on page unload
      window.addEventListener("beforeunload", () => {
        this.performSessionCleanup();
      });

      // Cleanup on page hide (mobile browsers)
      window.addEventListener("pagehide", () => {
        this.performSessionCleanup();
      });

      // Cleanup on visibility change (tab switching)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.performEmergencyCleanup();
        }
      });
    }
  }

  /**
   * Register a blob URL for tracking and automatic cleanup
   */
  public registerBlobUrl(url: string): void {
    this.activeBlobUrls.add(url);
  }

  /**
   * Unregister and revoke a blob URL
   */
  public revokeBlobUrl(url: string): void {
    if (this.activeBlobUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeBlobUrls.delete(url);
    }
  }

  /**
   * Register a canvas for memory tracking
   */
  public registerCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    this.activeCanvases.add(canvas);

    // Estimate memory usage (4 bytes per pixel for RGBA)
    const memoryMB = (canvas.width * canvas.height * 4) / (1024 * 1024);
    this.canvasMemoryEstimate += memoryMB;
  }

  /**
   * Cleanup a canvas and update memory tracking
   */
  public cleanupCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    // Calculate memory to be freed
    const memoryMB = (canvas.width * canvas.height * 4) / (1024 * 1024);
    this.canvasMemoryEstimate = Math.max(
      0,
      this.canvasMemoryEstimate - memoryMB
    );

    // Clear canvas content
    if (canvas instanceof HTMLCanvasElement) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    } else if (
      typeof OffscreenCanvas !== "undefined" &&
      canvas instanceof OffscreenCanvas
    ) {
      // OffscreenCanvas cleanup is handled by garbage collector
      canvas.width = 0;
      canvas.height = 0;
    } else {
      // Generic canvas-like object cleanup
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  /**
   * Register a cleanup callback to be called during memory pressure
   */
  public registerCleanupCallback(callback: CleanupCallbackType): () => void {
    this.cleanupCallbacks.add(callback);

    // Return unregister function
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemoryStatsType {
    const stats: MemoryStatsType = {
      estimatedCanvasMemory: this.canvasMemoryEstimate,
      activeBlobUrls: this.activeBlobUrls.size,
      activeCanvases: 0, // WeakSet doesn't have size property
    };

    // Add browser memory info if available
    try {
      if (typeof window !== "undefined" && "performance" in window) {
        const memory = (performance as { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } }).memory;
        if (memory) {
          stats.usedJSHeapSize = memory.usedJSHeapSize;
          stats.totalJSHeapSize = memory.totalJSHeapSize;
          stats.jsHeapSizeLimit = memory.jsHeapSizeLimit;
        }
      }
    } catch {
      // Ignore errors accessing performance.memory
    }

    return stats;
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();

    if (stats.jsHeapSizeLimit && stats.usedJSHeapSize) {
      const memoryUsagePercent =
        (stats.usedJSHeapSize / stats.jsHeapSizeLimit) * 100;

      if (memoryUsagePercent >= this.MEMORY_THRESHOLDS.emergency) {
        this.performEmergencyCleanup();
        this.triggerGarbageCollection();
      } else if (memoryUsagePercent >= this.MEMORY_THRESHOLDS.critical) {
        this.performCriticalCleanup();
        this.triggerGarbageCollection();
      } else if (memoryUsagePercent >= this.MEMORY_THRESHOLDS.warning) {
        this.performWarningCleanup();
      }
    }

    // Also check canvas memory estimate
    if (stats.estimatedCanvasMemory > 1000) {
      // > 1GB
      this.performCanvasCleanup();
    }
  }

  /**
   * Perform warning level cleanup (least aggressive)
   */
  private performWarningCleanup(): void {
    // Cleanup old blob URLs (older than 5 minutes)
    this.cleanupOldBlobUrls(5 * 60 * 1000);
  }

  /**
   * Perform critical level cleanup (more aggressive)
   */
  private performCriticalCleanup(): void {
    // Cleanup all blob URLs
    this.cleanupAllBlobUrls();

    // Call registered cleanup callbacks
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.warn("Cleanup callback failed:", error);
      }
    });
  }

  /**
   * Perform emergency cleanup (most aggressive)
   */
  private performEmergencyCleanup(): void {
    this.performCriticalCleanup();
    this.performCanvasCleanup();

    // Force garbage collection if available
    this.triggerGarbageCollection();
  }

  /**
   * Perform session cleanup on browser close
   */
  private performSessionCleanup(): void {
    this.cleanupAllBlobUrls();
    this.canvasMemoryEstimate = 0;

    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Cleanup canvas memory estimates
   */
  private performCanvasCleanup(): void {
    // Reset canvas memory estimate (canvases should be cleaned up by GC)
    this.canvasMemoryEstimate = Math.max(0, this.canvasMemoryEstimate * 0.5);
  }

  /**
   * Cleanup blob URLs older than specified age
   */
  private cleanupOldBlobUrls(_maxAge: number): void {
    // Note: We can't track creation time of blob URLs without additional metadata
    // For now, we'll clean up a portion of them
    const urlsToCleanup = Array.from(this.activeBlobUrls).slice(
      0,
      Math.floor(this.activeBlobUrls.size * 0.3)
    );

    urlsToCleanup.forEach((url) => {
      this.revokeBlobUrl(url);
    });
  }

  /**
   * Cleanup all tracked blob URLs
   */
  private cleanupAllBlobUrls(): void {
    this.activeBlobUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.activeBlobUrls.clear();
  }

  /**
   * Attempt to trigger garbage collection
   */
  private triggerGarbageCollection(): void {
    const now = Date.now();
    if (now - this.lastGCTrigger < this.GC_COOLDOWN) {
      return; // Too soon since last GC trigger
    }

    this.lastGCTrigger = now;

    // Try different methods to trigger GC
    if (typeof window !== "undefined") {
      // Method 1: Use gc() if available (Chrome with --js-flags=--expose-gc)
      if ("gc" in window && typeof (window as { gc?: unknown }).gc === "function") {
        try {
          (window as { gc?: () => void }).gc?.();
          return;
        } catch {
          // Ignore errors
        }
      }

      // Method 2: Create memory pressure to encourage GC
      try {
        const tempArrays: unknown[][] = [];
        for (let i = 0; i < 100; i++) {
          tempArrays.push(new Array(10000).fill(0));
        }
        // Let arrays go out of scope
        tempArrays.length = 0;
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Check if memory usage is above warning threshold
   */
  public isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();

    if (stats.jsHeapSizeLimit && stats.usedJSHeapSize) {
      const memoryUsagePercent =
        (stats.usedJSHeapSize / stats.jsHeapSizeLimit) * 100;
      return memoryUsagePercent >= this.MEMORY_THRESHOLDS.warning;
    }

    // Fallback: check canvas memory estimate
    return stats.estimatedCanvasMemory > 500; // > 500MB
  }

  /**
   * Force cleanup of all resources
   */
  public forceCleanup(): void {
    this.performEmergencyCleanup();
  }

  /**
   * Destroy the service and cleanup all resources
   */
  public destroy(): void {
    this.performSessionCleanup();
    this.cleanupCallbacks.clear();
    MemoryManagementService.instance = null;
  }
}
