// Progress indicator component for individual and batch conversion progress
'use client';
import React from "react";
import styled from "styled-components";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { ProgressIndicatorPropsType } from "@/types/components";

const ProgressIndicatorStyled = styled.div<{
  status: ProgressIndicatorPropsType["status"];
}>`
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: white;
    transition: all 0.2s ease;
  }

  .progress-container:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .status-icon {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: ${(props) => {
      switch (props.status) {
        case "completed":
          return "#10b981";
        case "error":
          return "#ef4444";
        case "processing":
          return "#3b82f6";
        default:
          return "#6b7280";
      }
    }};
  }

  .status-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .file-name {
    font-weight: 500;
    color: #1f2937;
    truncate: true;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-percentage {
    font-size: 0.875rem;
    color: #6b7280;
    font-family: monospace;
    flex-shrink: 0;
  }

  .cancel-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .cancel-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .cancel-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .progress-bar-container {
    width: 100%;
    height: 0.5rem;
    background: #f1f5f9;
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: ${(props) => {
      switch (props.status) {
        case "completed":
          return "linear-gradient(90deg, #10b981, #059669)";
        case "error":
          return "linear-gradient(90deg, #ef4444, #dc2626)";
        case "processing":
          return "linear-gradient(90deg, #3b82f6, #2563eb)";
        default:
          return "#e2e8f0";
      }
    }};
    width: ${(props) =>
      props.status === "pending" ? "0%" : "var(--progress)"};
    transition: width 0.3s ease;
    border-radius: 0.25rem;
  }

  .progress-bar.indeterminate {
    width: 100%;
    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
    animation: indeterminate 1.5s ease-in-out infinite;
  }

  @keyframes indeterminate {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .error-message {
    font-size: 0.875rem;
    color: #ef4444;
    margin-top: 0.25rem;
    padding: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.25rem;
  }
`;

export const ProgressIndicator: React.FC<ProgressIndicatorPropsType> = ({
  progress,
  fileName,
  status,
  onCancel,
  className,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="status-icon" />;
      case "error":
        return <AlertCircle className="status-icon" />;
      case "processing":
        return <Loader2 className="status-icon spinning" />;
      default:
        return <div className="status-icon" />;
    }
  };

  const canCancel = status === "pending" || status === "processing";
  const showProgress = status !== "pending";

  return (
    <ProgressIndicatorStyled
      status={status}
      className={className}
      style={{ "--progress": `${progress}%` } as React.CSSProperties}
    >
      <div className="progress-container">
        <div className="progress-header">
          <div className="progress-info">
            {getStatusIcon()}
            <span className="file-name" title={fileName}>
              {fileName}
            </span>
          </div>

          {showProgress && (
            <span className="progress-percentage">{Math.round(progress)}%</span>
          )}

          {onCancel && (
            <button
              className="cancel-button"
              onClick={onCancel}
              disabled={!canCancel}
              title={canCancel ? "Cancel conversion" : "Cannot cancel"}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showProgress && (
          <div className="progress-bar-container">
            <div
              className={`progress-bar ${
                status === "processing" && progress === 0 ? "indeterminate" : ""
              }`}
            />
          </div>
        )}
      </div>
    </ProgressIndicatorStyled>
  );
};

export default ProgressIndicator;
