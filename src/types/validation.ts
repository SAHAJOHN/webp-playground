// File validation types for the multi-format image converter

export type ValidationResultType = {
  isValid: boolean;
  errors: string[];
  fileInfo: {
    size: number;
    type: string;
    dimensions?: { width: number; height: number };
  };
};

export type FileValidationRulesType = {
  maxFileSize: number; // in bytes
  supportedFormats: string[];
  maxDimensions?: { width: number; height: number };
  minDimensions?: { width: number; height: number };
  checkDimensions?: boolean; // Whether to check dimensions (defaults to true)
  requireDimensions?: boolean; // Whether to fail if dimensions can't be read
};

export type ValidationErrorType = {
  code: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type FileInfoType = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  dimensions?: { width: number; height: number };
  isValid: boolean;
  validationErrors: ValidationErrorType[];
};
