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
  status: "pending" | "processing" | "completed" | "error";
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
  preserveNames: boolean;
  addTimestamp: boolean;
  customPrefix?: string;
};

// Error Handling Props
export type ErrorBoundaryPropsType = {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
};
