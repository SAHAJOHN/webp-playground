// Custom hook for file upload with drag & drop and validation

import { useState, useCallback, useRef } from "react";
import { FileValidationService, DEFAULT_VALIDATION_RULES } from "@/lib/utils";
import type {
  UploadStateType,
  FileInfoType,
  FileValidationRulesType,
} from "@/types";

type UseFileUploadOptionsType = {
  maxFiles?: number;
  validationRules?: FileValidationRulesType;
  onFilesSelected?: (files: File[]) => void;
  onValidationComplete?: (fileInfos: FileInfoType[]) => void;
};

export const useFileUpload = (options: UseFileUploadOptionsType = {}) => {
  const {
    maxFiles = 10,
    validationRules = DEFAULT_VALIDATION_RULES,
    onFilesSelected,
    onValidationComplete,
  } = options;

  const [state, setState] = useState<UploadStateType>({
    files: [],
    isDragOver: false,
    validationErrors: new Map(),
    fileInfos: [],
  });

  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from input or drag & drop
  const handleFileSelect = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);

      // Clear previous errors and set files first
      setState((prev) => ({
        ...prev,
        files,
        validationErrors: new Map(),
        fileInfos: [],
      }));

      // Check max files limit
      if (files.length > maxFiles) {
        const error = `Maximum ${maxFiles} files allowed. Selected ${files.length} files.`;
        setState((prev) => ({
          ...prev,
          validationErrors: new Map([["maxFiles", [error]]]),
        }));
        return;
      }

      setIsValidating(true);

      try {
        // Validate all files
        const fileInfos = await FileValidationService.validateFiles(
          files,
          validationRules
        );

        // Group validation errors by file
        const validationErrors = new Map<string, string[]>();
        fileInfos.forEach((fileInfo, index) => {
          if (!fileInfo.isValid) {
            const errors = fileInfo.validationErrors.map(
              (error) => error.message
            );
            validationErrors.set(files[index].name, errors);
          }
        });

        setState((prev) => ({
          ...prev,
          validationErrors,
          fileInfos,
        }));

        // Call callbacks
        onFilesSelected?.(files);
        onValidationComplete?.(fileInfos);
      } catch (error) {
        console.error("File validation failed:", error);
        setState((prev) => ({
          ...prev,
          validationErrors: new Map([
            ["validation", ["File validation failed"]],
          ]),
        }));
      } finally {
        setIsValidating(false);
      }
    },
    [maxFiles, validationRules, onFilesSelected, onValidationComplete]
  );

  // Handle drag over event
  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setState((prev) => ({
      ...prev,
      isDragOver: true,
    }));
  }, []);

  // Handle drag leave event
  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Only set isDragOver to false if we're leaving the drop zone entirely
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setState((prev) => ({
        ...prev,
        isDragOver: false,
      }));
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setState((prev) => ({
        ...prev,
        isDragOver: false,
      }));

      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect]
  );

  // Remove a specific file
  const removeFile = useCallback((index: number) => {
    setState((prev) => {
      const newFiles = [...prev.files];
      const newFileInfos = [...prev.fileInfos];
      const removedFile = newFiles[index];

      newFiles.splice(index, 1);
      newFileInfos.splice(index, 1);

      // Remove validation errors for this file
      const newValidationErrors = new Map(prev.validationErrors);
      newValidationErrors.delete(removedFile.name);

      return {
        ...prev,
        files: newFiles,
        fileInfos: newFileInfos,
        validationErrors: newValidationErrors,
      };
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setState({
      files: [],
      isDragOver: false,
      validationErrors: new Map(),
      fileInfos: [],
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get accepted file types for input element
  const getAcceptedTypes = useCallback(() => {
    return validationRules.supportedFormats
      .map((format) => {
        switch (format) {
          case "jpeg":
            return "image/jpeg,image/jpg";
          case "png":
            return "image/png";
          case "gif":
            return "image/gif";
          case "webp":
            return "image/webp";
          case "avif":
            return "image/avif";
          case "svg":
            return "image/svg+xml";
          case "ico":
            return "image/x-icon,image/vnd.microsoft.icon";
          default:
            return "";
        }
      })
      .filter(Boolean)
      .join(",");
  }, [validationRules.supportedFormats]);

  // Check if any files have validation errors
  const hasValidationErrors = state.validationErrors.size > 0;

  // Check if all files are valid
  const allFilesValid =
    state.fileInfos.length > 0 &&
    state.fileInfos.every((fileInfo) => fileInfo.isValid);

  return {
    // State
    files: state.files,
    fileInfos: state.fileInfos,
    isDragOver: state.isDragOver,
    validationErrors: state.validationErrors,
    isValidating,
    hasValidationErrors,
    allFilesValid,

    // Actions
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    removeFile,
    clearFiles,
    openFilePicker,

    // Utilities
    fileInputRef,
    acceptedTypes: getAcceptedTypes(),
    maxFiles,
  };
};
