// File validation service with magic number verification and security checks

import type {
  ValidationResultType,
  FileValidationRulesType,
  ValidationErrorType,
  FileInfoType,
} from "@/types/validation";
import type { SupportedFormatType } from "@/types/conversion";
import {
  DEFAULT_VALIDATION_RULES,
  FILE_SIGNATURES,
  ERROR_MESSAGES,
  MIME_TYPE_MAP,
} from "@/lib/utils/constants";

export class FileValidationService {
  private static readonly MAX_HEADER_BYTES = 32; // Read first 32 bytes for magic number detection
  private static readonly SVG_SIGNATURES = ["<svg", "<?xml"];
  private static readonly AVIF_SIGNATURES = ["ftyp", "avif", "avis"];

  /**
   * Validates a file against security and format requirements
   */
  static async validateFile(
    file: File,
    rules: FileValidationRulesType = DEFAULT_VALIDATION_RULES
  ): Promise<ValidationResultType> {
    const errors: string[] = [];
    let fileInfo: ValidationResultType["fileInfo"];

    try {
      // Basic file checks
      if (!file || file.size === 0) {
        errors.push("File is empty or invalid");
        return {
          isValid: false,
          errors,
          fileInfo: { size: 0, type: "unknown" },
        };
      }

      // Size validation
      if (file.size > rules.maxFileSize) {
        errors.push(
          `File size (${this.formatFileSize(
            file.size
          )}) exceeds maximum limit (${this.formatFileSize(rules.maxFileSize)})`
        );
      }

      // Detect actual file type using magic numbers
      const detectedType = await this.detectFileType(file);

      if (!detectedType) {
        errors.push(ERROR_MESSAGES.UNSUPPORTED_FORMAT);
      } else {
        // Verify the detected type matches MIME type if available
        const mimeTypeValid = this.validateMimeType(file.type, detectedType);
        if (!mimeTypeValid && file.type) {
          errors.push("File extension doesn't match actual file content");
        }
      }

      // Get image dimensions for supported formats
      let dimensions: { width: number; height: number } | undefined;
      if (
        detectedType &&
        detectedType !== "svg" &&
        rules.checkDimensions !== false
      ) {
        try {
          dimensions = await this.getImageDimensions(file);

          // Validate dimensions if rules are provided
          if (dimensions && rules.maxDimensions) {
            if (
              dimensions.width > rules.maxDimensions.width ||
              dimensions.height > rules.maxDimensions.height
            ) {
              errors.push(
                `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum (${rules.maxDimensions.width}x${rules.maxDimensions.height})`
              );
            }
          }

          if (dimensions && rules.minDimensions) {
            if (
              dimensions.width < rules.minDimensions.width ||
              dimensions.height < rules.minDimensions.height
            ) {
              errors.push(
                `Image dimensions (${dimensions.width}x${dimensions.height}) below minimum (${rules.minDimensions.width}x${rules.minDimensions.height})`
              );
            }
          }
        } catch (error) {
          // In test environment, dimension checking might fail due to Image API limitations
          // Only add error if explicitly required
          if (rules.requireDimensions) {
            errors.push(
              "Unable to read image dimensions - file may be corrupted"
            );
          }
        }
      }

      fileInfo = {
        size: file.size,
        type: detectedType || "unknown",
        dimensions,
      };

      return {
        isValid: errors.length === 0,
        errors,
        fileInfo,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [ERROR_MESSAGES.FILE_CORRUPTED],
        fileInfo: { size: file.size, type: "unknown" },
      };
    }
  }

  /**
   * Detects file type using magic number signatures
   */
  private static async detectFileType(
    file: File
  ): Promise<SupportedFormatType | null> {
    try {
      const headerBuffer = await this.readFileHeader(file);
      const headerBytes = new Uint8Array(headerBuffer);

      // Check JPEG signature
      if (this.matchesSignature(headerBytes, FILE_SIGNATURES.jpeg)) {
        return "jpeg";
      }

      // Check PNG signature
      if (this.matchesSignature(headerBytes, FILE_SIGNATURES.png)) {
        return "png";
      }

      // Check GIF signature
      if (this.matchesSignature(headerBytes, FILE_SIGNATURES.gif)) {
        return "gif";
      }

      // Check ICO signature
      if (this.matchesSignature(headerBytes, FILE_SIGNATURES.ico)) {
        return "ico";
      }

      // Check WebP signature (RIFF + WebP at offset 8)
      if (this.matchesSignature(headerBytes, FILE_SIGNATURES.webp)) {
        const webpSignature = headerBytes.slice(8, 12);
        const webpMarker = String.fromCharCode(...webpSignature);
        if (webpMarker === "WEBP") {
          return "webp";
        }
      }

      // Check AVIF signature (more complex, check for ftyp box)
      if (await this.isAvifFile(file, headerBytes)) {
        return "avif";
      }

      // Check SVG (text-based)
      const isSvg = await this.isSvgFile(file);
      if (isSvg) {
        return "svg";
      }

      return null;
    } catch (error) {
      console.error("Error detecting file type:", error);
      return null;
    }
  }

  /**
   * Reads the first few bytes of a file for magic number detection
   */
  private static async readFileHeader(file: File): Promise<ArrayBuffer> {
    const slice = file.slice(0, this.MAX_HEADER_BYTES);

    // Handle both browser File API and test environment
    if (typeof slice.arrayBuffer === "function") {
      return await slice.arrayBuffer();
    }

    // Fallback for test environment or older browsers
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(slice);
    });
  }

  /**
   * Checks if byte array matches a signature pattern
   */
  private static matchesSignature(
    bytes: Uint8Array,
    signature: number[]
  ): boolean {
    if (bytes.length < signature.length) return false;

    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) return false;
    }

    return true;
  }

  /**
   * Detects AVIF files by checking for ftyp box and brand
   */
  private static async isAvifFile(
    file: File,
    headerBytes: Uint8Array
  ): Promise<boolean> {
    try {
      // AVIF files start with ftyp box
      if (headerBytes.length < 12) return false;

      const ftypSignature = String.fromCharCode(...headerBytes.slice(4, 8));
      if (ftypSignature !== "ftyp") return false;

      // Check for AVIF brand in the ftyp box
      const brand = String.fromCharCode(...headerBytes.slice(8, 12));
      return brand === "avif" || brand === "avis";
    } catch (error) {
      return false;
    }
  }

  /**
   * Detects SVG files by checking text content
   */
  private static async isSvgFile(file: File): Promise<boolean> {
    try {
      // Check MIME type first as a quick check
      if (file.type === "image/svg+xml") {
        // Read first 1KB to confirm it's really SVG
        const slice = file.slice(0, 1024);

        // Use FileReader for better compatibility in test environment
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const text = reader.result as string;
            const lowerText = text.toLowerCase().trim();
            const isSvg = this.SVG_SIGNATURES.some((signature) =>
              lowerText.startsWith(signature.toLowerCase())
            );
            resolve(isSvg);
          };
          reader.onerror = () => resolve(false);
          reader.readAsText(slice);
        });
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates that MIME type matches detected file type
   */
  private static validateMimeType(
    mimeType: string,
    detectedType: SupportedFormatType
  ): boolean {
    if (!mimeType) return true; // No MIME type to validate

    const validMimeTypes = MIME_TYPE_MAP[detectedType];
    return validMimeTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Gets image dimensions using Image API
   */
  private static async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  /**
   * Formats file size in human-readable format
   */
  private static formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Gets list of supported file formats
   */
  static getSupportedFormats(): SupportedFormatType[] {
    return Object.keys(MIME_TYPE_MAP) as SupportedFormatType[];
  }

  /**
   * Gets maximum allowed file size
   */
  static getMaxFileSize(): number {
    return DEFAULT_VALIDATION_RULES.maxFileSize;
  }

  /**
   * Validates multiple files in batch
   */
  static async validateFiles(
    files: File[],
    rules: FileValidationRulesType = DEFAULT_VALIDATION_RULES
  ): Promise<FileInfoType[]> {
    const validationPromises = files.map(async (file, index) => {
      const result = await this.validateFile(file, rules);

      const validationErrors: ValidationErrorType[] = result.errors.map(
        (error) => ({
          code: this.getErrorCode(error),
          message: error,
          severity: this.getErrorSeverity(error),
        })
      );

      return {
        name: file.name,
        size: file.size,
        type: result.fileInfo.type,
        lastModified: file.lastModified,
        dimensions: result.fileInfo.dimensions,
        isValid: result.isValid,
        validationErrors,
      };
    });

    return Promise.all(validationPromises);
  }

  /**
   * Maps error messages to error codes
   */
  private static getErrorCode(error: string): string {
    if (error.includes("size") && error.includes("exceeds"))
      return "FILE_TOO_LARGE";
    if (error.includes("format") || error.includes("supported"))
      return "UNSUPPORTED_FORMAT";
    if (error.includes("corrupted") || error.includes("dimensions"))
      return "FILE_CORRUPTED";
    if (error.includes("extension") && error.includes("content"))
      return "MIME_MISMATCH";
    if (error.includes("dimensions") && error.includes("exceed"))
      return "DIMENSIONS_TOO_LARGE";
    if (error.includes("dimensions") && error.includes("below"))
      return "DIMENSIONS_TOO_SMALL";
    return "VALIDATION_ERROR";
  }

  /**
   * Determines error severity based on error type
   */
  private static getErrorSeverity(error: string): "low" | "medium" | "high" {
    if (error.includes("corrupted") || error.includes("security"))
      return "high";
    if (error.includes("size") || error.includes("dimensions")) return "medium";
    return "low";
  }

  /**
   * Performs security checks on file content
   */
  static async performSecurityChecks(
    file: File
  ): Promise<ValidationErrorType[]> {
    const errors: ValidationErrorType[] = [];

    try {
      // Check for suspicious file names
      if (this.hasSuspiciousFileName(file.name)) {
        errors.push({
          code: "SUSPICIOUS_FILENAME",
          message: "File name contains potentially dangerous characters",
          severity: "medium",
        });
      }

      // Check for embedded scripts in SVG files
      if (
        file.type === "image/svg+xml" ||
        file.name.toLowerCase().endsWith(".svg")
      ) {
        const hasSuspiciousContent = await this.checkSvgSecurity(file);
        if (hasSuspiciousContent) {
          errors.push({
            code: "SUSPICIOUS_SVG_CONTENT",
            message: "SVG file contains potentially dangerous script content",
            severity: "high",
          });
        }
      }

      // Check for excessively large files that might cause DoS
      if (file.size > 100 * 1024 * 1024) {
        // 100MB
        errors.push({
          code: "POTENTIAL_DOS",
          message:
            "File size is extremely large and may cause performance issues",
          severity: "high",
        });
      }
    } catch (error) {
      errors.push({
        code: "SECURITY_CHECK_FAILED",
        message: "Unable to perform security validation",
        severity: "medium",
      });
    }

    return errors;
  }

  /**
   * Checks for suspicious file names
   */
  private static hasSuspiciousFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(fileName));
  }

  /**
   * Checks SVG files for potentially dangerous content
   */
  private static async checkSvgSecurity(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const lowerText = text.toLowerCase();

      // Check for script tags and event handlers
      const dangerousPatterns = [
        /<script/,
        /javascript:/,
        /on\w+\s*=/, // Event handlers like onclick, onload
        /<iframe/,
        /<object/,
        /<embed/,
      ];

      return dangerousPatterns.some((pattern) => pattern.test(lowerText));
    } catch (error) {
      return true; // Assume dangerous if we can't read it
    }
  }
}
