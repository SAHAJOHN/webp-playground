"use client";

import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileImage,
  Info,
} from "lucide-react";
import { PreviewComparisonPropsType } from "@/types/components";

// Styled Components with Dark Theme
const PreviewComparisonStyled = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isLoading"].includes(prop),
})<{ isLoading: boolean }>`
  .preview-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    border: 1px solid rgba(50, 130, 184, 0.2);
    border-radius: 24px;
    padding: 24px;
    background: rgba(15, 76, 117, 0.4);
    backdrop-filter: blur(10px);
    opacity: ${(props) => (props.isLoading ? 0.6 : 1)};
    transition: all 0.3s ease;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 24px;
    border-bottom: 1px solid rgba(50, 130, 184, 0.2);
  }

  .preview-title {
    font-weight: 700;
    font-size: 20px;
    color: #BBE1FA;
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.02em;

    svg {
      color: #3282B8;
    }
  }

  .zoom-controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .zoom-button {
    padding: 12px;
    border: 2px solid rgba(50, 130, 184, 0.3);
    border-radius: 12px;
    background: rgba(15, 76, 117, 0.5);
    color: #BBE1FA;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover:not(:disabled) {
      background: rgba(50, 130, 184, 0.3);
      border-color: rgba(50, 130, 184, 0.5);
      box-shadow: 0 4px 12px rgba(50, 130, 184, 0.2);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    svg {
      color: #3282B8;
    }
  }

  .zoom-level {
    font-size: 14px;
    font-weight: 600;
    color: #BBE1FA;
    min-width: 64px;
    text-align: center;
    font-family: 'SF Mono', 'Monaco', monospace;
  }

  .images-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .image-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .image-label {
    font-weight: 700;
    color: #BBE1FA;
    font-size: 16px;
    text-align: center;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .image-wrapper {
    position: relative;
    border: 2px solid rgba(50, 130, 184, 0.3);
    border-radius: 20px;
    overflow: hidden;
    background: rgba(27, 38, 44, 0.5);
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
  }

  .image-display {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: transform 0.3s ease;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: rgba(187, 225, 250, 0.6);
    min-height: 300px;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(50, 130, 184, 0.2);
    border-top: 3px solid #3282B8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .size-comparison {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    background: rgba(50, 130, 184, 0.15);
    border-radius: 20px;
    border: 1px solid rgba(50, 130, 184, 0.2);
    backdrop-filter: blur(10px);
  }

  .size-comparison-title {
    font-weight: 700;
    font-size: 16px;
    color: #BBE1FA;
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.01em;

    svg {
      color: #3282B8;
    }
  }

  .size-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .size-stat {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .size-stat-label {
    font-size: 12px;
    color: rgba(187, 225, 250, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .size-stat-value {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    font-weight: 700;
    font-size: 16px;
    color: #BBE1FA;
      &.positive {
          color: #BBE1FA;
      }

      &.negative {
          color: #fca5a5;
      }

      &.neutral {
          color: rgba(187, 225, 250, 0.8);
      }
  }

  .format-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: rgba(187, 225, 250, 0.8);
    font-weight: 500;
  }

  .error-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.2);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(239, 68, 68, 0.4);
    font-weight: 600;
  }
`;

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getCompressionRatio = (
  originalSize: number,
  convertedSize: number
): number => {
  if (originalSize === 0) return 0;
  return ((originalSize - convertedSize) / originalSize) * 100;
};

const getFileFormat = (file: File | Blob): string => {
  if (file instanceof File) {
    return file.type.split("/")[1]?.toUpperCase() || "Unknown";
  }
  return file.type.split("/")[1]?.toUpperCase() || "Unknown";
};

// Main Component
const PreviewComparison: React.FC<PreviewComparisonPropsType> = ({
  originalFile,
  convertedBlob,
  isLoading,
  showSizeComparison = true,
  className,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(
    null
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);
  const convertedImageRef = useRef<HTMLImageElement>(null);

  // Create object URLs for images
  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      setOriginalImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [originalFile]);

  useEffect(() => {
    if (convertedBlob) {
      const url = URL.createObjectURL(convertedBlob);
      setConvertedImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [convertedBlob]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 25));
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
  };

  // Image error handling
  const handleImageError = (type: "original" | "converted") => {
    setImageError(`Failed to load ${type} image`);
  };

  // Calculate compression stats
  const originalSize = originalFile.size;
  const convertedSize = convertedBlob?.size || 0;
  const compressionRatio = getCompressionRatio(originalSize, convertedSize);
  const sizeDifference = originalSize - convertedSize;

  return (
    <PreviewComparisonStyled isLoading={isLoading} className={className}>
      <div className="preview-container">
        <div className="preview-header">
          <div className="preview-title">
            <FileImage size={20} />
            Image Preview & Comparison
          </div>
          <div className="zoom-controls">
            <button
              className="zoom-button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 25}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button
              className="zoom-button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 400}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              className="zoom-button"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {imageError ? (
          <div className="error-message">
            <FileImage size={20} />
            {imageError}
          </div>
        ) : (
          <div className="images-container">
            <div className="image-section">
              <div className="image-label">Original</div>
              <div className="image-wrapper">
                {originalImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={originalImageRef}
                    src={originalImageUrl}
                    alt="Original image"
                    className="image-display"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                    }}
                    onError={() => handleImageError("original")}
                  />
                ) : (
                  <div className="loading-placeholder">
                    <div className="loading-spinner" />
                    <span>Loading original...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="image-section">
              <div className="image-label">Converted</div>
              <div className="image-wrapper">
                {isLoading ? (
                  <div className="loading-placeholder">
                    <div className="loading-spinner" />
                    <span>Converting...</span>
                  </div>
                ) : convertedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={convertedImageRef}
                    src={convertedImageUrl}
                    alt="Converted image"
                    className="image-display"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                    }}
                    onError={() => handleImageError("converted")}
                  />
                ) : (
                  <div className="loading-placeholder">
                    <FileImage size={48} />
                    <span>No converted image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showSizeComparison && convertedBlob && (
          <div className="size-comparison">
            <div className="size-comparison-title">
              <Info size={16} />
              File Information & Compression
            </div>

            <div className="format-info">
              <span>
                {getFileFormat(originalFile)} → {getFileFormat(convertedBlob)}
              </span>
              <span>{originalFile.name}</span>
            </div>

            <div className="size-stats">
              <div className="size-stat">
                <div className="size-stat-label">Original Size</div>
                <div className="size-stat-value">
                  {formatFileSize(originalSize)}
                </div>
              </div>

              <div className="size-stat">
                <div className="size-stat-label">Converted Size</div>
                <div className="size-stat-value">
                  {formatFileSize(convertedSize)}
                </div>
              </div>

              <div className="size-stat">
                <div className="size-stat-label">Size Difference</div>
                <div className="size-stat-value">
                  {sizeDifference >= 0 ? "-" : "+"}
                  {formatFileSize(Math.abs(sizeDifference))}
                </div>
              </div>

              <div className="size-stat">
                <div className="size-stat-label">Compression</div>
                <div
                  className={`size-stat-value ${
                    compressionRatio > 0
                      ? "positive"
                      : compressionRatio < 0
                      ? "negative"
                      : "neutral"
                  }`}
                >
                  {compressionRatio > 0
                    ? "↓"
                    : compressionRatio < 0
                    ? "↑"
                    : "→"}
                  {Math.abs(compressionRatio).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PreviewComparisonStyled>
  );
};

export default PreviewComparison;
