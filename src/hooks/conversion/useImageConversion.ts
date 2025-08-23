// Custom hook for managing multiple image conversion jobs with progress tracking

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ImageConversionService,
  MemoryManagementService,
  DownloadService,
  type DownloadProgressType,
} from "@/lib/services";
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
  error?: Error;
  startTime?: number;
  endTime?: number;
};

type UseImageConversionStateType = {
  jobs: Map<string, ConversionJobStateType>;
  isProcessing: boolean;
  batchProgress: BatchProgressType;
  results: Map<string, ConversionResultType>;
  errors: Map<string, Error>;
  downloadProgress?: DownloadProgressType;
  isDownloading: boolean;
};

type UseImageConversionOptionsType = {
  maxConcurrentJobs?: number;
  onJobComplete?: (jobId: string, result: ConversionResultType) => void;
  onJobError?: (jobId: string, error: Error) => void;
  onBatchComplete?: (results: Map<string, ConversionResultType>) => void;
  onBatchProgress?: (progress: BatchProgressType) => void;
  onDownloadProgress?: (progress: DownloadProgressType) => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;
};

export const useImageConversion = (
  options: UseImageConversionOptionsType = {}
) => {
  const {
    maxConcurrentJobs = 3,
    onJobComplete,
    onJobError,
    onBatchComplete,
    onBatchProgress,
    onDownloadProgress,
    onDownloadComplete,
    onDownloadError,
  } = options;

  // Use refs to store callbacks to avoid dependency issues
  const callbacksRef = useRef({
    onJobComplete,
    onJobError,
    onBatchComplete,
    onBatchProgress,
    onDownloadProgress,
    onDownloadComplete,
    onDownloadError,
  });

  // Update callback refs when they change
  useEffect(() => {
    callbacksRef.current = {
      onJobComplete,
      onJobError,
      onBatchComplete,
      onBatchProgress,
      onDownloadProgress,
      onDownloadComplete,
      onDownloadError,
    };
  }, [
    onJobComplete,
    onJobError,
    onBatchComplete,
    onBatchProgress,
    onDownloadProgress,
    onDownloadComplete,
    onDownloadError,
  ]);

  const [state, setState] = useState<UseImageConversionStateType>({
    jobs: new Map(),
    isProcessing: false,
    batchProgress: {
      totalFiles: 0,
      completedFiles: 0,
      overallProgress: 0,
      individualProgress: new Map(),
    },
    results: new Map(),
    errors: new Map(),
    isDownloading: false,
  });

  const activeJobsRef = useRef<Set<string>>(new Set());
  const jobQueueRef = useRef<string[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const memoryServiceRef = useRef<MemoryManagementService>(
    MemoryManagementService.getInstance()
  );

  // Generate unique job ID
  const generateJobId = useCallback(() => {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Process a single job
  const processJob = useCallback(async (jobId: string) => {

    // Get the job details first and update status atomically
    let job: ConversionJobStateType | undefined;

    setState((prev) => {
      const currentJob = prev.jobs.get(jobId);

      if (!currentJob || currentJob.status !== "pending") {
        job = undefined;
        return prev;
      }

      job = currentJob;
      const updatedJobs = new Map(prev.jobs);
      updatedJobs.set(jobId, {
        ...currentJob,
        status: "processing",
        startTime: Date.now(),
      });

      return {
        ...prev,
        jobs: updatedJobs,
      };
    });

    if (!job) {
      const error = new Error("Job not found or not in pending status");
      setState((prev) => {
        const updatedJobs = new Map(prev.jobs);
        const updatedErrors = new Map(prev.errors);

        const currentJob = prev.jobs.get(jobId);
        if (currentJob) {
          updatedJobs.set(jobId, {
            ...currentJob,
            status: "error",
            error,
            endTime: Date.now(),
          });
          updatedErrors.set(jobId, error);
        }

        return {
          ...prev,
          jobs: updatedJobs,
          errors: updatedErrors,
        };
      });
      callbacksRef.current.onJobError?.(jobId, error);
      return;
    }


    try {
      // Create abort controller for this job
      const abortController = new AbortController();
      abortControllersRef.current.set(jobId, abortController);

      // Convert the image
      const result = await ImageConversionService.convertImage(
        job.file,
        job.settings,
        (progress) => {
          // Check if job was cancelled
          if (abortController.signal.aborted) {
            throw new Error("Job cancelled");
          }

          setState((prev) => {
            const updatedJobs = new Map(prev.jobs);
            const currentJob = updatedJobs.get(jobId);
            if (currentJob) {
              updatedJobs.set(jobId, {
                ...currentJob,
                progress: Math.max(0, Math.min(100, progress)),
              });
            }
            return {
              ...prev,
              jobs: updatedJobs,
            };
          });
        }
      );

      // Job completed successfully
      setState((prev) => {
        const updatedJobs = new Map(prev.jobs);
        const updatedResults = new Map(prev.results);

        const currentJob = prev.jobs.get(jobId);
        if (currentJob) {
          updatedJobs.set(jobId, {
            ...currentJob,
            status: "completed",
            progress: 100,
            result,
            endTime: Date.now(),
          });

          updatedResults.set(jobId, result);
        }

        return {
          ...prev,
          jobs: updatedJobs,
          results: updatedResults,
        };
      });

      callbacksRef.current.onJobComplete?.(jobId, result);
    } catch (error) {
      const jobError =
        error instanceof Error ? error : new Error("Unknown error");

      setState((prev) => {
        const updatedJobs = new Map(prev.jobs);
        const updatedErrors = new Map(prev.errors);

        const currentJob = prev.jobs.get(jobId);
        if (currentJob) {
          updatedJobs.set(jobId, {
            ...currentJob,
            status:
              jobError.message === "Job cancelled" ? "cancelled" : "error",
            error: jobError,
            endTime: Date.now(),
          });
        }

        if (jobError.message !== "Job cancelled") {
          updatedErrors.set(jobId, jobError);
          callbacksRef.current.onJobError?.(jobId, jobError);
        }

        return {
          ...prev,
          jobs: updatedJobs,
          errors: updatedErrors,
        };
      });
    } finally {
      activeJobsRef.current.delete(jobId);
      abortControllersRef.current.delete(jobId);
    }
  }, []);

  // Process jobs from queue
  const processQueue = useCallback(async () => {

    while (
      activeJobsRef.current.size < maxConcurrentJobs &&
      jobQueueRef.current.length > 0
    ) {
      const jobId = jobQueueRef.current.shift();
      if (!jobId) break;

      activeJobsRef.current.add(jobId);
      // Don't await here to allow concurrent processing
      processJob(jobId).catch((_error) => {
        activeJobsRef.current.delete(jobId);
      });
    }

  }, [maxConcurrentJobs, processJob]);

  // Start conversion for multiple files
  const convertFiles = useCallback(
    (files: File[], settings: ConversionSettingsType) => {

      const newJobs = new Map<string, ConversionJobStateType>();
      const newJobIds: string[] = [];

      files.forEach((file) => {
        const jobId = generateJobId();
        const job = {
          id: jobId,
          file,
          settings,
          status: "pending" as const,
          progress: 0,
        };
        newJobs.set(jobId, job);
        newJobIds.push(jobId);
      });

      setState((prev) => {
        const updatedJobs = new Map([...prev.jobs, ...newJobs]);

        return {
          ...prev,
          jobs: updatedJobs,
          isProcessing: newJobIds.length > 0,
          // Don't clear existing results, only clear errors for new batch
          errors: new Map(),
        };
      });

      // Add jobs to queue
      jobQueueRef.current.push(...newJobIds);

      // Start processing with a small delay to ensure state is updated
      setTimeout(() => {
        processQueue();
      }, 0);
    },
    [generateJobId, processQueue]
  );

  // Cancel a specific job
  const cancelJob = useCallback((jobId: string) => {
    const abortController = abortControllersRef.current.get(jobId);
    if (abortController) {
      abortController.abort();
    }

    // Remove from queue if pending
    const queueIndex = jobQueueRef.current.indexOf(jobId);
    if (queueIndex !== -1) {
      jobQueueRef.current.splice(queueIndex, 1);
    }

    setState((prev) => {
      const updatedJobs = new Map(prev.jobs);
      const job = updatedJobs.get(jobId);
      if (job && (job.status === "pending" || job.status === "processing")) {
        updatedJobs.set(jobId, {
          ...job,
          status: "cancelled",
          endTime: Date.now(),
        });
      }
      return {
        ...prev,
        jobs: updatedJobs,
      };
    });
  }, []);

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

    setState((prev) => {
      const updatedJobs = new Map(prev.jobs);
      updatedJobs.forEach((job, jobId) => {
        if (job.status === "pending" || job.status === "processing") {
          updatedJobs.set(jobId, {
            ...job,
            status: "cancelled",
            endTime: Date.now(),
          });
        }
      });

      return {
        ...prev,
        jobs: updatedJobs,
        isProcessing: false,
      };
    });
  }, []);

  // Retry a failed job
  const retryJob = useCallback(
    (jobId: string) => {
      setState((prev) => {
        const job = prev.jobs.get(jobId);
        if (!job || job.status !== "error") {
          return prev;
        }

        const updatedJobs = new Map(prev.jobs);
        const updatedErrors = new Map(prev.errors);

        updatedJobs.set(jobId, {
          ...job,
          status: "pending",
          progress: 0,
          error: undefined,
          startTime: undefined,
          endTime: undefined,
        });

        updatedErrors.delete(jobId);

        return {
          ...prev,
          jobs: updatedJobs,
          errors: updatedErrors,
          isProcessing: true,
        };
      });

      // Add back to queue
      jobQueueRef.current.push(jobId);
      processQueue();
    },
    [processQueue]
  );

  // Clear all completed and error jobs
  const clearCompletedJobs = useCallback(() => {
    setState((prev) => {
      const updatedJobs = new Map(prev.jobs);
      const updatedResults = new Map(prev.results);
      const updatedErrors = new Map(prev.errors);

      updatedJobs.forEach((job, jobId) => {
        if (
          job.status === "completed" ||
          job.status === "error" ||
          job.status === "cancelled"
        ) {
          updatedJobs.delete(jobId);
          updatedResults.delete(jobId);
          updatedErrors.delete(jobId);
        }
      });

      return {
        ...prev,
        jobs: updatedJobs,
        results: updatedResults,
        errors: updatedErrors,
      };
    });
  }, []);

  // Clear all jobs and reset state
  const clearAllJobs = useCallback(() => {
    cancelAllJobs();

    // Trigger memory cleanup
    memoryServiceRef.current.forceCleanup();

    setState({
      jobs: new Map(),
      isProcessing: false,
      batchProgress: {
        totalFiles: 0,
        completedFiles: 0,
        overallProgress: 0,
        individualProgress: new Map(),
      },
      results: new Map(),
      errors: new Map(),
      isDownloading: false,
    });
  }, [cancelAllJobs]);

  // Download a single result
  const downloadSingle = useCallback(
    async (jobId: string, options: Partial<DownloadOptionsType> = {}) => {
      let result: ConversionResultType | undefined;
      setState((prev) => {
        result = prev.results.get(jobId);
        return prev;
      });

      if (!result) {
        const error = new Error("Result not found for download");
        callbacksRef.current.onDownloadError?.(error);
        return;
      }

      try {
        setState((prev) => ({ ...prev, isDownloading: true }));
        await DownloadService.downloadSingleFile(result, options);
        callbacksRef.current.onDownloadComplete?.();
      } catch (error) {
        const downloadError =
          error instanceof Error ? error : new Error("Download failed");
        callbacksRef.current.onDownloadError?.(downloadError);
      } finally {
        setState((prev) => ({ ...prev, isDownloading: false }));
      }
    },
    []
  );

  // Download multiple results individually
  const downloadMultiple = useCallback(
    async (jobIds: string[], options: Partial<DownloadOptionsType> = {}) => {
      let results: ConversionResultType[] = [];
      setState((prev) => {
        results = jobIds
          .map((id) => prev.results.get(id))
          .filter(
            (result): result is ConversionResultType => result !== undefined
          );
        return prev;
      });

      if (results.length === 0) {
        const error = new Error("No results found for download");
        callbacksRef.current.onDownloadError?.(error);
        return;
      }

      try {
        setState((prev) => ({ ...prev, isDownloading: true }));

        await DownloadService.downloadMultipleFiles(
          results,
          options,
          (progress) => {
            setState((prev) => ({ ...prev, downloadProgress: progress }));
            callbacksRef.current.onDownloadProgress?.(progress);
          }
        );

        callbacksRef.current.onDownloadComplete?.();
      } catch (error) {
        const downloadError =
          error instanceof Error ? error : new Error("Download failed");
        callbacksRef.current.onDownloadError?.(downloadError);
      } finally {
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          downloadProgress: undefined,
        }));
      }
    },
    []
  );

  // Download all results as ZIP
  const downloadAsZip = useCallback(
    async (options: Partial<DownloadOptionsType> = {}) => {
      let results: ConversionResultType[] = [];
      setState((prev) => {
        results = Array.from(prev.results.values());
        return prev;
      });

      if (results.length === 0) {
        const error = new Error("No results available for download");
        callbacksRef.current.onDownloadError?.(error);
        return;
      }

      try {
        setState((prev) => ({ ...prev, isDownloading: true }));

        await DownloadService.downloadAsZip(results, options, (progress) => {
          setState((prev) => ({ ...prev, downloadProgress: progress }));
          callbacksRef.current.onDownloadProgress?.(progress);
        });

        callbacksRef.current.onDownloadComplete?.();
      } catch (error) {
        const downloadError =
          error instanceof Error ? error : new Error("ZIP download failed");
        callbacksRef.current.onDownloadError?.(downloadError);
      } finally {
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          downloadProgress: undefined,
        }));
      }
    },
    []
  );

  // Download all completed results
  const downloadAllResults = useCallback(
    async (
      format: "individual" | "zip" = "zip",
      options: Partial<DownloadOptionsType> = {}
    ) => {
      const downloadOptions = { ...options, format };

      if (format === "zip") {
        await downloadAsZip(downloadOptions);
      } else {
        let jobIds: string[] = [];
        setState((prev) => {
          jobIds = Array.from(prev.results.keys());
          return prev;
        });
        await downloadMultiple(jobIds, downloadOptions);
      }
    },
    [downloadAsZip, downloadMultiple]
  );

  // Update batch progress when jobs change
  useEffect(() => {
    const jobs = Array.from(state.jobs.values());
    const totalFiles = jobs.length;
    const completedFiles = jobs.filter(
      (job) =>
        job.status === "completed" ||
        job.status === "error" ||
        job.status === "cancelled"
    ).length;

    const individualProgress = new Map<string, number>();
    let totalProgress = 0;

    jobs.forEach((job) => {
      individualProgress.set(job.id, job.progress);
      totalProgress += job.progress;
    });

    const overallProgress = totalFiles > 0 ? totalProgress / totalFiles : 0;
    const currentFile = jobs.find((job) => job.status === "processing")?.file
      .name;

    const batchProgress: BatchProgressType = {
      totalFiles,
      completedFiles,
      currentFile,
      overallProgress,
      individualProgress,
    };

    // Update batch progress in state
    setState((prev) => ({
      ...prev,
      batchProgress,
    }));

    // Call progress callback
    callbacksRef.current.onBatchProgress?.(batchProgress);

    // Check if all jobs are complete
    const allComplete =
      jobs.length > 0 &&
      jobs.every(
        (job) =>
          job.status === "completed" ||
          job.status === "error" ||
          job.status === "cancelled"
      );

    if (allComplete && state.isProcessing) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
      }));

      // Call batch complete callback
      callbacksRef.current.onBatchComplete?.(state.results);
    }
  }, [state.jobs, state.isProcessing, state.results]);

  // Get job statistics
  const getJobStats = useCallback(() => {
    const jobs = Array.from(state.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter((job) => job.status === "pending").length,
      processing: jobs.filter((job) => job.status === "processing").length,
      completed: jobs.filter((job) => job.status === "completed").length,
      error: jobs.filter((job) => job.status === "error").length,
      cancelled: jobs.filter((job) => job.status === "cancelled").length,
    };
  }, [state.jobs]);

  // Setup memory management cleanup
  useEffect(() => {
    const memoryService = memoryServiceRef.current;

    // Register cleanup callback for memory pressure
    const unregisterCleanup = memoryService.registerCleanupCallback(() => {
      // Cancel pending jobs if memory pressure is high
      if (memoryService.isMemoryPressureHigh()) {
        setState((prev) => {
          const pendingJobs = Array.from(prev.jobs.entries())
            .filter(([_, job]) => job.status === "pending")
            .slice(0, Math.floor(prev.jobs.size * 0.5)); // Cancel half of pending jobs

          pendingJobs.forEach(([jobId]) => {
            cancelJob(jobId);
          });

          return prev;
        });
      }
    });

    // Cleanup on unmount
    return () => {
      unregisterCleanup();
      cancelAllJobs();
    };
  }, [cancelJob, cancelAllJobs]);

  return {
    // State
    jobs: state.jobs,
    isProcessing: state.isProcessing,
    batchProgress: state.batchProgress,
    results: state.results,
    errors: state.errors,
    downloadProgress: state.downloadProgress,
    isDownloading: state.isDownloading,

    // Conversion Actions
    convertFiles,
    cancelJob,
    cancelAllJobs,
    retryJob,
    clearCompletedJobs,
    clearAllJobs,

    // Download Actions
    downloadSingle,
    downloadMultiple,
    downloadAsZip,
    downloadAllResults,

    // Utilities
    getJobStats,
  };
};
