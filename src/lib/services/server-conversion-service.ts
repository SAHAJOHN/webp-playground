// Server-side image conversion service using Next.js API routes
// Provides better compression than client-side Canvas API

import type { ConversionSettingsType } from "@/types";

export interface ServerConversionOptionsType {
  useServer: boolean;
  effort?: number; // 0-6 for WebP, higher = better compression but slower
  nearLossless?: boolean; // For WebP lossless mode
}

export interface ServerConversionResultType {
  convertedBlob: Blob;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  format: string;
  processingTime?: number;
  isServerProcessed: boolean;
}

/**
 * Convert image using server-side processing for better compression
 */
export async function convertImageOnServer(
  file: File,
  settings: ConversionSettingsType,
  options?: ServerConversionOptionsType
): Promise<ServerConversionResultType> {
  const startTime = performance.now();
  
  try {
    // Prepare form data
    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", settings.format);
    formData.append("quality", settings.quality?.toString() || "80");
    formData.append("lossless", settings.lossless?.toString() || "false");
    
    // Add advanced options for WebP
    if (settings.format === "webp") {
      formData.append("effort", (options?.effort || 6).toString());
      formData.append("nearLossless", (options?.nearLossless || false).toString());
    }

    // Make API request
    const response = await fetch("/api/convert", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Server conversion failed");
    }

    // Get conversion metadata from headers
    const originalSize = parseInt(response.headers.get("X-Original-Size") || "0");
    const convertedSize = parseInt(response.headers.get("X-Converted-Size") || "0");
    const compressionRatio = parseFloat(response.headers.get("X-Compression-Ratio") || "1");

    // Get the converted blob
    const convertedBlob = await response.blob();

    const processingTime = performance.now() - startTime;

    return {
      convertedBlob,
      originalSize: originalSize || file.size,
      convertedSize: convertedSize || convertedBlob.size,
      compressionRatio,
      format: settings.format,
      processingTime,
      isServerProcessed: true,
    };
  } catch (error) {
    console.error("Server conversion error:", error);
    throw new Error(
      `Server conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Check if server conversion is available
 */
export async function isServerConversionAvailable(): Promise<boolean> {
  try {
    const response = await fetch("/api/convert", {
      method: "OPTIONS",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Determine if server conversion should be used based on file and settings
 */
export function shouldUseServerConversion(
  file: File,
  settings: ConversionSettingsType,
  userPreference?: boolean
): boolean {
  // Check if user has explicitly set preference in settings
  if (settings.useServer !== undefined) {
    return settings.useServer;
  }
  
  // If user explicitly disabled server conversion via parameter
  if (userPreference === false) {
    return false;
  }

  // Always use server for WebP lossless (better compression) unless user disabled it
  if (settings.format === "webp" && settings.lossless) {
    return true;
  }

  // Use server for large files (> 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return true;
  }

  // Use server for AVIF (better encoder)
  if (settings.format === "avif") {
    return true;
  }

  // Use client for small files and basic formats
  return false;
}

/**
 * Compare client vs server compression for benchmarking
 */
export async function compareCompressionMethods(
  file: File,
  settings: ConversionSettingsType
): Promise<{
  clientSize?: number;
  serverSize?: number;
  improvement?: number;
  recommendation: "client" | "server";
}> {
  try {
    // Try server conversion
    let serverSize: number | undefined;
    try {
      const serverResult = await convertImageOnServer(file, settings, {
        useServer: true,
        effort: 6,
      });
      serverSize = serverResult.convertedSize;
    } catch (error) {
      console.warn("Server comparison failed:", error);
    }

    // For comparison, we'd need the client-side result too
    // This would be obtained from the existing client-side conversion
    
    return {
      serverSize,
      recommendation: serverSize ? "server" : "client",
    };
  } catch (error) {
    console.error("Compression comparison failed:", error);
    return {
      recommendation: "client",
    };
  }
}