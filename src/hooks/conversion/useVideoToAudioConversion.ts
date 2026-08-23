"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  videoConversionService,
  type ConvertVideoFileOptionsType,
} from "@/lib/services/video-conversion-service";
import type {
  VideoConversionSettingsType,
  VideoJobPublicType,
} from "@/types/video-conversion";

export type VideoConversionClientType = {
  convert(
    file: File,
    options: ConvertVideoFileOptionsType
  ): Promise<VideoJobPublicType>;
  cancel(jobId: string): Promise<void>;
};

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

export const useVideoToAudioConversion = (
  service: VideoConversionClientType = videoConversionService
) => {
  const [job, setJob] = useState<VideoJobPublicType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const runIdRef = useRef(0);

  const startConversion = useCallback(
    async (file: File, settings: VideoConversionSettingsType) => {
      const previousJobId = jobIdRef.current;
      abortControllerRef.current?.abort();
      if (previousJobId) void service.cancel(previousJobId).catch(() => undefined);

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      jobIdRef.current = null;
      setJob(null);
      setError(null);
      setIsBusy(true);

      try {
        const completedJob = await service.convert(file, {
          ...settings,
          signal: abortController.signal,
          onJobUpdate: (nextJob) => {
            if (runIdRef.current !== runId) return;
            jobIdRef.current = nextJob.id;
            setJob(nextJob);
          },
        });

        if (runIdRef.current === runId) {
          jobIdRef.current = completedJob.id;
          setJob(completedJob);
        }
      } catch (conversionError) {
        if (
          runIdRef.current === runId &&
          !isAbortError(conversionError) &&
          !abortController.signal.aborted
        ) {
          setError(
            conversionError instanceof Error
              ? conversionError
              : new Error("Video conversion failed")
          );
        }
      } finally {
        if (runIdRef.current === runId) {
          abortControllerRef.current = null;
          setIsBusy(false);
        }
      }
    },
    [service]
  );

  const cancel = useCallback(async () => {
    runIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const jobId = jobIdRef.current;

    if (jobId) {
      await service.cancel(jobId).catch(() => undefined);
    }

    setJob((currentJob) =>
      currentJob ? { ...currentJob, status: "cancelled" } : currentJob
    );
    setError(null);
    setIsBusy(false);
  }, [service]);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const jobId = jobIdRef.current;
    jobIdRef.current = null;
    if (jobId) void service.cancel(jobId).catch(() => undefined);
    setJob(null);
    setError(null);
    setIsBusy(false);
  }, [service]);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      const controller = abortControllerRef.current;
      controller?.abort();
      const jobId = jobIdRef.current;
      if (controller && jobId) {
        void service.cancel(jobId).catch(() => undefined);
      }
    };
  }, [service]);

  return {
    job,
    error,
    isBusy,
    startConversion,
    cancel,
    reset,
  };
};
