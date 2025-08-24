import {
  ConversionSettingsType,
  ConversionResultType,
  SupportedFormatType,
} from "@/types/conversion";
import { convertImageOnServer } from "./server-conversion-service";

export class ImageConversionService {
  /**
   * Convert an image file to the specified format with given settings
   * Always uses server-side Sharp for best compression
   */
  static async convertImage(
    file: File,
    settings: ConversionSettingsType,
    onProgress?: (progress: number, message?: string) => void
  ): Promise<ConversionResultType> {

    try {
      // Always use server-side conversion with Sharp for best compression
      onProgress?.(0, "Processing with Sharp...");
      
      const serverResult = await convertImageOnServer(file, settings, {
        useServer: true,
        effort: settings.effort || 6, // Maximum compression effort
        nearLossless: settings.nearLossless !== undefined && settings.nearLossless < 100,
      });
      
      onProgress?.(100, "Conversion complete");
      
      return {
        originalFile: file,
        convertedBlob: serverResult.convertedBlob,
        originalSize: serverResult.originalSize,
        convertedSize: serverResult.convertedSize,
        compressionRatio: serverResult.compressionRatio,
        format: serverResult.format as SupportedFormatType,
      };
    } catch (error) {
      throw new Error(
        `Conversion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validate file is an image
   */
  static validateFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
  }
}