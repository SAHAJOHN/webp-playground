// Component prop types for the multi-format image converter

import { ConversionSettingsType } from "./conversion";
import { FileInfoType } from "./validation";

// File Upload Component Props
export type FileUploadPropsType = {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats: string[];
  maxFileSize: number;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
};

// Conversion Panel Component Props
export type ConversionPanelPropsType = {
  settings: ConversionSettingsType;
  onSettingsChange: (settings: ConversionSettingsType) => void;
  isProcessing: boolean;
  disabled?: boolean;
  className?: string;
};

// Preview Comparison Component Props
export type PreviewComparisonPropsType = {
  originalFile: File;
  convertedBlob: Blob | null;
  isLoading: boolean;
  showSizeComparison?: boolean;
  className?: string;
};

// Progress Indicator Component Props
export type ProgressIndicatorPropsType = {
  progress: number;
  fileName: string;
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  onCancel?: () => void;
  className?: string;
};

// Upload State Type
export type UploadStateType = {
  files: File[];
  isDragOver: boolean;
  validationErrors: Map<string, string[]>;
  fileInfos: FileInfoType[];
};

// Batch Progress Type
export type BatchProgressType = {
  totalFiles: number;
  completedFiles: number;
  currentFile?: string;
  overallProgress: number;
  individualProgress: Map<string, number>;
};

// Download Options Type
export type DownloadOptionsType = {
  format: "individual" | "zip";
  /**
   * Keep the original file base name for each downloaded file / ZIP entry and
   * only swap the extension for the converted format (`holiday.jpg` ->
   * `holiday.webp`). Defaults to `true`.
   */
  preserveNames: boolean;
  /**
   * Append a timestamp to the ZIP archive name. When `preserveNames` is
   * `false`, the timestamp is also appended to entry names (legacy behavior).
   */
  addTimestamp: boolean;
  /**
   * Prefix for the ZIP archive name. When `preserveNames` is `false`, the
   * prefix is also applied to entry names (legacy behavior).
   */
  customPrefix?: string;
};

// Error Handling Props
export type ErrorBoundaryPropsType = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};
