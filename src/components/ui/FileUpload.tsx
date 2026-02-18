"use client";

// File upload component with drag & drop functionality and accessibility features

import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { Upload, AlertCircle } from "lucide-react";
import { theme } from "@/styles/theme";
import { useFileUpload } from "@/hooks/ui/useFileUpload";
import {
  useAccessibility,
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
  maxFiles = 50,
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
    openFilePicker,
    fileInputRef,
    acceptedTypes,
  } = useFileUpload({
    maxFiles,
    validationRules: {
      maxFileSize,
      supportedFormats: acceptedFormats as string[],
      checkDimensions: false,
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
