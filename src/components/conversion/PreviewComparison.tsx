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

// Styled Components
const PreviewComparisonStyled = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isLoading"].includes(prop),
})<{ isLoading: boolean }>`
  .preview-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    background: white;
    opacity: ${(props) => (props.isLoading ? 0.7 : 1)};
    transition: opacity 0.3s ease;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .preview-title {
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .zoom-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .zoom-button {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .zoom-level {
    font-size: 0.875rem;
    color: #6b7280;
    min-width: 3rem;
    text-align: center;
  }

  .images-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    min-height: 300px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .image-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .image-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    text-align: center;
  }

  .image-wrapper {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    overflow: hidden;
    background: #f9fafb;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
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
    gap: 0.5rem;
    color: #6b7280;
    min-height: 200px;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
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
    gap: 0.75rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    border: 1px solid #e2e8f0;
  }

  .size-comparison-title {
    font-weight: 600;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .size-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .size-stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .size-stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .size-stat-value {
    font-family: monospace;
    font-weight: 600;
    color: #1e293b;
  }

  .compression-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;

    &.positive {
      background: #dcfce7;
      color: #166534;
    }

    &.negative {
      background: #fef2f2;
      color: #dc2626;
    }

    &.neutral {
      background: #f1f5f9;
      color: #475569;
    }
  }

  .format-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .error-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #dc2626;
    background: #fef2f2;
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid #fecaca;
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
                  className={`compression-indicator ${
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
