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

export const useSimpleImageConversion = () => {
  const [jobs, setJobs] = useState<SimpleJobType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledJobsRef = useRef<Set<string>>(new Set());

  const convertFiles = useCallback(
    async (files: File[], settings: ConversionSettingsType) => {
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

      // Process each job
      for (const job of newJobs) {
        // Check if job was cancelled
        if (cancelledJobsRef.current.has(job.id)) {
          continue;
        }

        try {
          // Create abort controller for this job
          const abortController = new AbortController();
          abortControllersRef.current.set(job.id, abortController);

          // Update job to processing
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, status: "processing" as const } : j
            )
          );

          // Convert the image
          const result = await ImageConversionService.convertImage(
            job.file,
            job.settings,
            (progress) => {
              // Check if job was cancelled
              if (abortController.signal.aborted) {
                throw new Error("Job cancelled");
              }

              setJobs((prev) =>
                prev.map((j) => (j.id === job.id ? { ...j, progress } : j))
              );
            }
          );

          // Clean up abort controller
          abortControllersRef.current.delete(job.id);


          // Update job to completed
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
        } catch (error) {
          console.error("❌ Conversion failed for:", job.id, error);

          // Update job to error
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
        }
      }

      setIsProcessing(false);
    },
    []
  );

  const clearJobs = useCallback(() => {
    // Abort all active jobs
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    cancelledJobsRef.current.clear();

    setJobs([]);
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

    // Update job status to cancelled
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId && (j.status === "pending" || j.status === "processing")
          ? { ...j, status: "cancelled" as const }
          : j
      )
    );
  }, []);

  // Get results
  const results = jobs
    .filter((job) => job.status === "completed" && job.result)
    .map((job) => job.result!);

  return {
    jobs,
    isProcessing,
    results,
    convertFiles,
    clearJobs,
    cancelJob,
  };
};
