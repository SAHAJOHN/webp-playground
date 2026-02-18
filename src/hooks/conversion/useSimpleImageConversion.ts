// Simplified image conversion hook for debugging
import { useState, useCallback, useRef } from "react";
import { ImageConversionService } from "@/lib/services";
import type {
  ConversionSettingsType,
  ConversionResultType,
} from "@/types/conversion";

type SimpleJobType = {
  id: string;
  file: File;
  settings: ConversionSettingsType;
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  progress: number;
  result?: ConversionResultType;
  error?: Error;
};

const MAX_CLIENT_CONCURRENCY = 5;

type RetryableServerErrorType = Error & {
  status?: number;
  code?: string;
  retryAfterMs?: number;
};

export const useSimpleImageConversion = () => {
  const [jobs, setJobs] = useState<SimpleJobType[]>([]);
  const [results, setResults] = useState<ConversionResultType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledJobsRef = useRef<Set<string>>(new Set());
  const activeBatchIdRef = useRef(0);

  const convertFiles = useCallback(
    async (files: File[], settings: ConversionSettingsType) => {
      const batchId = activeBatchIdRef.current + 1;
      activeBatchIdRef.current = batchId;

      // Clear cancelled jobs ref for new batch
      cancelledJobsRef.current.clear();

      // Create jobs
      const newJobs: SimpleJobType[] = files.map((file, index) => ({
        id: `job-${Date.now()}-${index}`,
        file,
        settings,
        status: "pending",
        progress: 0,
      }));

      setJobs(newJobs);
      setIsProcessing(true);

      const pendingJobs = [...newJobs];
      let runningJobs = 0;

      await new Promise<void>((resolve) => {
        const processJob = async (job: SimpleJobType) => {
          if (
            activeBatchIdRef.current !== batchId ||
            cancelledJobsRef.current.has(job.id)
          ) {
            return;
          }

          const abortController = new AbortController();
          abortControllersRef.current.set(job.id, abortController);

          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, status: "processing" as const } : j
            )
          );

          try {
            let retryAttempt = 0;

            while (true) {
              try {
                const result = await ImageConversionService.convertImage(
                  job.file,
                  job.settings,
                  (progress) => {
                    if (
                      abortController.signal.aborted ||
                      activeBatchIdRef.current !== batchId ||
                      cancelledJobsRef.current.has(job.id)
                    ) {
                      return;
                    }

                    setJobs((prev) =>
                      prev.map((j) => (j.id === job.id ? { ...j, progress } : j))
                    );
                  },
                  { signal: abortController.signal }
                );

                if (
                  abortController.signal.aborted ||
                  activeBatchIdRef.current !== batchId ||
                  cancelledJobsRef.current.has(job.id)
                ) {
                  return;
                }

                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === job.id
                      ? {
                          ...j,
                          status: "completed" as const,
                          progress: 100,
                          result,
                        }
                      : j
                  )
                );
                setResults((prev) => {
                  const existingIndex = prev.findIndex(
                    (existingResult) =>
                      existingResult.originalFile.name === result.originalFile.name
                  );

                  if (existingIndex === -1) {
                    return [...prev, result];
                  }

                  const nextResults = [...prev];
                  nextResults[existingIndex] = result;
                  return nextResults;
                });
                return;
              } catch (error) {
                const retryableError = error as RetryableServerErrorType;
                const shouldRetryForServerCapacity =
                  retryableError?.status === 429 ||
                  retryableError?.code === "QUEUE_FULL" ||
                  retryableError?.code === "MEMORY_BUDGET_EXCEEDED";

                if (!shouldRetryForServerCapacity) {
                  throw error;
                }

                retryAttempt += 1;
                const baseDelay = retryableError.retryAfterMs ?? 1000;
                const retryDelayMs = Math.min(
                  baseDelay + (retryAttempt - 1) * 500,
                  4000
                );

                await new Promise<void>((resolve) => {
                  setTimeout(() => resolve(), retryDelayMs);
                });

                if (
                  abortController.signal.aborted ||
                  activeBatchIdRef.current !== batchId ||
                  cancelledJobsRef.current.has(job.id)
                ) {
                  return;
                }
              }
            }
          } catch (error) {
            const isAbortError =
              (error instanceof DOMException && error.name === "AbortError") ||
              (error instanceof Error &&
                (error.name === "AbortError" ||
                  error.message.toLowerCase().includes("abort")));

            if (
              isAbortError ||
              abortController.signal.aborted ||
              activeBatchIdRef.current !== batchId ||
              cancelledJobsRef.current.has(job.id)
            ) {
              return;
            }

            console.error("❌ Conversion failed for:", job.id, error);

            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: "error" as const,
                      error:
                        error instanceof Error
                          ? error
                          : new Error("Unknown error"),
                    }
                  : j
              )
            );
          } finally {
            abortControllersRef.current.delete(job.id);
          }
        };

        const schedule = () => {
          if (activeBatchIdRef.current !== batchId) {
            if (runningJobs === 0) {
              resolve();
            }
            return;
          }

          while (
            runningJobs < MAX_CLIENT_CONCURRENCY &&
            pendingJobs.length > 0
          ) {
            const nextJob = pendingJobs.shift();

            if (!nextJob || cancelledJobsRef.current.has(nextJob.id)) {
              continue;
            }

            runningJobs += 1;

            void processJob(nextJob).finally(() => {
              runningJobs = Math.max(0, runningJobs - 1);

              if (pendingJobs.length === 0 && runningJobs === 0) {
                resolve();
                return;
              }

              schedule();
            });
          }

          if (pendingJobs.length === 0 && runningJobs === 0) {
            resolve();
          }
        };

        schedule();
      });

      if (activeBatchIdRef.current === batchId) {
        setIsProcessing(false);
      }
    },
    []
  );

  const clearJobs = useCallback(() => {
    // Invalidate current batch to stop loop immediately
    activeBatchIdRef.current += 1;

    // Abort all active jobs
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    cancelledJobsRef.current.clear();

    setJobs([]);
    setResults([]);
    setIsProcessing(false);
  }, []);

  const resetQueue = useCallback(() => {
    // Invalidate current batch to stop loop immediately
    activeBatchIdRef.current += 1;

    // Abort all active jobs
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    cancelledJobsRef.current.clear();

    setJobs([]);
    setIsProcessing(false);
  }, []);

  const cancelJob = useCallback((jobId: string) => {
    // Mark job as cancelled in ref
    cancelledJobsRef.current.add(jobId);

    // Abort the job if it's processing
    const abortController = abortControllersRef.current.get(jobId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(jobId);
    }

    // Update job status to cancelled or remove if completed/error
    setJobs((prev) => {
      const job = prev.find((j) => j.id === jobId);
      if (job?.status === "completed" || job?.status === "error") {
        // Remove completed/error jobs from list
        return prev.filter((j) => j.id !== jobId);
      }
      // Cancel pending/processing jobs
      return prev.map((j) =>
        j.id === jobId && (j.status === "pending" || j.status === "processing")
          ? { ...j, status: "cancelled" as const }
          : j
      );
    });
  }, []);

  return {
    jobs,
    isProcessing,
    results,
    convertFiles,
    clearJobs,
    resetQueue,
    cancelJob,
  };
};
