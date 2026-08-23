// Progress indicator component for individual and batch conversion progress
'use client';
import React from "react";
import styled from "styled-components";
import { X, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import type { ProgressIndicatorPropsType } from "@/types/components";

const ProgressIndicatorStyled = styled.div<{
  status: ProgressIndicatorPropsType["status"];
}>`
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border: 1px solid rgba(50, 130, 184, 0.3);
    border-radius: 16px;
    background: rgba(15, 76, 117, 0.4);
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .progress-container:hover {
    border-color: rgba(50, 130, 184, 0.5);
    background: rgba(15, 76, 117, 0.5);
  }

  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .status-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: ${(props) => {
      switch (props.status) {
        case "completed":
          return "#3282B8";
        case "error":
          return "#ef4444";
        case "processing":
          return "#BBE1FA";
        default:
          return "rgba(187, 225, 250, 0.5)";
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
    font-weight: 600;
    font-size: 14px;
    color: #BBE1FA;
    truncate: true;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-percentage {
    font-size: 12px;
    color: #3282B8;
    font-family: 'SF Mono', 'Monaco', monospace;
    font-weight: 700;
    flex-shrink: 0;
  }

  .cancel-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
      min-height: 24px;
      min-width: 24px;
    border: 2px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .cancel-button:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
  }

  .cancel-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .progress-bar-container {
    width: 100%;
    height: 10px;
    background: rgba(15, 76, 117, 0.5);
    border-radius: 8px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: ${(props) => {
      switch (props.status) {
        case "completed":
          return "linear-gradient(90deg, #3282B8, #BBE1FA)";
        case "error":
          return "linear-gradient(90deg, #ef4444, #dc2626)";
        case "processing":
          return "linear-gradient(90deg, #3282B8, #BBE1FA)";
        default:
          return "rgba(50, 130, 184, 0.3)";
      }
    }};
    width: ${(props) =>
      props.status === "pending" ? "0%" : "var(--progress)"};
    transition: width 0.3s ease;
    border-radius: 8px;
    box-shadow: ${(props) =>
      props.status === "processing" || props.status === "completed"
        ? "0 0 12px rgba(50, 130, 184, 0.5)"
        : "none"};
  }

  .progress-bar.indeterminate {
    width: 100%;
    background: linear-gradient(90deg, transparent, #3282B8, transparent);
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
    font-size: 14px;
    color: #ef4444;
    margin-top: 4px;
    padding: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 4px;
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
      case "pending":
        return <Clock className="status-icon" />;
      default:
        return <div className="status-icon" />;
    }
  };

  const canCancel = status === "pending";
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
