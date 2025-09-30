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
        props.hasErrors
          ? "rgba(239, 68, 68, 0.5)"
          : props.isDragOver
          ? "rgba(50, 130, 184, 0.8)"
          : "rgba(50, 130, 184, 0.3)"};
    border-radius: 24px;
    padding: 48px 32px;
    text-align: center;
    background: ${(props) =>
      props.isDragOver
        ? "rgba(50, 130, 184, 0.2)"
        : props.hasErrors
        ? "rgba(239, 68, 68, 0.1)"
        : "rgba(15, 76, 117, 0.3)"};
    transition: all 0.3s ease;
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    position: relative;
    backdrop-filter: blur(10px);
  }

  .upload-zone[data-accessibility-mode="high-contrast"] {
    border-width: 3px;
    background-color: ${(props) =>
      props.isDragOver ? "#0F4C75" : props.hasErrors ? "#800000" : "#1B262C"};
    color: #BBE1FA;
  }

  .upload-zone:hover {
    border-color: ${(props) =>
      !props.disabled && !props.hasErrors
        ? "rgba(50, 130, 184, 0.6)"
        : undefined};
    background: ${(props) =>
      !props.disabled && !props.hasErrors
        ? "rgba(15, 76, 117, 0.4)"
        : undefined};
  }

  .upload-icon {
    width: 64px;
    height: 64px;
    color: ${(props) =>
      props.hasErrors
        ? "#ef4444"
        : props.isDragOver
        ? "#3282B8"
        : "rgba(50, 130, 184, 0.6)"};
    margin-bottom: 8px;
    filter: ${(props) =>
      props.isDragOver ? "drop-shadow(0 0 12px rgba(50, 130, 184, 0.5))" : "none"};
  }

  .upload-text {
    font-size: 24px;
    font-weight: 700;
    color: ${(props) =>
      props.hasErrors
        ? "#fca5a5"
        : props.isDragOver
        ? "#BBE1FA"
        : "#3282B8"};
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }

  .upload-subtext {
    font-size: 16px;
    color: rgba(187, 225, 250, 0.7);
    margin-bottom: 16px;
  }

  .upload-button {
    background: linear-gradient(135deg, #3282B8 0%, #0F4C75 100%);
    color: #BBE1FA;
    border: none;
    border-radius: 16px;
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 48px;
    min-width: 48px;
    box-shadow: 0 4px 16px rgba(50, 130, 184, 0.3);
    letter-spacing: 0.01em;
  }

  .upload-button:hover {
    background: linear-gradient(135deg, #4292C8 0%, #1F5C85 100%);
    box-shadow: 0 6px 20px rgba(50, 130, 184, 0.4);
    transform: translateY(-2px);
  }

  .upload-button:disabled {
    background: rgba(50, 130, 184, 0.3);
    cursor: not-allowed;
    box-shadow: none;
  }

  .upload-button[data-accessibility-mode="high-contrast"] {
    border: 2px solid #BBE1FA;
    background: #0F4C75;
  }

  .file-input {
    display: none;
  }

  .file-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding: 16px 16px 16px 20px;
    background: rgba(15, 76, 117, 0.3);
    border: 1px solid rgba(50, 130, 184, 0.3);
    border-radius: 16px;
    backdrop-filter: blur(10px);
  }

  .file-count {
    font-size: 14px;
    font-weight: 600;
    color: #BBE1FA;
  }

  .clear-all-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #fca5a5;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    svg {
      flex-shrink: 0;
    }

    &:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.5);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .file-list {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: rgba(15, 76, 117, 0.4);
    border: 1px solid rgba(50, 130, 184, 0.3);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .file-item:hover {
    background: rgba(15, 76, 117, 0.5);
    border-color: rgba(50, 130, 184, 0.5);
  }

  .file-item.error {
    border-color: rgba(239, 68, 68, 0.5);
    background: rgba(239, 68, 68, 0.1);
  }

  .file-item.valid {
    border-color: rgba(50, 130, 184, 0.5);
    background: rgba(50, 130, 184, 0.15);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
  }

  .file-icon {
    width: 30px;
    height: 30px;
    color: #3282B8;
  }

  .file-details {
    flex: 1;
  }

  .file-name {
    font-size: 14px;
    font-weight: 600;
    color: #BBE1FA;
  }

  .file-meta {
    font-size: 13px;
    color: rgba(187, 225, 250, 0.7);
  }

  .file-status {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-icon {
    width: 20px;
    height: 20px;
  }

  .status-icon.valid {
    color: #3282B8;
  }

  .status-icon.error {
    color: #ef4444;
  }

  .remove-button {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    cursor: pointer;
    padding: 8px;
    border-radius: 12px;
    color: #fca5a5;
    transition: all 0.3s ease;
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    transform: scale(1.05);
  }
  .remove-button[data-accessibility-mode="high-contrast"] {
    border: 2px solid #ef4444;
    background: rgba(239, 68, 68, 0.2);
  }

  .error-list {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .error-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
  }

  .error-icon {
    width: 20px;
    height: 20px;
    color: #ef4444;
    flex-shrink: 0;
  }

  .error-text {
    font-size: 14px;
    color: #fca5a5;
  }

  .validation-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
    padding: 16px;
    background: rgba(50, 130, 184, 0.15);
    border: 1px solid rgba(50, 130, 184, 0.3);
    border-radius: 12px;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(50, 130, 184, 0.3);
    border-top: 2px solid #3282B8;
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
    font-size: 14px;
    color: #BBE1FA;
  }

  .format-info {
    margin-top: 16px;
    font-size: 13px;
    color: rgba(187, 225, 250, 0.7);
    line-height: 1.6;
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

  const { onKeyDown } = useKeyboardNavigation(
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
  }, [files, fileInfos, announce]);

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
  }, [isValidating, validationErrors, files, announce]);

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

  // Clear all files handler
  const handleClearAllFiles = () => {
    const fileCount = files.length;
    clearFiles();
    announce({
      message: `All ${fileCount} files removed from upload list`,
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
          <>
            <div className="file-list-header">
              <span className="file-count">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
              <button
                type="button"
                className="clear-all-button"
                onClick={handleClearAllFiles}
                aria-label={`Clear all ${files.length} files`}
                title="Clear all files"
              >
                <X size={16} aria-hidden="true" />
                Clear All
              </button>
            </div>
            <div
              ref={fileListRef}
              className="file-list"
              role="list"
              aria-label={`Uploaded files (${files.length} files)`}
              onKeyDown={onKeyDown}
            >
              {files.map((file, index) => {
              const fileInfo = fileInfos[index];
              // const fileErrors = validationErrors.get(file.name) || [];
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
          </>
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
      </div>
    </FileUploadContainerStyled>
  );
};
