// Custom hooks for error handling and user feedback

import { useState, useCallback, useRef, useEffect } from "react";
import { ErrorHandlingService } from "@/lib/services";
import { useNotificationHelpers } from "@/components/feedback/NotificationSystem";

type RetryStateType = {
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryIn?: number;
};

type ErrorStateType = {
  hasError: boolean;
  error: ReturnType<typeof ErrorHandlingService.processError> | null;
  retryState: RetryStateType;
};

type UseErrorHandlingOptionsType = {
  showNotifications?: boolean;
  autoRetry?: boolean;
  onError?: (
    error: ReturnType<typeof ErrorHandlingService.processError>
  ) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (
    error: ReturnType<typeof ErrorHandlingService.processError>
  ) => void;
};

export const useErrorHandling = (options: UseErrorHandlingOptionsType = {}) => {
  const {
    showNotifications = true,
    autoRetry = false,
    onError,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [errorState, setErrorState] = useState<ErrorStateType>({
    hasError: false,
    error: null,
    retryState: {
      isRetrying: false,
      retryCount: 0,
      maxRetries: 0,
    },
  });

  const { showError, showWarning, showInfo } = useNotificationHelpers();
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCallbackRef = useRef<(() => Promise<void>) | null>(null);

  // Handle error with processing and optional retry
  const handleError = useCallback(
    async (
      error: Error | string,
      context?: Record<string, unknown>,
      retryCallback?: () => Promise<void>
    ) => {
      const processedError = ErrorHandlingService.processError(error, {
        context,
        logToConsole: true,
      });

      setErrorState((prev) => ({
        hasError: true,
        error: processedError,
        retryState: {
          isRetrying: false,
          retryCount: 0,
          maxRetries: processedError.recoveryStrategy.maxRetries || 0,
        },
      }));

      // Store retry callback
      retryCallbackRef.current = retryCallback || null;

      // Show notification if enabled
      if (showNotifications) {
        const actions = [];

        // Add retry action if possible
        if (
          processedError.recoveryStrategy.canRetry &&
          retryCallback &&
          processedError.recoveryStrategy.maxRetries &&
          processedError.recoveryStrategy.maxRetries > 0
        ) {
          actions.push({
            label: "Retry",
            action: () => performRetry(),
            style: "primary" as const,
          });
        }

        // Add user action if specified
        if (processedError.recoveryStrategy.userAction) {
          actions.push({
            label: "Learn More",
            action: () => {
              showInfo(
                "Recovery Suggestion",
                processedError.recoveryStrategy.userAction
              );
            },
            style: "secondary" as const,
          });
        }

        // Show appropriate notification based on severity
        switch (processedError.severity) {
          case "critical":
          case "high":
            showError(processedError.userMessage, undefined, {
              persistent: true,
              actions,
            });
            break;
          case "medium":
            showWarning(processedError.userMessage, undefined, {
              actions,
            });
            break;
          case "low":
            showInfo(processedError.userMessage, undefined, {
              actions,
            });
            break;
        }
      }

      // Call error callback
      onError?.(processedError);

      // Auto-retry if enabled and possible
      if (
        autoRetry &&
        processedError.recoveryStrategy.autoRecover &&
        retryCallback &&
        ErrorHandlingService.shouldRetryError(processedError, 0)
      ) {
        const delay = ErrorHandlingService.getRetryDelay(processedError, 0);
        setTimeout(() => {
          performRetry();
        }, delay);
      }
    },
    [showNotifications, showError, showWarning, showInfo, onError, autoRetry]
  );

  // Perform retry operation
  const performRetry = useCallback(async () => {
    const { error, retryState } = errorState;
    if (!error || !retryCallbackRef.current) return;

    const newRetryCount = retryState.retryCount + 1;

    // Check if we should retry
    if (!ErrorHandlingService.shouldRetryError(error, newRetryCount)) {
      onMaxRetriesReached?.(error);
      return;
    }

    // Update retry state
    setErrorState((prev) => ({
      ...prev,
      retryState: {
        ...prev.retryState,
        isRetrying: true,
        retryCount: newRetryCount,
      },
    }));

    try {
      // Call retry callback
      await retryCallbackRef.current();

      // Success - clear error state
      clearError();

      if (showNotifications) {
        showInfo("Success", "Operation completed successfully");
      }
    } catch (_retryError) {
      // Retry failed - handle the new error
      const retryDelay = ErrorHandlingService.getRetryDelay(
        error,
        newRetryCount
      );

      setErrorState((prev) => ({
        ...prev,
        retryState: {
          ...prev.retryState,
          isRetrying: false,
          nextRetryIn: retryDelay,
        },
      }));

      // Schedule next retry if within limits
      if (newRetryCount < (error.recoveryStrategy.maxRetries || 0)) {
        retryTimeoutRef.current = setTimeout(() => {
          setErrorState((prev) => ({
            ...prev,
            retryState: {
              ...prev.retryState,
              nextRetryIn: undefined,
            },
          }));
        }, retryDelay);

        onRetry?.(newRetryCount);
      } else {
        onMaxRetriesReached?.(error);

        if (showNotifications) {
          showError(
            "Maximum Retries Reached",
            "The operation failed after multiple attempts. Please try again later or contact support."
          );
        }
      }
    }
  }, [
    errorState,
    onRetry,
    onMaxRetriesReached,
    showNotifications,
    showInfo,
    showError,
  ]);

  // Clear error state
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setErrorState({
      hasError: false,
      error: null,
      retryState: {
        isRetrying: false,
        retryCount: 0,
        maxRetries: 0,
      },
    });

    retryCallbackRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...errorState,
    handleError,
    performRetry,
    clearError,
    canRetry:
      errorState.error?.recoveryStrategy.canRetry &&
      errorState.retryState.retryCount < errorState.retryState.maxRetries,
  };
};

// Hook for handling async operations with error handling
export const useAsyncOperation = <T>(
  operation: () => Promise<T>,
  options: UseErrorHandlingOptionsType & {
    onSuccess?: (data: T) => void;
    loadingMessage?: string;
  } = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const errorHandling = useErrorHandling(options);
  const { showLoading, showSuccess } = useNotificationHelpers();

  const execute = useCallback(
    async (context?: Record<string, unknown>) => {
      setIsLoading(true);
      errorHandling.clearError();

      let loadingNotificationId: string | undefined;

      if (options.loadingMessage) {
        loadingNotificationId = showLoading(options.loadingMessage);
      }

      try {
        const result = await operation();
        setData(result);
        options.onSuccess?.(result);

        if (loadingNotificationId) {
          // Remove loading notification and show success
          showSuccess("Operation completed successfully");
        }

        return result;
      } catch (error) {
        await errorHandling.handleError(error as Error, context, async () => {
          await execute(context);
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [operation, options, errorHandling, showLoading, showSuccess]
  );

  return {
    execute,
    isLoading,
    data,
    ...errorHandling,
  };
};

// Hook for handling file operations with specific error handling
export const useFileOperation = (options: UseErrorHandlingOptionsType = {}) => {
  const errorHandling = useErrorHandling({
    ...options,
    showNotifications: options.showNotifications ?? true,
  });

  const handleFileError = useCallback(
    (
      error: Error | string,
      fileName?: string,
      retryCallback?: () => Promise<void>
    ) => {
      const context = fileName ? { fileName } : undefined;
      return errorHandling.handleError(error, context, retryCallback);
    },
    [errorHandling]
  );

  const validateAndHandle = useCallback(
    async <T>(
      operation: () => Promise<T>,
      fileName?: string
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        await handleFileError(error as Error, fileName, async () => {
          await operation();
        });
        return null;
      }
    },
    [handleFileError]
  );

  return {
    ...errorHandling,
    handleFileError,
    validateAndHandle,
  };
};

// Hook for batch operations with progress tracking
export const useBatchOperation = <T>(
  options: UseErrorHandlingOptionsType & {
    onProgress?: (completed: number, total: number, current?: string) => void;
    onItemSuccess?: (item: T, index: number) => void;
    onItemError?: (error: Error, item: T, index: number) => void;
  } = {}
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    current: "",
  });
  const [results, setResults] = useState<T[]>([]);
  const [errors, setErrors] = useState<
    Array<{ item: T; error: Error; index: number }>
  >([]);

  const errorHandling = useErrorHandling(options);
  const { showProgress } = useNotificationHelpers();

  const processBatch = useCallback(
    async <R>(
      items: T[],
      processor: (item: T, index: number) => Promise<R>,
      batchOptions?: {
        concurrency?: number;
        stopOnError?: boolean;
        showProgress?: boolean;
      }
    ): Promise<{
      results: R[];
      errors: Array<{ item: T; error: Error; index: number }>;
    }> => {
      const {
        concurrency = 3,
        stopOnError = false,
        showProgress: showProgressNotification = true,
      } = batchOptions || {};

      setIsProcessing(true);
      setProgress({ completed: 0, total: items.length, current: "" });
      setResults([]);
      setErrors([]);

      const batchResults: R[] = [];
      const batchErrors: Array<{ item: T; error: Error; index: number }> = [];

      let progressNotification: ReturnType<typeof showProgress> | undefined;

      if (showProgressNotification) {
        progressNotification = showProgress(
          "Processing batch operation",
          0,
          `Processing ${items.length} items...`
        );
      }

      try {
        // Process items in batches with concurrency limit
        for (let i = 0; i < items.length; i += concurrency) {
          const batch = items.slice(i, i + concurrency);
          const batchPromises = batch.map(async (item, batchIndex) => {
            const globalIndex = i + batchIndex;

            try {
              setProgress((prev) => ({
                ...prev,
                current: `Processing item ${globalIndex + 1}`,
              }));

              const result = await processor(item, globalIndex);
              batchResults[globalIndex] = result;

              options.onItemSuccess?.(item, globalIndex);

              setProgress((prev) => {
                const newCompleted = prev.completed + 1;
                const progressPercent = (newCompleted / prev.total) * 100;

                options.onProgress?.(newCompleted, prev.total, prev.current);

                if (progressNotification) {
                  progressNotification.update(
                    progressPercent,
                    `Completed ${newCompleted} of ${prev.total} items`
                  );
                }

                return {
                  ...prev,
                  completed: newCompleted,
                };
              });

              return { success: true, result, index: globalIndex };
            } catch (error) {
              const processedError = ErrorHandlingService.processError(
                error as Error,
                {
                  context: { item, index: globalIndex },
                }
              );

              batchErrors.push({
                item,
                error: processedError.originalError,
                index: globalIndex,
              });
              options.onItemError?.(
                processedError.originalError,
                item,
                globalIndex
              );

              if (stopOnError) {
                throw error;
              }

              return {
                success: false,
                error: processedError.originalError,
                index: globalIndex,
              };
            }
          });

          await Promise.all(batchPromises);
        }

        setResults(batchResults.filter(Boolean) as unknown as T[]);
        setErrors(batchErrors);

        if (progressNotification) {
          if (batchErrors.length === 0) {
            progressNotification.complete(
              "Batch completed successfully",
              `All ${items.length} items processed successfully`
            );
          } else {
            progressNotification.complete(
              "Batch completed with errors",
              `${batchResults.length} succeeded, ${batchErrors.length} failed`
            );
          }
        }

        return { results: batchResults, errors: batchErrors };
      } catch (error) {
        if (progressNotification) {
          progressNotification.error(
            "Batch operation failed",
            "The batch operation was stopped due to an error"
          );
        }

        await errorHandling.handleError(error as Error, {
          batchSize: items.length,
          completed: progress.completed,
        });

        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [options, errorHandling, showProgress, progress.completed]
  );

  return {
    processBatch,
    isProcessing,
    progress,
    results,
    errors,
    ...errorHandling,
  };
};

export default useErrorHandling;
