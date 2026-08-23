// Main types export for the multi-format image converter

// Conversion types
export type {
  SupportedFormatType,
  ConversionSettingsType,
  ConversionJobType,
  ConversionStateType,
  ConversionResultType,
} from "./conversion";

// Validation types
export type {
  ValidationResultType,
  FileValidationRulesType,
  ValidationErrorType,
  FileInfoType,
} from "./validation";

// Component types
export type {
  FileUploadPropsType,
  ConversionPanelPropsType,
  PreviewComparisonPropsType,
  ProgressIndicatorPropsType,
  UploadStateType,
  BatchProgressType,
  DownloadOptionsType,
  ErrorBoundaryPropsType,
} from "./components";

export {
  MAX_VIDEO_FILE_SIZE_BYTES,
  VIDEO_UPLOAD_CHUNK_SIZE_BYTES,
  AUDIO_OUTPUT_FORMATS,
  AUDIO_BITRATES_KBPS,
  SUPPORTED_VIDEO_EXTENSIONS,
} from "./video-conversion";
export type {
  AudioOutputFormatType,
  AudioBitrateKbpsType,
  SupportedVideoExtensionType,
  VideoJobStatusType,
  CreateVideoJobInputType,
  VideoConversionSettingsType,
  VideoJobPublicType,
  VideoConversionApiErrorType,
} from "./video-conversion";
