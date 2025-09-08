// Download manager component for handling file downloads
"use client";
import React from "react";
import styled from "styled-components";
import { Download, Archive, FileDown, Loader2 } from "lucide-react";
import type { ConversionResultType } from "@/types/conversion";
import type { DownloadOptionsType } from "@/types/components";
import { DownloadService, type DownloadProgressType } from "@/lib/services";

type DownloadManagerPropsType = {
  results: Map<string, ConversionResultType>;
  isDownloading?: boolean;
  downloadProgress?: DownloadProgressType;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;
  className?: string;
};

const DownloadManagerStyled = styled.div<{ $isDownloading: boolean }>`
  .download-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #f8fafc;
  }

  .download-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .download-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .download-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .download-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .download-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    opacity: ${(props) => (props.$isDownloading ? 0.6 : 1)};
    pointer-events: ${(props) => (props.$isDownloading ? "none" : "auto")};
  }

  .download-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .download-button.primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .download-button.primary:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .download-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .progress-container {
    margin-top: 0.5rem;
  }

  .progress-bar {
    width: 100%;
    height: 0.5rem;
    background: #e5e7eb;
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .individual-downloads {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .individual-download {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1f2937;
  }

  .file-details {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .download-single-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: white;
    color: #374151;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .download-single-button:hover {
    background: #f3f4f6;
  }
`;

export const DownloadManager: React.FC<DownloadManagerPropsType> = ({
  results,
  isDownloading = false,
  downloadProgress,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
  className,
}) => {
  const resultsArray = Array.from(results.values());
  const hasResults = resultsArray.length > 0;

  const handleDownloadAll = async (format: "individual" | "zip") => {
    if (!hasResults) return;

    try {
      onDownloadStart?.();

      const options: Partial<DownloadOptionsType> = {
        format,
        preserveNames: true,
        addTimestamp: false,
      };

      if (format === "zip") {
        await DownloadService.downloadAsZip(resultsArray, options);
      } else {
        await DownloadService.downloadMultipleFiles(resultsArray, options);
      }

      onDownloadComplete?.();
    } catch (error) {
      const downloadError =
        error instanceof Error ? error : new Error("Download failed");
      onDownloadError?.(downloadError);
    }
  };

  const handleDownloadSingle = async (result: ConversionResultType) => {
    try {
      onDownloadStart?.();

      const options: Partial<DownloadOptionsType> = {
        preserveNames: true,
        addTimestamp: false,
      };

      await DownloadService.downloadSingleFile(result, options);
      onDownloadComplete?.();
    } catch (error) {
      const downloadError =
        error instanceof Error ? error : new Error("Download failed");
      onDownloadError?.(downloadError);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getCompressionText = (result: ConversionResultType): string => {
    const savings =
      ((result.originalSize - result.convertedSize) / result.originalSize) *
      100;
    return savings > 0
      ? `${savings.toFixed(1)}% smaller`
      : `${Math.abs(savings).toFixed(1)}% larger`;
  };

  return (
    <DownloadManagerStyled $isDownloading={isDownloading} className={className}>
      <div className="download-container">
        <div className="download-header">
          <h3 className="download-title">Download Results</h3>
          <span className="download-count">
            {resultsArray.length} file{resultsArray.length !== 1 ? "s" : ""}{" "}
            ready
          </span>
        </div>

        {hasResults && (
          <div className="download-actions">
            <button
              className="download-button primary"
              onClick={() => handleDownloadAll("zip")}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Archive size={16} />
              )}
              Download as ZIP
            </button>

            <button
              className="download-button"
              onClick={() => handleDownloadAll("individual")}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Download All
            </button>
          </div>
        )}

        {downloadProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${downloadProgress.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {downloadProgress.status === "preparing" &&
                "Preparing download..."}
              {downloadProgress.status === "processing" &&
                downloadProgress.currentFile &&
                `Processing: ${downloadProgress.currentFile}`}
              {downloadProgress.status === "completed" && "Download complete!"}
              {downloadProgress.status === "error" &&
                `Error: ${downloadProgress.error?.message}`}
            </div>
          </div>
        )}

        {hasResults && (
          <div className="individual-downloads">
            {resultsArray.map((result, index) => (
              <div key={index} className="individual-download">
                <div className="file-info">
                  <div className="file-name">
                    {result.originalFile.name} → {result.format.toUpperCase()}
                  </div>
                  <div className="file-details">
                    {formatFileSize(result.originalSize)} →{" "}
                    {formatFileSize(result.convertedSize)}(
                    {getCompressionText(result)})
                  </div>
                </div>
                <button
                  className="download-single-button"
                  onClick={() => handleDownloadSingle(result)}
                  disabled={isDownloading}
                >
                  <FileDown size={14} />
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {!hasResults && (
          <div className="download-actions">
            <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No converted files available for download.
            </p>
          </div>
        )}
      </div>
    </DownloadManagerStyled>
  );
};
