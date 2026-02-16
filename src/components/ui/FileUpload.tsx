"use client";

// File upload component with drag & drop functionality and accessibility features

import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { Upload, X, AlertCircle, FileCog } from "lucide-react";
import { theme } from "@/styles/theme";
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
          ? theme.colors.accent.error
          : props.isDragOver
          ? theme.colors.accent.primary
          : theme.colors.border.default};
    border-radius: ${theme.radii.xl};
    padding: ${theme.spacing[6]} ${theme.spacing[4]};
    text-align: center;
    background: ${(props) =>
      props.isDragOver
        ? theme.colors.bg.elevated
        : props.hasErrors
        ? `${theme.colors.accent.error}15`
        : theme.colors.bg.surface};
    transition: all ${theme.transitions.normal};
    cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};
    min-height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing[2]};
  }

  .upload-zone:hover {
    border-color: ${(props) =>
      !props.disabled && !props.hasErrors
        ? theme.colors.border.strong
        : undefined};
    background: ${(props) =>
      !props.disabled && !props.hasErrors
        ? theme.colors.bg.elevated
        : undefined};
  }

  .upload-icon {
    width: 48px;
    height: 48px;
    color: ${(props) =>
      props.hasErrors
        ? theme.colors.accent.error
        : props.isDragOver
        ? theme.colors.accent.primary
        : theme.colors.text.muted};
    margin-bottom: ${theme.spacing[2]};
  }

  .upload-text {
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing[1]};
  }

  .upload-subtext {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.text.muted};
    margin-bottom: ${theme.spacing[3]};
  }

  .upload-button {
    background: ${theme.colors.accent.primary};
    color: white;
    border: none;
    border-radius: ${theme.radii.lg};
    padding: ${theme.spacing[3]} ${theme.spacing[5]};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    cursor: pointer;
    transition: background ${theme.transitions.fast};
  }

  .upload-button:hover {
    background: ${theme.colors.accent.primaryHover};
  }

  .upload-button:disabled {
    background: ${theme.colors.bg.elevated};
    cursor: not-allowed;
    color: ${theme.colors.text.muted};
  }

  .file-input {
    display: none;
  }

  .format-info {
    margin-top: ${theme.spacing[3]};
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.text.muted};
    line-height: 1.5;
  }

  .file-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: ${theme.spacing[4]};
    padding: ${theme.spacing[3]};
    background: ${theme.colors.bg.surface};
    border: 1px solid ${theme.colors.border.subtle};
    border-radius: ${theme.radii.lg};
  }

  .file-count {
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.text.secondary};
  }

  .clear-all-button {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[2]};
    padding: ${theme.spacing[2]} ${theme.spacing[3]};
    background: transparent;
    border: 1px solid ${theme.colors.accent.error}50;
    border-radius: ${theme.radii.md};
    color: ${theme.colors.accent.error};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${theme.transitions.fast};

    &:hover {
      background: ${theme.colors.accent.error}15;
      border-color: ${theme.colors.accent.error};
    }
  }

  .file-list {
    margin-top: ${theme.spacing[3]};
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing[2]};
  }

  .file-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${theme.spacing[3]};
    background: ${theme.colors.bg.surface};
    border: 1px solid ${theme.colors.border.subtle};
    border-radius: ${theme.radii.lg};
    transition: all ${theme.transitions.fast};

    &:hover {
      border-color: ${theme.colors.border.default};
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[3]};
    flex: 1;
    height: 40px;
  }

  .file-preview {
    width: 40px;
    height: 40px;
    border-radius: ${theme.radii.md};
    overflow: hidden;
    flex-shrink: 0;
    background: ${theme.colors.bg.elevated};

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .file-details {
    flex: 1;
  }

  .file-name {
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    color: ${theme.colors.text.primary};
  }

  .file-meta {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.text.muted};
  }

  .file-status {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[3]};
    height: 40px;
  }

  .status-icon {
    width: 16px;
    height: 16px;

    &.valid { color: ${theme.colors.accent.success}; }
    &.error { color: ${theme.colors.accent.error}; }
  }

  .remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    color: ${theme.colors.text.muted};
    cursor: pointer;
    border-radius: ${theme.radii.md};
    transition: all ${theme.transitions.fast};

    &:hover {
      background: ${theme.colors.accent.error}15;
      color: ${theme.colors.accent.error};
    }
  }

  .error-list {
    margin-top: ${theme.spacing[4]};
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing[2]};
  }

  .error-item {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[3]};
    padding: ${theme.spacing[3]};
    background: ${theme.colors.accent.error}10;
    border: 1px solid ${theme.colors.accent.error}30;
    border-radius: ${theme.radii.md};
  }

  .error-icon {
    width: 20px;
    height: 20px;
    color: ${theme.colors.accent.error};
    flex-shrink: 0;
  }

  .error-text {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.accent.error};
  }

  .validation-loading {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[3]};
    margin-top: ${theme.spacing[4]};
    padding: ${theme.spacing[3]};
    background: ${theme.colors.bg.elevated};
    border: 1px solid ${theme.colors.border.subtle};
    border-radius: ${theme.radii.md};
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid ${theme.colors.border.default};
    border-top-color: ${theme.colors.accent.primary};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.text.secondary};
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
                    <div className="file-preview">
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                    </div>
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
                      <FileCog className="status-icon valid" />
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
