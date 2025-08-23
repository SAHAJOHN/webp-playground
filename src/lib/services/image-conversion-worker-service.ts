import {
  ConversionSettingsType,
  ConversionResultType,
  SupportedFormatType,
} from "@/types/conversion";
import { MemoryManagementService } from "./memory-management-service";

// Worker message types (matching worker script)
const MESSAGE_TYPES = {
  CONVERT_IMAGE: "CONVERT_IMAGE",
  PROGRESS_UPDATE: "PROGRESS_UPDATE",
  CONVERSION_COMPLETE: "CONVERSION_COMPLETE",
  CONVERSION_ERROR: "CONVERSION_ERROR",
  WORKER_READY: "WORKER_READY",
  CLEANUP_MEMORY: "CLEANUP_MEMORY",
} as const;

type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

type WorkerMessageType = {
  type: MessageType;
  payload?: Record<string, unknown>;
  timestamp?: number;
};

type ConversionJobType = {
  id: string;
  file: File;
  settings: ConversionSettingsType;
  onProgress: (progress: number, message?: string) => void;
  onComplete: (result: ConversionResultType) => void;
  onError: (error: Error) => void;
};

type JobQueueItemType = {
  job: ConversionJobType;
  status: "pending" | "processing" | "completed" | "error";
  startTime?: number;
  endTime?: number;
};

export class ImageConversionWorkerService {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private jobQueue = new Map<string, JobQueueItemType>();
  private activeJobs = new Set<string>();
  private maxConcurrentJobs = 2; // Limit concurrent jobs to prevent memory issues
  private memoryService = MemoryManagementService.getInstance();

  constructor() {
    this.initializeWorker();
    this.setupMemoryManagement();
  }

  /**
   * Initialize the Web Worker
   */
  private initializeWorker(): void {
    try {
      this.worker = new Worker("/workers/image-conversion-worker.js");
      this.setupWorkerEventHandlers();
    } catch (error) {
      throw new Error("Web Worker not supported or failed to initialize");
    }
  }

  /**
   * Setup event handlers for worker communication
   */
  private setupWorkerEventHandlers(): void {
    if (!this.worker) return;

    this.worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerMessageType>) => {
        this.handleWorkerMessage(event.data);
      }
    );

    this.worker.addEventListener("error", (error: ErrorEvent) => {
      this.handleWorkerError(error);
    });

    this.worker.addEventListener("messageerror", (error: MessageEvent) => {
      this.handleWorkerError(
        new ErrorEvent("messageerror", {
          message: "Failed to deserialize worker message",
        })
      );
    });
  }

  /**
   * Handle messages from the Web Worker
   */
  private handleWorkerMessage(message: WorkerMessageType): void {
    const { type, payload } = message;

    switch (type) {
      case MESSAGE_TYPES.WORKER_READY:
        this.isWorkerReady = true;
        this.processQueuedJobs();
        break;

      case MESSAGE_TYPES.PROGRESS_UPDATE:
        if (payload) {
          this.handleProgressUpdate(payload as { jobId: string; progress: number; message?: string });
        }
        break;

      case MESSAGE_TYPES.CONVERSION_COMPLETE:
        if (payload) {
          this.handleConversionComplete(payload as { jobId: string; result: { convertedBlob: Blob; originalSize: number; convertedSize: number; compressionRatio: number; format: string } });
        }
        break;

      case MESSAGE_TYPES.CONVERSION_ERROR:
        if (payload) {
          this.handleConversionError(payload as { jobId: string; error: { message: string; stack?: string } });
        }
        break;

      default:
        // Unknown worker message type, ignore
    }
  }

  /**
   * Handle progress updates from worker
   */
  private handleProgressUpdate(payload: { jobId: string; progress: number; message?: string }): void {
    const { jobId, progress, message } = payload;
    const jobItem = this.jobQueue.get(jobId);

    if (jobItem) {
      jobItem.job.onProgress(progress, message);
    }
  }

  /**
   * Handle successful conversion completion
   */
  private handleConversionComplete(payload: { jobId: string; result: { convertedBlob: Blob; originalSize: number; convertedSize: number; compressionRatio: number; format: string } }): void {
    const { jobId, result } = payload;
    const jobItem = this.jobQueue.get(jobId);

    if (jobItem) {
      jobItem.status = "completed";
      jobItem.endTime = Date.now();

      // Create full result object
      const fullResult: ConversionResultType = {
        originalFile: jobItem.job.file,
        convertedBlob: result.convertedBlob,
        originalSize: result.originalSize,
        convertedSize: result.convertedSize,
        compressionRatio: result.compressionRatio,
        format: result.format as SupportedFormatType,
      };

      jobItem.job.onComplete(fullResult);
      this.cleanupJob(jobId);
    }
  }

  /**
   * Handle conversion errors from worker
   */
  private handleConversionError(payload: { jobId: string; error: { message: string; stack?: string } }): void {
    const { jobId, error } = payload;
    const jobItem = this.jobQueue.get(jobId);

    if (jobItem) {
      jobItem.status = "error";
      jobItem.endTime = Date.now();

      const errorObj = new Error(error.message);
      if (error.stack) {
        errorObj.stack = error.stack;
      }

      jobItem.job.onError(errorObj);
      this.cleanupJob(jobId);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {

    // Fail all active jobs
    for (const jobId of this.activeJobs) {
      const jobItem = this.jobQueue.get(jobId);
      if (jobItem) {
        jobItem.job.onError(new Error(`Worker error: ${error.message}`));
        this.cleanupJob(jobId);
      }
    }

    // Attempt to restart worker
    this.restartWorker();
  }

  /**
   * Restart the worker after an error
   */
  private restartWorker(): void {
    try {
      this.terminateWorker();
      this.initializeWorker();
    } catch (_error) {
      // Failed to restart worker, continue with degraded functionality
    }
  }

  /**
   * Add a conversion job to the queue
   */
  public async convertImage(job: ConversionJobType): Promise<void> {
    // Add job to queue
    this.jobQueue.set(job.id, {
      job,
      status: "pending",
    });

    // Process immediately if worker is ready and we have capacity
    if (this.isWorkerReady && this.activeJobs.size < this.maxConcurrentJobs) {
      await this.processJob(job.id);
    }
  }

  /**
   * Process queued jobs
   */
  private async processQueuedJobs(): Promise<void> {
    const pendingJobs = Array.from(this.jobQueue.entries())
      .filter(([_, item]) => item.status === "pending")
      .slice(0, this.maxConcurrentJobs - this.activeJobs.size);

    for (const [jobId] of pendingJobs) {
      await this.processJob(jobId);
    }
  }

  /**
   * Process a specific job
   */
  private async processJob(jobId: string): Promise<void> {
    const jobItem = this.jobQueue.get(jobId);
    if (!jobItem || !this.worker) return;

    try {
      jobItem.status = "processing";
      jobItem.startTime = Date.now();
      this.activeJobs.add(jobId);

      // Convert File to ArrayBuffer for transferable object
      const fileBuffer = await jobItem.job.file.arrayBuffer();

      // Send job to worker with transferable object
      this.worker.postMessage(
        {
          type: MESSAGE_TYPES.CONVERT_IMAGE,
          payload: {
            jobId,
            fileData: fileBuffer,
            fileName: jobItem.job.file.name,
            settings: jobItem.job.settings,
          },
        },
        [fileBuffer]
      ); // Transfer ownership of ArrayBuffer
    } catch (error) {
      jobItem.job.onError(
        error instanceof Error ? error : new Error("Failed to process job")
      );
      this.cleanupJob(jobId);
    }
  }

  /**
   * Clean up completed or failed job
   */
  private cleanupJob(jobId: string): void {
    this.activeJobs.delete(jobId);
    this.jobQueue.delete(jobId);

    // Process next queued job if any
    this.processQueuedJobs();
  }

  /**
   * Cancel a specific job
   */
  public cancelJob(jobId: string): void {
    const jobItem = this.jobQueue.get(jobId);
    if (jobItem) {
      jobItem.job.onError(new Error("Job cancelled by user"));
      this.cleanupJob(jobId);
    }
  }

  /**
   * Cancel all jobs
   */
  public cancelAllJobs(): void {
    for (const jobId of this.jobQueue.keys()) {
      this.cancelJob(jobId);
    }
  }

  /**
   * Get job statistics
   */
  public getJobStats(): {
    pending: number;
    processing: number;
    completed: number;
    errors: number;
  } {
    const stats = { pending: 0, processing: 0, completed: 0, errors: 0 };

    for (const item of this.jobQueue.values()) {
      if (item.status === "error") {
        stats.errors++;
      } else if (item.status === "pending" || item.status === "processing" || item.status === "completed") {
        stats[item.status]++;
      }
    }

    return stats;
  }

  /**
   * Check if worker is ready
   */
  public isReady(): boolean {
    return this.isWorkerReady && this.worker !== null;
  }

  /**
   * Setup memory management for worker service
   */
  private setupMemoryManagement(): void {
    // Register cleanup callback for memory pressure
    this.memoryService.registerCleanupCallback(() => {
      // Cancel some jobs if memory pressure is high
      if (this.memoryService.isMemoryPressureHigh() && this.jobQueue.size > 2) {
        const jobsToCancel = Array.from(this.jobQueue.keys()).slice(
          0,
          Math.floor(this.jobQueue.size / 2)
        );
        jobsToCancel.forEach((jobId) => this.cancelJob(jobId));
      }

      // Send cleanup message to worker
      if (this.worker && this.isWorkerReady) {
        this.worker.postMessage({
          type: MESSAGE_TYPES.CLEANUP_MEMORY,
        });
      }
    });
  }

  /**
   * Terminate the worker and cleanup resources
   */
  public terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isWorkerReady = false;
    this.activeJobs.clear();
    this.jobQueue.clear();

    // Trigger memory cleanup
    this.memoryService.forceCleanup();
  }

  /**
   * Get singleton instance
   */
  private static instance: ImageConversionWorkerService | null = null;

  public static getInstance(): ImageConversionWorkerService {
    if (!this.instance) {
      this.instance = new ImageConversionWorkerService();
    }
    return this.instance;
  }
}
