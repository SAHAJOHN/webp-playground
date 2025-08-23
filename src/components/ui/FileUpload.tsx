"use client";

// File upload component with drag & drop functionality and accessibility features

import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { Upload, X, AlertCircle, CheckCircle, File } from "lucide-react";
import { useFileUpload } from "@/hooks/ui/useFileUpload";
import {
  useAccessibility,
  useKeyboardNavigation,
} from "@/hooks/ui/useAccessibility";
import type { FileUploadPropsType } from "@/types/components";

const FileUploadContainerStyled = styled.div.withConfig({
  shouldForwardProp: (prop) =>
    !["isDragOver", "hasErrors", "disabled"].includes(prop),
})<{
  isDragOver: boolean;
  hasErrors: boolean;
  disabled?: boolean;
}>`
  .upload-container {
    position: relative;
    width: 100%;
  }

  .upload-zone {
    border: 2px dashed
      ${(props) =>
        props.hasErrors ? "#ef4444" : props.isDragOver ? "#3b82f6" : "#e2e8f0"};
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    background-color: ${(props) =>
      props.isDragOver ? "#eff6ff" : props.hasErrors ? "#fef2f2" : "#fafafa"};
    transition: all 0.3s ease;
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.disabled ? 0.6 : 1)};
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    position: relative;
  }

  .upload-zone:focus-within {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .upload-zone[data-accessibility-mode="high-contrast"] {
    border-width: 3px;
    background-color: ${(props) =>
      props.isDragOver ? "#000080" : props.hasErrors ? "#800000" : "#ffffff"};
    color: ${(props) =>
      props.isDragOver ? "#ffffff" : props.hasErrors ? "#ffffff" : "#000000"};
  }

  .upload-zone:hover {
    border-color: ${(props) =>
      !props.disabled && !props.hasErrors ? "#3b82f6" : undefined};
    background-color: ${(props) =>
      !props.disabled && !props.hasErrors ? "#f8fafc" : undefined};
  }

  .upload-icon {
    width: 48px;
    height: 48px;
    color: ${(props) =>
      props.hasErrors ? "#ef4444" : props.isDragOver ? "#3b82f6" : "#6b7280"};
    margin-bottom: 0.5rem;
  }

  .upload-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${(props) =>
      props.hasErrors ? "#ef4444" : props.isDragOver ? "#3b82f6" : "#374151"};
    margin-bottom: 0.25rem;
  }

  .upload-subtext {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
  }

  .upload-button {
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
    min-height: 44px;
    min-width: 44px;
  }

  .upload-button:hover {
    background-color: #2563eb;
  }

  .upload-button:focus {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px #3b82f6;
  }

  .upload-button:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .upload-button[data-accessibility-mode="high-contrast"] {
    border: 2px solid #ffffff;
    background-color: #000080;
  }

  .upload-button[data-accessibility-mode="high-contrast"]:focus {
    outline: 3px solid #ffff00;
    outline-offset: 2px;
  }

  .file-input {
    display: none;
  }

  .file-list {
    margin-top: 1rem;
    space-y: 0.5rem;
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .file-item.error {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  .file-item.valid {
    border-color: #10b981;
    background-color: #f0fdf4;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .file-icon {
    width: 20px;
    height: 20px;
    color: #6b7280;
  }

  .file-details {
    flex: 1;
  }

  .file-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.125rem;
  }

  .file-meta {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .file-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-icon {
    width: 16px;
    height: 16px;
  }

  .status-icon.valid {
    color: #10b981;
  }

  .status-icon.error {
    color: #ef4444;
  }

  .remove-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    color: #6b7280;
    transition: color 0.2s ease;
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-button:hover {
    color: #ef4444;
    background-color: #fef2f2;
  }

  .remove-button:focus {
    outline: 2px solid #ef4444;
    outline-offset: 2px;
    background-color: #fef2f2;
  }

  .remove-button[data-accessibility-mode="high-contrast"] {
    border: 1px solid #000000;
    background-color: #ffffff;
  }

  .remove-button[data-accessibility-mode="high-contrast"]:focus {
    outline: 3px solid #ffff00;
    outline-offset: 2px;
  }

  .error-list {
    margin-top: 1rem;
  }

  .error-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 0.5rem;
  }

  .error-icon {
    width: 16px;
    height: 16px;
    color: #ef4444;
    flex-shrink: 0;
  }

  .error-text {
    font-size: 0.875rem;
    color: #dc2626;
  }

  .validation-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 0.875rem;
    color: #0369a1;
  }

  .format-info {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }
`;

export const FileUpload: React.FC<FileUploadPropsType> = ({
  onFilesSelected,
  acceptedFormats,
  maxFileSize,
  maxFiles = 10,
  disabled = false,
  className,
}) => {
  const {
    files,
    fileInfos,
    isDragOver,
    validationErrors,
    isValidating,
    hasValidationErrors,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    removeFile,
    clearFiles,
    openFilePicker,
    fileInputRef,
    acceptedTypes,
  } = useFileUpload({
    maxFiles,
    validationRules: {
      maxFileSize,
      supportedFormats: acceptedFormats as string[],
    },
    onFilesSelected,
  });

  const {
    accessibilityMode,
    announce,
    handleKeyboardNavigation,
    isHighContrast,
    isReducedMotion,
  } = useAccessibility({
    announceChanges: true,
    skipLinkTarget: "upload-zone",
    skipLinkLabel: "Skip to file upload",
  });

  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  // Get file item elements for keyboard navigation
  const getFileItemElements = (): HTMLElement[] => {
    if (!fileListRef.current) return [];
    return Array.from(
      fileListRef.current.querySelectorAll('[role="listitem"] button')
    ) as HTMLElement[];
  };

  const { currentIndex, onKeyDown } = useKeyboardNavigation(
    getFileItemElements(),
    "vertical"
  );

  // Announce file upload results
  useEffect(() => {
    if (files.length > 0) {
      const validFiles = files.filter((_, index) => {
        const fileInfo = fileInfos[index];
        return fileInfo?.isValid ?? true;
      }).length;

      announce({
        message: `${validFiles} of ${files.length} files selected successfully${
          validFiles < files.length
            ? ". Some files have validation errors."
            : ""
        }`,
        priority: validFiles < files.length ? "assertive" : "polite",
      });
    }
  }, [files.length, fileInfos, announce]);

  // Announce validation completion
  useEffect(() => {
    if (!isValidating && files.length > 0) {
      const errorCount = Array.from(validationErrors.values()).flat().length;
      if (errorCount > 0) {
        announce({
          message: `File validation complete. ${errorCount} validation errors found.`,
          priority: "assertive",
        });
      }
    }
  }, [isValidating, validationErrors, files.length, announce]);

  // Format file size for display
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

  // Enhanced drag and drop handlers with accessibility
  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      handleDragOver(e.nativeEvent);
      if (!isDragOver) {
        announce({
          message: "Files detected. Drop to upload.",
          priority: "polite",
        });
      }
    },
    onDragLeave: (e: React.DragEvent) => handleDragLeave(e.nativeEvent),
    onDrop: (e: React.DragEvent) => {
      handleDrop(e.nativeEvent);
      announce({
        message: "Files dropped. Processing...",
        priority: "polite",
      });
    },
  };

  // Keyboard handlers for upload zone
  const handleUploadZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) {
        openFilePicker();
        announce({
          message: "File picker opened",
          priority: "polite",
        });
      }
    }
  };

  // Enhanced remove file handler
  const handleRemoveFile = (index: number, fileName: string) => {
    removeFile(index);
    announce({
      message: `${fileName} removed from upload list`,
      priority: "polite",
    });
  };

  return (
    <FileUploadContainerStyled
      isDragOver={isDragOver}
      hasErrors={hasValidationErrors}
      disabled={disabled}
      className={className}
    >
      <div className="upload-container">
        <div
          ref={uploadZoneRef}
          id="upload-zone"
          className="upload-zone"
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Upload files. Drag and drop files here or press Enter to select files. Accepts ${acceptedFormats.join(
            ", "
          )} formats. Maximum ${maxFiles} files, ${formatFileSize(
            maxFileSize
          )} each.`}
          aria-describedby="upload-instructions"
          aria-disabled={disabled}
          data-accessibility-mode={accessibilityMode}
          onClick={!disabled ? openFilePicker : undefined}
          onKeyDown={handleUploadZoneKeyDown}
          {...dragHandlers}
        >
          <Upload className="upload-icon" />
          <div className="upload-text">
            {isDragOver
              ? "Drop files here"
              : hasValidationErrors
              ? "Some files have errors"
              : "Drag & drop files here"}
          </div>
          <div id="upload-instructions" className="upload-subtext">
            or press Enter to select files ({maxFiles} max)
          </div>
          <button
            type="button"
            className="upload-button"
            disabled={disabled}
            data-accessibility-mode={accessibilityMode}
            aria-label="Choose files to upload"
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
              announce({
                message: "File picker opened",
                priority: "polite",
              });
            }}
          >
            Choose Files
          </button>
          <div className="format-info">
            Supported formats: {acceptedFormats.join(", ").toUpperCase()}
            <br />
            Max size: {formatFileSize(maxFileSize)}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleInputChange}
          className="file-input"
          disabled={disabled}
          aria-label="File input for uploading images"
        />

        {isValidating && (
          <div className="validation-loading">
            <div className="loading-spinner" />
            <span className="loading-text">Validating files...</span>
          </div>
        )}

        {files.length > 0 && (
          <div
            ref={fileListRef}
            className="file-list"
            role="list"
            aria-label={`Uploaded files (${files.length} files)`}
            onKeyDown={onKeyDown}
          >
            {files.map((file, index) => {
              const fileInfo = fileInfos[index];
              const fileErrors = validationErrors.get(file.name) || [];
              const isValid = fileInfo?.isValid ?? true;

              return (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className={`file-item ${isValid ? "valid" : "error"}`}
                  role="listitem"
                  aria-label={`File: ${file.name}, ${formatFileSize(
                    file.size
                  )}${
                    fileInfo?.dimensions
                      ? `, ${fileInfo.dimensions.width}×${fileInfo.dimensions.height}`
                      : ""
                  }${isValid ? ", valid" : ", has errors"}`}
                >
                  <div className="file-info">
                    <File className="file-icon" />
                    <div className="file-details">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
                        {formatFileSize(file.size)}
                        {fileInfo?.dimensions && (
                          <>
                            {" "}
                            • {fileInfo.dimensions.width}×
                            {fileInfo.dimensions.height}
                          </>
                        )}
                        {fileInfo?.type && (
                          <> • {fileInfo.type.toUpperCase()}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="file-status">
                    {isValid ? (
                      <CheckCircle className="status-icon valid" />
                    ) : (
                      <AlertCircle className="status-icon error" />
                    )}
                    <button
                      type="button"
                      className="remove-button"
                      data-accessibility-mode={accessibilityMode}
                      onClick={() => handleRemoveFile(index, file.name)}
                      aria-label={`Remove ${file.name} from upload list`}
                      title={`Remove ${file.name}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasValidationErrors && (
          <div className="error-list">
            {Array.from(validationErrors.entries()).map(
              ([fileName, errors]) => (
                <div key={fileName}>
                  {errors.map((error, index) => (
                    <div key={index} className="error-item">
                      <AlertCircle className="error-icon" />
                      <span className="error-text">
                        <strong>{fileName}:</strong> {error}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {files.length > 0 && (
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <button
              type="button"
              onClick={clearFiles}
              style={{
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              Clear All Files
            </button>
          </div>
        )}
      </div>
    </FileUploadContainerStyled>
  );
};
