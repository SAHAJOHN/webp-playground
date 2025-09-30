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
    gap: 24px;
    padding: 24px;
    border: 1px solid rgba(50, 130, 184, 0.2);
    border-radius: 24px;
    background: rgba(50, 130, 184, 0.15);
    backdrop-filter: blur(10px);
      margin-top: 24px;
  }

  .download-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(50, 130, 184, 0.2);
  }

  .download-title {
    font-size: 24px;
    font-weight: 700;
    color: #BBE1FA;
    letter-spacing: -0.02em;
  }

  .download-count {
    font-size: 14px;
    font-weight: 600;
    color: #3282B8;
    padding: 8px 16px;
    background: rgba(50, 130, 184, 0.2);
    border-radius: 12px;
    border: 1px solid rgba(50, 130, 184, 0.3);
  }

  .download-actions {
    display: flex;
    gap: 16px;
  }

  .download-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 2px solid rgba(50, 130, 184, 0.3);
    border-radius: 16px;
    background: rgba(15, 76, 117, 0.5);
    color: #BBE1FA;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    opacity: ${(props) => (props.$isDownloading ? 0.5 : 1)};
    pointer-events: ${(props) => (props.$isDownloading ? "none" : "auto")};
    letter-spacing: 0.01em;

    svg {
      color: #3282B8;
    }
  }

  .download-button:hover:not(:disabled) {
    background: rgba(50, 130, 184, 0.3);
    border-color: rgba(50, 130, 184, 0.5);
    box-shadow: 0 4px 12px rgba(50, 130, 184, 0.2);
  }
    
  .download-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    pointer-events: none;
  }

  .progress-container {
    margin-top: 16px;
  }

  .progress-bar {
    width: 100%;
    height: 10px;
    background: rgba(15, 76, 117, 0.5);
    border-radius: 8px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3282B8 0%, #BBE1FA 100%);
    transition: width 0.3s ease;
    box-shadow: 0 0 12px rgba(50, 130, 184, 0.5);
  }

  .progress-text {
    font-size: 13px;
    color: rgba(187, 225, 250, 0.8);
    margin-top: 12px;
    font-weight: 500;
  }

  .individual-downloads {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid rgba(50, 130, 184, 0.2);
  }

  .individual-download {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: rgba(15, 76, 117, 0.4);
    border: 1px solid rgba(50, 130, 184, 0.3);
    border-radius: 16px;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(15, 76, 117, 0.5);
      border-color: rgba(50, 130, 184, 0.5);
    }
  }

  .file-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .file-name {
    font-size: 14px;
    font-weight: 600;
    color: #BBE1FA;
  }

  .file-details {
    font-size: 13px;
    color: rgba(187, 225, 250, 0.7);
    font-family: 'SF Mono', 'Monaco', monospace;
  }

  .download-single-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: 2px solid rgba(50, 130, 184, 0.3);
    border-radius: 12px;
    background: rgba(50, 130, 184, 0.2);
    color: #BBE1FA;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    svg {
      color: #3282B8;
    }

    &:hover:not(:disabled) {
      background: rgba(50, 130, 184, 0.3);
      border-color: rgba(50, 130, 184, 0.5);
      box-shadow: 0 4px 12px rgba(50, 130, 184, 0.2);
    }
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
              className="download-button"
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
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              No converted files available for download.
            </p>
          </div>
        )}
      </div>
    </DownloadManagerStyled>
  );
};
