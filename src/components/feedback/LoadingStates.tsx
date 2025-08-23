"use client";

import React from "react";
import styled from "styled-components";
import { Loader, Upload, Download, Settings, Image, Zap } from "lucide-react";

type LoadingStateType =
  | "uploading"
  | "processing"
  | "converting"
  | "downloading"
  | "validating"
  | "general";

type LoadingStatePropsType = {
  type?: LoadingStateType;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
};

type SkeletonPropsType = {
  width?: string;
  height?: string;
  className?: string;
};

type LoadingOverlayPropsType = {
  isVisible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
  children?: React.ReactNode;
};

const LoadingStateStyled = styled.div<{ size: "small" | "medium" | "large" }>`
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${(props) => {
      switch (props.size) {
        case "small":
          return "0.5rem";
        case "large":
          return "1.5rem";
        default:
          return "1rem";
      }
    }};
    padding: ${(props) => {
      switch (props.size) {
        case "small":
          return "1rem";
        case "large":
          return "3rem";
        default:
          return "2rem";
      }
    }};
    text-align: center;
  }

  .loading-icon {
    width: ${(props) => {
      switch (props.size) {
        case "small":
          return "24px";
        case "large":
          return "64px";
        default:
          return "40px";
      }
    }};
    height: ${(props) => {
      switch (props.size) {
        case "small":
          return "24px";
        case "large":
          return "64px";
        default:
          return "40px";
      }
    }};
    color: #3b82f6;
    animation: spin 1s linear infinite;
  }

  .loading-icon.pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .loading-message {
    font-size: ${(props) => {
      switch (props.size) {
        case "small":
          return "0.875rem";
        case "large":
          return "1.125rem";
        default:
          return "1rem";
      }
    }};
    color: #6b7280;
    font-weight: 500;
    max-width: 300px;
    line-height: 1.4;
  }

  .loading-progress {
    width: 100%;
    max-width: 300px;
    margin-top: 0.5rem;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-fill::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }

  .progress-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
    font-family: monospace;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;

const SkeletonStyled = styled.div<{ width: string; height: string }>`
  .skeleton {
    width: ${(props) => props.width};
    height: ${(props) => props.height};
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 0.375rem;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const LoadingOverlayStyled = styled.div<{ isVisible: boolean }>`
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    opacity: ${(props) => (props.isVisible ? 1 : 0)};
    visibility: ${(props) => (props.isVisible ? "visible" : "hidden")};
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .overlay-content {
    background: white;
    border-radius: 0.75rem;
    padding: 2rem;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
    max-width: 400px;
    width: 90%;
    text-align: center;
  }

  .overlay-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .overlay-button {
    padding: 0.5rem 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .overlay-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
`;

export const LoadingState: React.FC<LoadingStatePropsType> = ({
  type = "general",
  message,
  progress,
  showProgress = false,
  size = "medium",
  className = "",
}) => {
  const getIcon = () => {
    switch (type) {
      case "uploading":
        return <Upload className="loading-icon pulse" />;
      case "processing":
      case "converting":
        return <Zap className="loading-icon" />;
      case "downloading":
        return <Download className="loading-icon pulse" />;
      case "validating":
        return <Settings className="loading-icon" />;
      default:
        return <Loader className="loading-icon" />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case "uploading":
        return "Uploading files...";
      case "processing":
        return "Processing images...";
      case "converting":
        return "Converting images...";
      case "downloading":
        return "Preparing download...";
      case "validating":
        return "Validating files...";
      default:
        return "Loading...";
    }
  };

  const displayMessage = message || getDefaultMessage();
  const showProgressBar = showProgress && typeof progress === "number";

  return (
    <LoadingStateStyled size={size} className={className}>
      <div className="loading-container">
        {getIcon()}
        <div className="loading-message">{displayMessage}</div>
        {showProgressBar && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, progress!))}%` }}
              />
            </div>
            <div className="progress-text">{Math.round(progress!)}%</div>
          </div>
        )}
      </div>
    </LoadingStateStyled>
  );
};

export const Skeleton: React.FC<SkeletonPropsType> = ({
  width = "100%",
  height = "1rem",
  className = "",
}) => {
  return (
    <SkeletonStyled width={width} height={height} className={className}>
      <div className="skeleton" />
    </SkeletonStyled>
  );
};

export const LoadingOverlay: React.FC<LoadingOverlayPropsType> = ({
  isVisible,
  message = "Processing...",
  progress,
  onCancel,
  children,
}) => {
  return (
    <LoadingOverlayStyled isVisible={isVisible}>
      <div className="overlay">
        <div className="overlay-content">
          {children || (
            <>
              <LoadingState
                type="processing"
                message={message}
                progress={progress}
                showProgress={typeof progress === "number"}
                size="large"
              />
              {onCancel && (
                <div className="overlay-actions">
                  <button
                    type="button"
                    className="overlay-button"
                    onClick={onCancel}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </LoadingOverlayStyled>
  );
};

// Skeleton components for specific use cases
export const FileListSkeleton: React.FC<{ count?: number }> = ({
  count = 3,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
          }}
        >
          <Skeleton width="40px" height="40px" />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height="1rem" />
            <div style={{ marginTop: "0.25rem" }}>
              <Skeleton width="40%" height="0.75rem" />
            </div>
          </div>
          <Skeleton width="80px" height="2rem" />
        </div>
      ))}
    </div>
  );
};

export const PreviewSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <div>
        <Skeleton width="100%" height="200px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="80%" height="1rem" />
        </div>
      </div>
      <div>
        <Skeleton width="100%" height="200px" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="70%" height="1rem" />
        </div>
      </div>
    </div>
  );
};

export const ConversionPanelSkeleton: React.FC = () => {
  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Skeleton width="150px" height="1.5rem" />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <Skeleton width="100px" height="1rem" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
          <Skeleton width="100%" height="2.5rem" />
          <Skeleton width="100%" height="2.5rem" />
          <Skeleton width="100%" height="2.5rem" />
        </div>
      </div>
      <div>
        <Skeleton width="80px" height="1rem" />
        <div style={{ marginTop: "0.5rem" }}>
          <Skeleton width="100%" height="1.5rem" />
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
