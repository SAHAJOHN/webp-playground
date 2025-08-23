// Centralized error handling service with recovery strategies

type ErrorSeverityType = "low" | "medium" | "high" | "critical";

type ErrorCategoryType =
  | "validation"
  | "conversion"
  | "network"
  | "memory"
  | "permission"
  | "browser"
  | "file"
  | "unknown";

type ErrorRecoveryStrategyType = {
  canRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  fallbackAction?: string;
  userAction?: string;
  autoRecover?: boolean;
};

type ProcessedErrorType = {
  id: string;
  originalError: Error;
  category: ErrorCategoryType;
  severity: ErrorSeverityType;
  userMessage: string;
  technicalMessage: string;
  recoveryStrategy: ErrorRecoveryStrategyType;
  context?: Record<string, unknown>;
  timestamp: number;
};

type ErrorHandlerOptionsType = {
  context?: Record<string, unknown>;
  silent?: boolean;
  logToConsole?: boolean;
  notifyUser?: boolean;
};

export class ErrorHandlingService {
  private static errorHistory: ProcessedErrorType[] = [];
  private static readonly MAX_HISTORY = 100;

  /**
   * Processes and categorizes an error with recovery strategies
   */
  static processError(
    error: Error | string,
    options: ErrorHandlerOptionsType = {}
  ): ProcessedErrorType {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    const errorId = `error-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const category = this.categorizeError(errorObj);
    const severity = this.determineSeverity(errorObj, category);
    const userMessage = this.generateUserMessage(errorObj, category);
    const technicalMessage = this.generateTechnicalMessage(errorObj);
    const recoveryStrategy = this.getRecoveryStrategy(errorObj, category);

    const processedError: ProcessedErrorType = {
      id: errorId,
      originalError: errorObj,
      category,
      severity,
      userMessage,
      technicalMessage,
      recoveryStrategy,
      context: options.context,
      timestamp: Date.now(),
    };

    // Add to history
    this.addToHistory(processedError);

    // Log to console if enabled
    if (options.logToConsole !== false) {
      this.logError(processedError);
    }

    return processedError;
  }

  /**
   * Categorizes error based on error message and type
   */
  private static categorizeError(error: Error): ErrorCategoryType {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || "";

    // File-related errors
    if (
      message.includes("file") ||
      message.includes("blob") ||
      message.includes("size") ||
      message.includes("format")
    ) {
      return "file";
    }

    // Validation errors
    if (
      message.includes("validation") ||
      (message.includes("invalid") && !message.includes("file")) ||
      (message.includes("unsupported") && !message.includes("file")) ||
      message.includes("corrupt")
    ) {
      return "validation";
    }

    // Conversion errors
    if (
      message.includes("conversion") ||
      message.includes("canvas") ||
      message.includes("image") ||
      message.includes("webp") ||
      message.includes("avif")
    ) {
      return "conversion";
    }

    // Memory errors
    if (
      message.includes("memory") ||
      message.includes("allocation") ||
      message.includes("out of memory") ||
      stack.includes("rangeerror")
    ) {
      return "memory";
    }

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      message.includes("timeout") ||
      error.name === "NetworkError"
    ) {
      return "network";
    }

    // Permission errors
    if (
      message.includes("permission") ||
      message.includes("denied") ||
      message.includes("unauthorized") ||
      message.includes("security")
    ) {
      return "permission";
    }

    // Browser compatibility errors
    if (
      (message.includes("not supported") && !message.includes("file")) ||
      message.includes("undefined") ||
      message.includes("not a function") ||
      stack.includes("typeerror")
    ) {
      return "browser";
    }

    return "unknown";
  }

  /**
   * Determines error severity based on category and impact
   */
  private static determineSeverity(
    error: Error,
    category: ErrorCategoryType
  ): ErrorSeverityType {
    const message = error.message.toLowerCase();

    // Critical errors that break core functionality
    if (
      category === "memory" ||
      message.includes("critical") ||
      message.includes("fatal") ||
      message.includes("crash")
    ) {
      return "critical";
    }

    // High severity errors that prevent main features
    if (
      category === "conversion" ||
      category === "permission" ||
      message.includes("failed to load") ||
      message.includes("cannot access")
    ) {
      return "high";
    }

    // Medium severity errors that affect user experience
    if (
      category === "validation" ||
      category === "file" ||
      category === "network" ||
      message.includes("timeout") ||
      message.includes("invalid")
    ) {
      return "medium";
    }

    // Low severity errors that are recoverable
    return "low";
  }

  /**
   * Generates user-friendly error messages
   */
  private static generateUserMessage(
    error: Error,
    category: ErrorCategoryType
  ): string {
    const message = error.message.toLowerCase();

    switch (category) {
      case "file":
        if (message.includes("size")) {
          return "The selected file is too large. Please choose a smaller file or try compressing it first.";
        }
        if (message.includes("format") || message.includes("unsupported")) {
          return "This file format is not supported. Please select a JPEG, PNG, GIF, WebP, AVIF, SVG, or ICO file.";
        }
        if (message.includes("corrupt")) {
          return "The file appears to be corrupted or damaged. Please try a different file.";
        }
        return "There was a problem with the selected file. Please try a different file.";

      case "validation":
        if (message.includes("dimensions")) {
          return "The image dimensions don't meet the requirements. Please check the size limits.";
        }
        if (message.includes("security")) {
          return "The file failed security validation. Please ensure the file is safe and try again.";
        }
        return "The file didn't pass validation. Please check the file and try again.";

      case "conversion":
        if (message.includes("memory")) {
          return "The image is too large to process. Try using a smaller image or refresh the page.";
        }
        if (message.includes("timeout")) {
          return "The conversion is taking too long. Try with a smaller file or different settings.";
        }
        if (message.includes("canvas")) {
          return "Your browser couldn't process the image. Try refreshing the page or using a different browser.";
        }
        return "Failed to convert the image. Please try again with different settings.";

      case "memory":
        return "The application is running low on memory. Try refreshing the page or processing fewer files at once.";

      case "network":
        return "Network connection issue. Please check your internet connection and try again.";

      case "permission":
        return "Permission denied. Please check your browser settings and allow file access.";

      case "browser":
        if (message.includes("not supported")) {
          return "This feature is not supported in your browser. Please try using a modern browser like Chrome, Firefox, or Safari.";
        }
        return "Browser compatibility issue. Please try refreshing the page or using a different browser.";

      default:
        return "An unexpected error occurred. Please try again or refresh the page.";
    }
  }

  /**
   * Generates technical error messages for debugging
   */
  private static generateTechnicalMessage(error: Error): string {
    return `${error.name}: ${error.message}${
      error.stack ? `\n\nStack trace:\n${error.stack}` : ""
    }`;
  }

  /**
   * Determines recovery strategy based on error type
   */
  private static getRecoveryStrategy(
    error: Error,
    category: ErrorCategoryType
  ): ErrorRecoveryStrategyType {
    const message = error.message.toLowerCase();

    switch (category) {
      case "file":
      case "validation":
        return {
          canRetry: false,
          userAction: "Select a different file",
          autoRecover: false,
        };

      case "conversion":
        if (message.includes("memory")) {
          return {
            canRetry: true,
            maxRetries: 1,
            retryDelay: 2000,
            fallbackAction: "Reduce quality settings",
            userAction: "Try with lower quality settings or smaller file",
            autoRecover: false,
          };
        }
        if (message.includes("timeout")) {
          return {
            canRetry: true,
            maxRetries: 2,
            retryDelay: 1000,
            fallbackAction: "Use default settings",
            userAction: "Try with default conversion settings",
            autoRecover: false,
          };
        }
        return {
          canRetry: true,
          maxRetries: 3,
          retryDelay: 1000,
          userAction: "Try again or refresh the page",
          autoRecover: false,
        };

      case "memory":
        return {
          canRetry: false,
          fallbackAction: "Clear cache and reload",
          userAction: "Refresh the page or process fewer files",
          autoRecover: false,
        };

      case "network":
        return {
          canRetry: true,
          maxRetries: 3,
          retryDelay: 2000,
          userAction: "Check your internet connection",
          autoRecover: true,
        };

      case "permission":
        return {
          canRetry: false,
          userAction: "Check browser permissions and try again",
          autoRecover: false,
        };

      case "browser":
        return {
          canRetry: false,
          fallbackAction: "Use alternative method",
          userAction: "Try refreshing the page or use a different browser",
          autoRecover: false,
        };

      default:
        return {
          canRetry: true,
          maxRetries: 1,
          retryDelay: 1000,
          userAction: "Try again or refresh the page",
          autoRecover: false,
        };
    }
  }

  /**
   * Adds error to history with size limit
   */
  private static addToHistory(error: ProcessedErrorType): void {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Logs error to console with appropriate level
   */
  private static logError(error: ProcessedErrorType): void {
    const logData = {
      id: error.id,
      category: error.category,
      severity: error.severity,
      message: error.userMessage,
      technical: error.technicalMessage,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
    };

    switch (error.severity) {
      case "critical":
        console.error("🚨 Critical Error:", logData);
        break;
      case "high":
        console.error("❌ High Severity Error:", logData);
        break;
      case "medium":
        console.warn("⚠️ Medium Severity Error:", logData);
        break;
      case "low":
        console.info("ℹ️ Low Severity Error:", logData);
        break;
    }
  }

  /**
   * Gets error history for debugging
   */
  static getErrorHistory(): ProcessedErrorType[] {
    return [...this.errorHistory];
  }

  /**
   * Clears error history
   */
  static clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Gets error statistics
   */
  static getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategoryType, number>;
    bySeverity: Record<ErrorSeverityType, number>;
    recent: number;
  } {
    const now = Date.now();
    const recentThreshold = 5 * 60 * 1000; // 5 minutes

    const byCategory: Record<ErrorCategoryType, number> = {
      validation: 0,
      conversion: 0,
      network: 0,
      memory: 0,
      permission: 0,
      browser: 0,
      file: 0,
      unknown: 0,
    };

    const bySeverity: Record<ErrorSeverityType, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let recent = 0;

    this.errorHistory.forEach((error) => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
      if (now - error.timestamp < recentThreshold) {
        recent++;
      }
    });

    return {
      total: this.errorHistory.length,
      byCategory,
      bySeverity,
      recent,
    };
  }

  /**
   * Checks if error should be retried based on history
   */
  static shouldRetryError(
    error: ProcessedErrorType,
    currentRetryCount: number
  ): boolean {
    const { recoveryStrategy } = error;

    if (!recoveryStrategy.canRetry) {
      return false;
    }

    if (
      recoveryStrategy.maxRetries &&
      currentRetryCount >= recoveryStrategy.maxRetries
    ) {
      return false;
    }

    // Check if similar errors have been failing recently
    const recentSimilarErrors = this.errorHistory.filter(
      (e) => e.category === error.category && Date.now() - e.timestamp < 60000 // Last minute
    ).length;

    // Don't retry if too many similar errors recently
    if (recentSimilarErrors > 3) {
      return false;
    }

    return true;
  }

  /**
   * Gets retry delay for error
   */
  static getRetryDelay(error: ProcessedErrorType, retryCount: number): number {
    const baseDelay = error.recoveryStrategy.retryDelay || 1000;
    // Exponential backoff
    return baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Creates a standardized error for common scenarios
   */
  static createStandardError(
    type:
      | "file_too_large"
      | "unsupported_format"
      | "conversion_failed"
      | "memory_exceeded"
      | "network_error",
    details?: string
  ): Error {
    const errorMessages = {
      file_too_large: `File size exceeds the maximum limit${
        details ? `: ${details}` : ""
      }`,
      unsupported_format: `Unsupported file format${
        details ? `: ${details}` : ""
      }`,
      conversion_failed: `Image conversion failed${
        details ? `: ${details}` : ""
      }`,
      memory_exceeded: `Memory limit exceeded${details ? `: ${details}` : ""}`,
      network_error: `Network connection error${details ? `: ${details}` : ""}`,
    };

    return new Error(errorMessages[type]);
  }

  /**
   * Wraps async functions with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<
    { success: true; data: T } | { success: false; error: ProcessedErrorType }
  > {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (_error) {
      const processedError = this.processError(_error as Error, { context });
      return { success: false, error: processedError };
    }
  }
}

export default ErrorHandlingService;
