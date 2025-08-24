// Simplified image conversion hook for debugging
import { useState, useCallback } from "react";
import { ImageConversionService } from "@/lib/services";
import type {
  ConversionSettingsType,
  ConversionResultType,
} from "@/types/conversion";

type SimpleJobType = {
  id: string;
  file: File;
  settings: ConversionSettingsType;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  result?: ConversionResultType;
  error?: Error;
};

export const useSimpleImageConversion = () => {
  const [jobs, setJobs] = useState<SimpleJobType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const convertFiles = useCallback(
    async (files: File[], settings: ConversionSettingsType) => {

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
        try {

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
              setJobs((prev) =>
                prev.map((j) => (j.id === job.id ? { ...j, progress } : j))
              );
            }
          );


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
    setJobs([]);
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
  };
};
