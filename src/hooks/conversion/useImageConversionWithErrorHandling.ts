// Enhanced image conversion hook with integrated error handling and user feedback

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ImageConversionService,
  DownloadService,
  type DownloadProgressType,
  ErrorHandlingService,
} from "@/lib/services";
import { useNotificationHelpers } from "@/components/feedback/NotificationSystem";
import {
  useErrorHandling,
  useBatchOperation,
} from "@/hooks/utils/useErrorHandling";
import type {
  ConversionSettingsType,
  ConversionResultType,
} from "@/types/conversion";
import type {
  BatchProgressType,
  DownloadOptionsType,
} from "@/types/components";

type ConversionJobStateType = {
  id: string;
  file: File;
  settings: ConversionSettingsType;
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  progress: number;
  result?: ConversionResultType;
  error?: ReturnType<typeof ErrorHandlingService.processError>;
  startTime?: number;
  endTime?: number;
  retryCount?: number;
};

type UseImageConversionWithErrorHandlingOptionsType = {
  maxConcurrentJobs?: number;
  showNotifications?: boolean;
  autoRetryOnError?: boolean;
  onJobComplete?: (jobId: string, result: ConversionResultType) => void;
  onJobError?: (
    jobId: string,
    error: ReturnType<typeof ErrorHandlingService.processError>
  ) => void;
  onBatchComplete?: (results: Map<string, ConversionResultType>) => void;
  onBatchProgress?: (progress: BatchProgressType) => void;
  onDownloadProgress?: (progress: DownloadProgressType) => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (
    error: ReturnType<typeof ErrorHandlingService.processError>
  ) => void;
};

export const useImageConversionWithErrorHandling = (
  options: UseImageConversionWithErrorHandlingOptionsType = {}
) => {
  const {
    maxConcurrentJobs = 3,
    showNotifications = true,
    autoRetryOnError = true,
    onJobComplete,
    onJobError,
    onBatchComplete,
    onBatchProgress,
    onDownloadProgress,
    onDownloadComplete,
    onDownloadError,
  } = options;

  const [jobs, setJobs] = useState<Map<string, ConversionJobStateType>>(
    new Map()
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Map<string, ConversionResultType>>(
    new Map()
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgressType>();

  const activeJobsRef = useRef<Set<string>>(new Set());
  const jobQueueRef = useRef<string[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const { showSuccess, showError, showWarning, showProgress } =
    useNotificationHelpers();

  const errorHandling = useErrorHandling({
    showNotifications,
    autoRetry: autoRetryOnError,
    onError: (error) => {
      if (showNotifications) {
        showError("Conversion Error", error.userMessage, {
          persistent:
            error.severity === "high" || error.severity === "critical",
          actions: error.recoveryStrategy.canRetry
            ? [
                {
                  label: "Retry",
                  action: () => {
                    // Retry logic will be handled by individual job retry
                  },
                  style: "primary" as const,
                },
              ]
            : undefined,
        });
      }
    },
  });

  const batchOperation = useBatchOperation({
    showNotifications,
    onProgress: onBatchProgress,
    onItemSuccess: (result, index) => {
      if (showNotifications) {
        const job = Array.from(jobs.values())[index];
        if (job) {
          showSuccess(
            "Conversion Complete",
            `${job.file.name} converted successfully`
          );
        }
      }
    },
    onItemError: (error, item, index) => {
      const processedError = ErrorHandlingService.processError(error, {
        context: { fileName: (item as File).name, operation: "conversion" },
      });
      onJobError?.(generateJobId(), processedError);
    },
  });

  // Generate unique job ID
  const generateJobId = useCallback(() => {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Process a single conversion job with error handling
  const processJob = useCallback(
    async (jobId: string) => {
      const job = jobs.get(jobId);
      if (!job || job.status !== "pending") return;

      // Update job status to processing
      setJobs((prev) => {
        const updated = new Map(prev);
        updated.set(jobId, {
          ...job,
          status: "processing",
          startTime: Date.now(),
        });
        return updated;
      });

      try {
        // Create abort controller for this job
        const abortController = new AbortController();
        abortControllersRef.current.set(jobId, abortController);

        // Convert the image with error handling
        const result = await ErrorHandlingService.withErrorHandling(
          async () => {
            return await ImageConversionService.convertImage(
              job.file,
              job.settings,
              (progress, message) => {
                // Check if job was cancelled
                if (abortController.signal.aborted) {
                  throw ErrorHandlingService.createStandardError(
                    "conversion_failed",
                    "Job cancelled"
                  );
                }

                setJobs((prev) => {
                  const updated = new Map(prev);
                  const currentJob = updated.get(jobId);
                  if (currentJob) {
                    updated.set(jobId, {
                      ...currentJob,
                      progress: Math.max(0, Math.min(100, progress)),
                    });
                  }
                  return updated;
                });
              }
            );
          },
          { jobId, fileName: job.file.name, operation: "conversion" }
        );

        if (result.success) {
          // Job completed successfully
          setJobs((prev) => {
            const updated = new Map(prev);
            updated.set(jobId, {
              ...job,
              status: "completed",
              progress: 100,
              result: result.data,
              endTime: Date.now(),
            });
            return updated;
          });

          setResults((prev) => {
            const updated = new Map(prev);
            updated.set(jobId, result.data);
            return updated;
          });

          onJobComplete?.(jobId, result.data);
        } else {
          // Job failed
          const shouldRetry = ErrorHandlingService.shouldRetryError(
            result.error,
            job.retryCount || 0
          );

          setJobs((prev) => {
            const updated = new Map(prev);
            updated.set(jobId, {
              ...job,
              status: shouldRetry ? "pending" : "error",
              error: result.error,
              endTime: Date.now(),
              retryCount: (job.retryCount || 0) + 1,
            });
            return updated;
          });

          if (shouldRetry && autoRetryOnError) {
            // Schedule retry
            const retryDelay = ErrorHandlingService.getRetryDelay(
              result.error,
              job.retryCount || 0
            );

            setTimeout(() => {
              jobQueueRef.current.push(jobId);
              processQueue();
            }, retryDelay);

            if (showNotifications) {
              showWarning(
                "Retrying Conversion",
                `Retrying ${job.file.name} in ${Math.round(
                  retryDelay / 1000
                )} seconds...`
              );
            }
          } else {
            onJobError?.(jobId, result.error);
          }
        }
      } catch (error) {
        const processedError = ErrorHandlingService.processError(
          error as Error,
          {
            context: {
              jobId,
              fileName: job.file.name,
              operation: "conversion",
            },
          }
        );

        setJobs((prev) => {
          const updated = new Map(prev);
          updated.set(jobId, {
            ...job,
            status: "error",
            error: processedError,
            endTime: Date.now(),
          });
          return updated;
        });

        onJobError?.(jobId, processedError);
      } finally {
        activeJobsRef.current.delete(jobId);
        abortControllersRef.current.delete(jobId);
      }
    },
    [
      jobs,
      autoRetryOnError,
      showNotifications,
      showWarning,
      onJobComplete,
      onJobError,
    ]
  );

  // Process jobs from queue
  const processQueue = useCallback(async () => {
    while (
      activeJobsRef.current.size < maxConcurrentJobs &&
      jobQueueRef.current.length > 0
    ) {
      const jobId = jobQueueRef.current.shift();
      if (!jobId) break;

      activeJobsRef.current.add(jobId);
      processJob(jobId);
    }
  }, [maxConcurrentJobs, processJob]);

  // Start conversion for multiple files
  const convertFiles = useCallback(
    async (files: File[], settings: ConversionSettingsType) => {
      if (files.length === 0) {
        if (showNotifications) {
          showWarning("No Files Selected", "Please select files to convert");
        }
        return;
      }

      const newJobs = new Map<string, ConversionJobStateType>();
      const newJobIds: string[] = [];

      files.forEach((file) => {
        const jobId = generateJobId();
        newJobs.set(jobId, {
          id: jobId,
          file,
          settings,
          status: "pending",
          progress: 0,
          retryCount: 0,
        });
        newJobIds.push(jobId);
      });

      setJobs((prev) => new Map([...prev, ...newJobs]));
      setIsProcessing(true);
      setResults(new Map());

      // Add jobs to queue
      jobQueueRef.current.push(...newJobIds);

      // Show batch progress notification
      if (showNotifications) {
        showProgress(
          "Converting Images",
          0,
          `Starting conversion of ${files.length} files...`
        );
      }

      // Start processing
      processQueue();
    },
    [generateJobId, processQueue, showNotifications, showWarning, showProgress]
  );

  // Cancel a specific job
  const cancelJob = useCallback(
    (jobId: string) => {
      const abortController = abortControllersRef.current.get(jobId);
      if (abortController) {
        abortController.abort();
      }

      // Remove from queue if pending
      const queueIndex = jobQueueRef.current.indexOf(jobId);
      if (queueIndex !== -1) {
        jobQueueRef.current.splice(queueIndex, 1);
      }

      setJobs((prev) => {
        const updated = new Map(prev);
        const job = updated.get(jobId);
        if (job && (job.status === "pending" || job.status === "processing")) {
          updated.set(jobId, {
            ...job,
            status: "cancelled",
            endTime: Date.now(),
          });
        }
        return updated;
      });

      if (showNotifications) {
        const job = jobs.get(jobId);
        if (job) {
          showWarning(
            "Conversion Cancelled",
            `Cancelled conversion of ${job.file.name}`
          );
        }
      }
    },
    [jobs, showNotifications, showWarning]
  );

  // Cancel all jobs
  const cancelAllJobs = useCallback(() => {
    // Abort all active jobs
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });

    // Clear queue
    jobQueueRef.current = [];
    activeJobsRef.current.clear();
    abortControllersRef.current.clear();

    setJobs((prev) => {
      const updated = new Map(prev);
      updated.forEach((job, jobId) => {
        if (job.status === "pending" || job.status === "processing") {
          updated.set(jobId, {
            ...job,
            status: "cancelled",
            endTime: Date.now(),
          });
        }
      });
      return updated;
    });

    setIsProcessing(false);

    if (showNotifications) {
      showWarning(
        "All Conversions Cancelled",
        "All pending conversions have been cancelled"
      );
    }
  }, [showNotifications, showWarning]);

  // Retry a failed job
  const retryJob = useCallback(
    (jobId: string) => {
      const job = jobs.get(jobId);
      if (!job || job.status !== "error") {
        return;
      }

      setJobs((prev) => {
        const updated = new Map(prev);
        updated.set(jobId, {
          ...job,
          status: "pending",
          progress: 0,
          error: undefined,
          startTime: undefined,
          endTime: undefined,
        });
        return updated;
      });

      setIsProcessing(true);

      // Add back to queue
      jobQueueRef.current.push(jobId);
      processQueue();

      if (showNotifications) {
        showSuccess(
          "Retrying Conversion",
          `Retrying conversion of ${job.file.name}`
        );
      }
    },
    [jobs, processQueue, showNotifications, showSuccess]
  );

  // Clear completed and error jobs
  const clearCompletedJobs = useCallback(() => {
    setJobs((prev) => {
      const updated = new Map(prev);
      const toRemove: string[] = [];

      updated.forEach((job, jobId) => {
        if (
          job.status === "completed" ||
          job.status === "error" ||
          job.status === "cancelled"
        ) {
          toRemove.push(jobId);
        }
      });

      toRemove.forEach((jobId) => {
        updated.delete(jobId);
      });

      return updated;
    });

    setResults(new Map());
  }, []);

  // Download with error handling
  const downloadSingle = useCallback(
    async (jobId: string, options: Partial<DownloadOptionsType> = {}) => {
      const result = results.get(jobId);
      if (!result) {
        const error = ErrorHandlingService.processError(
          "Result not found for download",
          {
            context: { jobId, operation: "download" },
          }
        );
        onDownloadError?.(error);
        return;
      }

      setIsDownloading(true);

      const downloadResult = await ErrorHandlingService.withErrorHandling(
        async () => {
          await DownloadService.downloadSingleFile(result, options);
        },
        { jobId, fileName: result.fileName, operation: "download" }
      );

      setIsDownloading(false);

      if (downloadResult.success) {
        onDownloadComplete?.();
        if (showNotifications) {
          showSuccess(
            "Download Complete",
            `${result.fileName} downloaded successfully`
          );
        }
      } else {
        onDownloadError?.(downloadResult.error);
      }
    },
    [
      results,
      onDownloadComplete,
      onDownloadError,
      showNotifications,
      showSuccess,
    ]
  );

  // Download all as ZIP with error handling
  const downloadAsZip = useCallback(
    async (options: Partial<DownloadOptionsType> = {}) => {
      const resultArray = Array.from(results.values());

      if (resultArray.length === 0) {
        const error = ErrorHandlingService.processError(
          "No results available for download",
          {
            context: { operation: "batch_download" },
          }
        );
        onDownloadError?.(error);
        return;
      }

      setIsDownloading(true);

      let progressNotification: ReturnType<typeof showProgress> | undefined;
      if (showNotifications) {
        progressNotification = showProgress(
          "Creating ZIP Archive",
          0,
          `Preparing ${resultArray.length} files for download...`
        );
      }

      const downloadResult = await ErrorHandlingService.withErrorHandling(
        async () => {
          await DownloadService.downloadAsZip(
            resultArray,
            options,
            (progress) => {
              setDownloadProgress(progress);
              onDownloadProgress?.(progress);

              if (progressNotification) {
                progressNotification.update(
                  progress.overallProgress,
                  `Processing ${progress.currentFile || "files"}...`
                );
              }
            }
          );
        },
        { fileCount: resultArray.length, operation: "zip_download" }
      );

      setIsDownloading(false);
      setDownloadProgress(undefined);

      if (downloadResult.success) {
        onDownloadComplete?.();
        if (progressNotification) {
          progressNotification.complete(
            "ZIP Download Complete",
            `Downloaded ${resultArray.length} files successfully`
          );
        }
      } else {
        if (progressNotification) {
          progressNotification.error(
            "ZIP Download Failed",
            downloadResult.error.userMessage
          );
        }
        onDownloadError?.(downloadResult.error);
      }
    },
    [
      results,
      onDownloadComplete,
      onDownloadError,
      onDownloadProgress,
      showNotifications,
      showProgress,
    ]
  );

  // Calculate batch progress
  const batchProgress: BatchProgressType = {
    totalFiles: jobs.size,
    completedFiles: Array.from(jobs.values()).filter(
      (job) =>
        job.status === "completed" ||
        job.status === "error" ||
        job.status === "cancelled"
    ).length,
    overallProgress:
      jobs.size > 0
        ? Array.from(jobs.values()).reduce(
            (sum, job) => sum + job.progress,
            0
          ) / jobs.size
        : 0,
    individualProgress: new Map(
      Array.from(jobs.entries()).map(([id, job]) => [id, job.progress])
    ),
    currentFile: Array.from(jobs.values()).find(
      (job) => job.status === "processing"
    )?.file.name,
  };

  // Update processing state when all jobs complete
  useEffect(() => {
    const allJobs = Array.from(jobs.values());
    const allComplete =
      allJobs.length > 0 &&
      allJobs.every(
        (job) =>
          job.status === "completed" ||
          job.status === "error" ||
          job.status === "cancelled"
      );

    if (allComplete && isProcessing) {
      setIsProcessing(false);
      onBatchComplete?.(results);
    }
  }, [jobs, isProcessing, results, onBatchComplete]);

  // Get job statistics
  const getJobStats = useCallback(() => {
    const jobArray = Array.from(jobs.values());
    return {
      total: jobArray.length,
      pending: jobArray.filter((job) => job.status === "pending").length,
      processing: jobArray.filter((job) => job.status === "processing").length,
      completed: jobArray.filter((job) => job.status === "completed").length,
      error: jobArray.filter((job) => job.status === "error").length,
      cancelled: jobArray.filter((job) => job.status === "cancelled").length,
    };
  }, [jobs]);

  return {
    // State
    jobs,
    isProcessing,
    batchProgress,
    results,
    downloadProgress,
    isDownloading,

    // Conversion Actions
    convertFiles,
    cancelJob,
    cancelAllJobs,
    retryJob,
    clearCompletedJobs,

    // Download Actions
    downloadSingle,
    downloadAsZip,

    // Error Handling
    ...errorHandling,

    // Utilities
    getJobStats,
  };
};

export default useImageConversionWithErrorHandling;
