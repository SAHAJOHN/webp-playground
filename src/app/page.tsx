"use client";

import { useState, useCallback } from "react";
import styled from "styled-components";
import {
  ImageIcon,
  Settings,
  Download,
  RefreshCw,
  Trash2,
  Shield,
  Zap,
  FileImage,
} from "lucide-react";
import {
  FileUpload,
  ConversionPanel,
  PreviewComparison,
  ProgressIndicator,
  DownloadManager,
} from "@/components";
import { useSimpleImageConversion } from "@/hooks/conversion/useSimpleImageConversion";
import type { ConversionSettingsType, SupportedFormatType, ConversionResultType } from "@/types";

// Styled Components with Dark Theme
const MainContainerStyled = styled.div`
  min-height: 100vh;
  background: #1B262C;
  position: relative;

  /* Subtle gradient overlay */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(15, 76, 117, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(50, 130, 184, 0.2) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .content-wrapper {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .upload-section,
  .settings-section,
  .processing-section,
  .results-section {
    background: rgba(15, 76, 117, 0.4);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    padding: 24px;
    border: 1px solid rgba(50, 130, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
    font-weight: 700;
    color: #BBE1FA;
    margin-bottom: 24px;

    svg {
      color: #3282B8;
    }
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .feature-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px;
    background: rgba(50, 130, 184, 0.15);
    border-radius: 20px;
    border: 1px solid rgba(187, 225, 250, 0.2);
    font-size: 14px;
    color: #BBE1FA;
    font-weight: 500;
    transition: all 0.3s ease;

    svg {
      color: #3282B8;
      flex-shrink: 0;
    }

    &:hover {
      background: rgba(50, 130, 184, 0.25);
      border-color: rgba(187, 225, 250, 0.4);
      transform: translateY(-2px);
    }
  }

  .action-buttons {
    display: flex;
    gap: 16px;
    margin-top: 24px;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 32px;
    border-radius: 16px;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
    letter-spacing: 0.01em;

    &.primary {
      background: linear-gradient(135deg, #3282B8 0%, #0F4C75 100%);
      color: #BBE1FA;
      box-shadow: 0 4px 16px rgba(50, 130, 184, 0.3);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #4292C8 0%, #1F5C85 100%);
        box-shadow: 0 6px 20px rgba(50, 130, 184, 0.4);
        transform: translateY(-2px);
      }
    }

    &.secondary {
      background: rgba(50, 130, 184, 0.2);
      color: #BBE1FA;
      border: 1px solid rgba(187, 225, 250, 0.3);

      &:hover:not(:disabled) {
        background: rgba(50, 130, 184, 0.3);
        border-color: rgba(187, 225, 250, 0.5);
      }
    }

    &.danger {
      background: rgba(220, 38, 38, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(220, 38, 38, 0.3);

      &:hover:not(:disabled) {
        background: rgba(220, 38, 38, 0.3);
        border-color: rgba(220, 38, 38, 0.5);
      }
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .empty-state {
    text-align: center;
    padding: 64px 32px;
    color: #3282B8;
  }

  .empty-state-icon {
    margin: 0 auto 24px;
    width: 80px;
    height: 80px;
    color: rgba(50, 130, 184, 0.4);
  }

  .empty-state h3 {
    color: #BBE1FA;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .empty-state p {
    color: #3282B8;
    font-size: 16px;
    line-height: 1.6;
  }

  

    .upload-section,
    .settings-section,
    .processing-section,
    .results-section {
      padding: 24px;
      border-radius: 20px;
    }

    .section-title {
      font-size: 20px;
    }

    .feature-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .action-buttons {
      flex-direction: column;
    }

    .action-button {
      justify-content: center;
      width: 100%;
    }
  }
`;

const HeaderStyled = styled.header`
  position: relative;
  z-index: 10;
  background: rgba(27, 38, 44, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(50, 130, 184, 0.2);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);

  .header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 28px;
    font-weight: 800;
    color: #BBE1FA;
    letter-spacing: -0.03em;
  }

  .logo-icon {
    width: 40px;
    height: 40px;
    color: #3282B8;
    filter: drop-shadow(0 0 8px rgba(50, 130, 184, 0.5));
  }

  .privacy-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background: rgba(50, 130, 184, 0.2);
    color: #BBE1FA;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid rgba(187, 225, 250, 0.3);
    letter-spacing: 0.01em;

    svg {
      color: #3282B8;
    }
  }

  

    .logo {
      font-size: 24px;
    }

    .logo-icon {
      width: 32px;
      height: 32px;
    }
  }
`;

export default function Home() {
  // State for selected files and conversion settings
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversionSettings, setConversionSettings] =
    useState<ConversionSettingsType>({
      format: "webp" as SupportedFormatType,
      quality: 80,
      lossless: false,
      progressive: true,
      interlace: true,
    });

  // Simple image conversion hook for testing
  const {
    jobs: simpleJobs,
    isProcessing,
    results: simpleResults,
    convertFiles,
    clearJobs,
  } = useSimpleImageConversion();

  // Handle files selected from FileUpload component
  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);

    // Clear jobs if no files selected
    if (files.length === 0) {
      clearJobs();
    }
  }, [clearJobs]);

  // Handle conversion start
  const handleStartConversion = useCallback(() => {
    if (selectedFiles.length > 0) {
      convertFiles(selectedFiles, conversionSettings);
    }
  }, [selectedFiles, conversionSettings, convertFiles]);

  // Handle settings change
  const handleSettingsChange = useCallback(
    (newSettings: ConversionSettingsType) => {
      setConversionSettings(newSettings);
    },
    []
  );

  // Get job arrays for display
  const jobsArray = simpleJobs;
  const resultsArray = simpleResults;
  const hasResults = resultsArray.length > 0;

  // Convert results array to Map for DownloadManager
  const resultsMap = new Map<string, ConversionResultType>();
  resultsArray.forEach((result, index) => {
    resultsMap.set(`result-${index}`, result);
  });

  return (
    <MainContainerStyled>
      {/* Header */}
      <HeaderStyled>
        <div className="header">
          <div className="header-content">
            <div className="logo">
              <ImageIcon className="logo-icon" />
              Multi-Format Image Converter
            </div>
            <div className="privacy-badge">
              <Shield size={16} />
              Server-Side Sharp Processing
            </div>
          </div>
        </div>
      </HeaderStyled>

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Features Overview */}
        <div className="feature-grid">
          <div className="feature-card">
            <Zap size={20} />
            <span>Server-side Sharp processing</span>
          </div>
          <div className="feature-card">
            <Shield size={20} />
            <span>Superior compression quality</span>
          </div>
          <div className="feature-card">
            <FileImage size={20} />
            <span>4 formats supported (JPEG, PNG, WebP, AVIF)</span>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="upload-section">
          <h2 className="section-title">
            <FileImage size={24} />
            Upload Images
          </h2>
          <FileUpload
            onFilesSelected={handleFilesSelected}
            acceptedFormats={[
              "jpeg",
              "jpg",
              "png",
              "webp",
              "avif",
            ]}
            maxFileSize={50 * 1024 * 1024} // 50MB
            maxFiles={10}
            disabled={isProcessing}
          />
        </div>

        {/* Conversion Settings Section */}
        {selectedFiles.length > 0 && (
          <div className="settings-section">
            <h2 className="section-title">
              <Settings size={24} />
              Conversion Settings
            </h2>
            <ConversionPanel
              settings={conversionSettings}
              onSettingsChange={handleSettingsChange}
              isProcessing={isProcessing}
            />
            <div className="action-buttons">
              <button
                className="action-button primary"
                onClick={handleStartConversion}
                disabled={isProcessing || selectedFiles.length === 0}
              >
                <RefreshCw size={16} />
                {isProcessing ? "Converting..." : "Start Conversion"}
              </button>
            </div>
          </div>
        )}

        {/* Processing Section */}
        {jobsArray.length > 0 && (
          <div className="processing-section">
            <h2 className="section-title">
              <RefreshCw size={24} />
              Conversion Progress
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {jobsArray.map((job) => (
                <ProgressIndicator
                  key={job.id}
                  progress={job.progress}
                  fileName={job.file.name}
                  status={job.status}
                  onCancel={() => {
                    // Cancel individual job if needed
                  }}
                />
              ))}
            </div>
            {isProcessing && (
              <div className="action-buttons">
                <button className="action-button danger" onClick={clearJobs}>
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {hasResults && (
          <div className="results-section">
            <h2 className="section-title">
              <Download size={24} />
              Conversion Results
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              {resultsArray.map((result, idx) => (
                <PreviewComparison
                  key={`result-${idx}`}
                  originalFile={result.originalFile}
                  convertedBlob={result.convertedBlob}
                  isLoading={false}
                  showSizeComparison={true}
                />
              ))}
            </div>
            <DownloadManager
              results={resultsMap}
              isDownloading={false}
            />
          </div>
        )}

        {/* Empty State */}
        {selectedFiles.length === 0 && !hasResults && (
          <div className="empty-state">
            <FileImage className="empty-state-icon" />
            <h3 className="text-lg font-semibold mb-2">
              Ready to convert your images with Sharp?
            </h3>
            <p className="mb-4">
              Upload your images above to convert with server-side Sharp processing.
              <br />
              Supports JPEG, PNG, WebP, and AVIF output formats.
            </p>
          </div>
        )}
      </div>
    </MainContainerStyled>
  );
}
