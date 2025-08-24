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

// Styled Components
const MainContainerStyled = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);

  .header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    gap: 2rem;
  }

  .upload-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
  }

  .settings-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
  }

  .processing-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
  }

  .results-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    border: 1px solid #e2e8f0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 1.5rem;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .feature-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-size: 0.875rem;
    color: #64748b;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1.5rem;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
    font-size: 0.875rem;
  }

  .action-button.primary {
    background: #3b82f6;
    color: white;
  }

  .action-button.primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .action-button.secondary {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .action-button.secondary:hover:not(:disabled) {
    background: #e2e8f0;
  }

  .action-button.danger {
    background: #ef4444;
    color: white;
  }

  .action-button.danger:hover:not(:disabled) {
    background: #dc2626;
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #64748b;
  }

  .empty-state-icon {
    margin: 0 auto 1rem;
    width: 4rem;
    height: 4rem;
    color: #cbd5e1;
  }

  @media (max-width: 768px) {
    .content-wrapper {
      padding: 1rem;
      gap: 1rem;
    }

    .upload-section,
    .settings-section,
    .processing-section,
    .results-section {
      padding: 1.5rem;
    }

    .feature-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }

    .action-button {
      justify-content: center;
    }
  }
`;

const HeaderStyled = styled.header`
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .logo-icon {
    width: 2rem;
    height: 2rem;
    color: #3b82f6;
  }

  .privacy-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #ecfdf5;
    color: #059669;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #d1fae5;
  }

  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .logo {
      font-size: 1.25rem;
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
  }, []);

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

  // Handle clear files
  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    clearJobs();
  }, [clearJobs]);

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
              100% Client-Side Processing
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
            <span>Fast client-side conversion</span>
          </div>
          <div className="feature-card">
            <Shield size={20} />
            <span>No server uploads required</span>
          </div>
          <div className="feature-card">
            <FileImage size={20} />
            <span>7 formats supported</span>
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
              "gif",
              "webp",
              "avif",
              "svg",
              "ico",
            ]}
            maxFileSize={50 * 1024 * 1024} // 50MB
            maxFiles={10}
            disabled={isProcessing}
          />
          {selectedFiles.length > 0 && (
            <div className="action-buttons">
              <button
                className="action-button secondary"
                onClick={handleClearFiles}
                disabled={isProcessing}
              >
                <Trash2 size={16} />
                Clear Files
              </button>
            </div>
          )}
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
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
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
                gap: "1.5rem",
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
              Ready to convert your images?
            </h3>
            <p className="mb-4">
              Drag and drop your images above or click to select files.
              <br />
              Supports JPEG, PNG, GIF, WebP, AVIF, SVG, and ICO formats.
            </p>
          </div>
        )}
      </div>
    </MainContainerStyled>
  );
}
