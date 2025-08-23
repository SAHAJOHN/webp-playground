"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import styled from "styled-components";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

type ErrorBoundaryPropsType = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
};

type ErrorBoundaryStateType = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
};

const ErrorBoundaryStyled = styled.div`
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
    text-align: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.75rem;
    margin: 1rem 0;
  }

  .error-icon {
    width: 64px;
    height: 64px;
    color: #dc2626;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #991b1b;
    margin-bottom: 0.5rem;
  }

  .error-message {
    font-size: 1rem;
    color: #7f1d1d;
    margin-bottom: 1.5rem;
    max-width: 600px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .error-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .error-button.primary {
    background: #dc2626;
    color: white;
  }

  .error-button.primary:hover {
    background: #b91c1c;
  }

  .error-button.secondary {
    background: white;
    color: #dc2626;
    border: 1px solid #dc2626;
  }

  .error-button.secondary:hover {
    background: #fef2f2;
  }

  .error-details {
    margin-top: 2rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    text-align: left;
    max-width: 800px;
    width: 100%;
  }

  .error-details-toggle {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 0.875rem;
    cursor: pointer;
    text-decoration: underline;
    margin-bottom: 1rem;
  }

  .error-details-content {
    font-family: monospace;
    font-size: 0.75rem;
    color: #374151;
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.25rem;
  }

  .error-id {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 1rem;
    font-family: monospace;
  }

  @media (max-width: 640px) {
    .error-container {
      padding: 1rem;
      min-height: 300px;
    }

    .error-actions {
      flex-direction: column;
      width: 100%;
    }

    .error-button {
      width: 100%;
      justify-content: center;
    }
  }
`;

export class ErrorBoundary extends Component<
  ErrorBoundaryPropsType,
  ErrorBoundaryStateType
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryPropsType) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<ErrorBoundaryStateType> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryPropsType) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys have changed
    if (
      hasError &&
      resetOnPropsChange &&
      resetKeys &&
      prevProps.resetKeys &&
      resetKeys.some((key, idx) => key !== prevProps.resetKeys![idx])
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorBoundaryStyled>
          <ErrorDisplay
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            onGoHome={this.handleGoHome}
          />
        </ErrorBoundaryStyled>
      );
    }

    return children;
  }
}

type ErrorDisplayPropsType = {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
};

const ErrorDisplay: React.FC<ErrorDisplayPropsType> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onReload,
  onGoHome,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getErrorMessage = () => {
    if (!error) return "An unexpected error occurred";

    // Provide user-friendly messages for common errors
    if (error.message.includes("ChunkLoadError")) {
      return "Failed to load application resources. This might be due to a network issue or an updated version of the app.";
    }

    if (error.message.includes("Network")) {
      return "Network connection error. Please check your internet connection and try again.";
    }

    if (error.message.includes("Memory")) {
      return "The application ran out of memory. Try refreshing the page or processing fewer files at once.";
    }

    if (error.message.includes("Permission")) {
      return "Permission denied. Please check your browser settings and try again.";
    }

    // Return the original error message for other cases
    return error.message || "An unexpected error occurred";
  };

  const getRecoveryActions = () => {
    if (!error) return ["retry"];

    if (error.message.includes("ChunkLoadError")) {
      return ["reload"];
    }

    if (error.message.includes("Network")) {
      return ["retry", "reload"];
    }

    if (error.message.includes("Memory")) {
      return ["reload", "home"];
    }

    return ["retry", "reload"];
  };

  const recoveryActions = getRecoveryActions();

  return (
    <div className="error-container">
      <AlertTriangle className="error-icon" />
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{getErrorMessage()}</p>

      <div className="error-actions">
        {recoveryActions.includes("retry") && (
          <button
            type="button"
            className="error-button primary"
            onClick={onRetry}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}

        {recoveryActions.includes("reload") && (
          <button
            type="button"
            className="error-button secondary"
            onClick={onReload}
          >
            <RefreshCw size={16} />
            Reload Page
          </button>
        )}

        {recoveryActions.includes("home") && (
          <button
            type="button"
            className="error-button secondary"
            onClick={onGoHome}
          >
            <Home size={16} />
            Go Home
          </button>
        )}
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="error-details">
          <button
            type="button"
            className="error-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Bug
              size={14}
              style={{ display: "inline", marginRight: "0.25rem" }}
            />
            {showDetails ? "Hide" : "Show"} Error Details
          </button>

          {showDetails && (
            <div className="error-details-content">
              <strong>Error:</strong> {error?.name}: {error?.message}
              {"\n\n"}
              <strong>Stack Trace:</strong>
              {"\n"}
              {error?.stack}
              {"\n\n"}
              <strong>Component Stack:</strong>
              {"\n"}
              {errorInfo?.componentStack}
            </div>
          )}

          <div className="error-id">Error ID: {errorId}</div>
        </div>
      )}
    </div>
  );
};

export default ErrorBoundary;
