/**
 * WebAssembly Fallback Service
 * Provides image conversion capabilities using WebAssembly when Canvas API is limited
 * or for better performance with specific formats like WebP and AVIF
 */

import {
  ConversionSettingsType,
  SupportedFormatType,
} from "@/types/conversion";

type WebAssemblyModuleType = {
  encode: (
    imageData: Uint8Array,
    width: number,
    height: number,
    options: Record<string, unknown>
  ) => Uint8Array;
  decode: (encodedData: Uint8Array) => {
    data: Uint8Array;
    width: number;
    height: number;
  };
  getVersion: () => string;
  getSupportedFormats: () => string[];
};

type WasmCapabilitiesType = {
  webAssemblySupported: boolean;
  webpSupported: boolean;
  avifSupported: boolean;
  jpegSupported: boolean;
  pngSupported: boolean;
};

type FallbackOptionsType = {
  useWasmWhenAvailable: boolean;
  wasmModulePath: string;
  timeoutMs: number;
  enableDebugLogging: boolean;
};

export class WebAssemblyFallbackService {
  private static instance: WebAssemblyFallbackService | null = null;
  private wasmModule: WebAssemblyModuleType | null = null;
  private capabilities: WasmCapabilitiesType | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private readonly DEFAULT_OPTIONS: FallbackOptionsType = {
    useWasmWhenAvailable: true,
    wasmModulePath: "/wasm/image-converter.wasm",
    timeoutMs: 10000, // 10 second timeout
    enableDebugLogging: false,
  };

  private constructor(private options: Partial<FallbackOptionsType> = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    options?: Partial<FallbackOptionsType>
  ): WebAssemblyFallbackService {
    if (!this.instance) {
      this.instance = new WebAssemblyFallbackService(options);
    }
    return this.instance;
  }

  /**
   * Initialize WebAssembly module and detect capabilities
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Detect basic capabilities
      this.capabilities = await this.detectCapabilities();

      // Load WebAssembly module if supported and enabled
      if (
        this.capabilities.webAssemblySupported &&
        this.options.useWasmWhenAvailable
      ) {
        await this.loadWasmModule();
      }

      this.isInitialized = true;
      this.log("WebAssembly fallback service initialized", this.capabilities);
    } catch (error) {
      this.log("Failed to initialize WebAssembly fallback service:", error);
      // Continue without WASM - we'll use JavaScript fallbacks
      this.capabilities = {
        webAssemblySupported: false,
        webpSupported: false,
        avifSupported: false,
        jpegSupported: true, // Canvas API should handle these
        pngSupported: true,
      };
      this.isInitialized = true;
    }
  }

  /**
   * Detect browser capabilities for image processing
   */
  private async detectCapabilities(): Promise<WasmCapabilitiesType> {
    const capabilities: WasmCapabilitiesType = {
      webAssemblySupported: this.isWebAssemblySupported(),
      webpSupported: await this.isFormatSupported("webp"),
      avifSupported: await this.isFormatSupported("avif"),
      jpegSupported: await this.isFormatSupported("jpeg"),
      pngSupported: await this.isFormatSupported("png"),
    };

    return capabilities;
  }

  /**
   * Check if WebAssembly is supported
   */
  private isWebAssemblySupported(): boolean {
    try {
      return (
        typeof WebAssembly === "object" &&
        typeof WebAssembly.instantiate === "function" &&
        typeof WebAssembly.compile === "function"
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific image format is supported by the browser
   */
  private async isFormatSupported(
    format: SupportedFormatType
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }

        // Draw a simple pixel
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(0, 0, 1, 1);

        const mimeType = this.getMimeType(format);

        canvas.toBlob(
          (blob) => {
            resolve(blob !== null);
          },
          mimeType,
          0.5
        );
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Load WebAssembly module
   */
  private async loadWasmModule(): Promise<void> {
    try {
      const wasmResponse = await fetch(this.options.wasmModulePath || this.DEFAULT_OPTIONS.wasmModulePath);
      if (!wasmResponse.ok) {
        throw new Error(`Failed to fetch WASM module: ${wasmResponse.status}`);
      }

      const wasmBytes = await wasmResponse.arrayBuffer();
      const wasmModule = await WebAssembly.instantiate(wasmBytes);

      // Create wrapper for WASM functions
      this.wasmModule = this.createWasmWrapper(wasmModule.instance);

      this.log("WebAssembly module loaded successfully");
    } catch (_error) {
      this.log("Failed to load WebAssembly module:", _error);
      throw _error;
    }
  }

  /**
   * Create a wrapper for WebAssembly module functions
   */
  private createWasmWrapper(
    wasmInstance: WebAssembly.Instance
  ): WebAssemblyModuleType {
    const exports = wasmInstance.exports as Record<string, unknown>;

    return {
      encode: (
        imageData: Uint8Array,
        width: number,
        height: number,
        options: Record<string, unknown>
      ): Uint8Array => {
        try {
          // This is a simplified wrapper - actual implementation would depend on the WASM module's API
          const result = (exports as Record<string, (...args: unknown[]) => unknown>).encode_image(
            imageData,
            width,
            height,
            JSON.stringify(options)
          );
          return new Uint8Array(result as ArrayBuffer);
        } catch (_error) {
          throw new Error(`WASM encoding failed: ${_error}`);
        }
      },

      decode: (
        encodedData: Uint8Array
      ): { data: Uint8Array; width: number; height: number } => {
        try {
          const result = (exports as Record<string, (...args: unknown[]) => unknown>).decode_image(encodedData) as { data: ArrayBuffer; width: number; height: number };
          return {
            data: new Uint8Array(result.data),
            width: result.width,
            height: result.height,
          };
        } catch (_error) {
          throw new Error(`WASM decoding failed: ${_error}`);
        }
      },

      getVersion: (): string => {
        try {
          return String((exports as Record<string, (...args: unknown[]) => unknown>).get_version()) || "unknown";
        } catch {
          return "unknown";
        }
      },

      getSupportedFormats: (): string[] => {
        try {
          const formatsStr = String((exports as Record<string, (...args: unknown[]) => unknown>).get_supported_formats());
          return formatsStr ? JSON.parse(formatsStr) : [];
        } catch {
          return [];
        }
      },
    };
  }

  /**
   * Convert image using WebAssembly fallback
   */
  public async convertImageWithWasm(
    imageData: ImageData,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    await this.initialize();

    if (!this.wasmModule) {
      throw new Error("WebAssembly module not available");
    }

    if (!this.canConvertFormat(settings.format)) {
      throw new Error(
        `Format ${settings.format} not supported by WebAssembly fallback`
      );
    }

    try {
      const { data, width, height } = imageData;

      // Convert ImageData to format expected by WASM module
      const inputData = new Uint8Array(data);

      // Prepare conversion options
      const wasmOptions = this.prepareWasmOptions(settings);

      // Perform conversion
      const encodedData = this.wasmModule.encode(
        inputData,
        width,
        height,
        wasmOptions
      );

      // Create blob from encoded data
      const mimeType = this.getMimeType(settings.format);
      return new Blob([encodedData.buffer as ArrayBuffer], { type: mimeType });
    } catch (_error) {
      throw new Error(`WebAssembly conversion failed: ${_error}`);
    }
  }

  /**
   * Convert image using JavaScript fallback (when WASM is not available)
   */
  public async convertImageWithJavaScript(
    imageData: ImageData,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    await this.initialize();

    // Use Canvas API as JavaScript fallback
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Cannot get 2D context for JavaScript fallback");
    }

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert using canvas.convertToBlob (OffscreenCanvas method)
    const mimeType = this.getMimeType(settings.format);
    const quality = this.getQualityValue(settings);

    try {
      const blob = await canvas.convertToBlob({
        type: mimeType,
        quality: quality,
      });

      if (!blob) {
        throw new Error(
          `Failed to convert to ${settings.format} using JavaScript fallback`
        );
      }

      return blob;
    } catch (_error) {
      // Final fallback: use regular Canvas if OffscreenCanvas fails
      return this.convertWithRegularCanvas(imageData, settings);
    }
  }

  /**
   * Final fallback using regular Canvas API
   */
  private async convertWithRegularCanvas(
    imageData: ImageData,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(
            new Error("Cannot get 2D context for regular canvas fallback")
          );
          return;
        }

        ctx.putImageData(imageData, 0, 0);

        const mimeType = this.getMimeType(settings.format);
        const quality = this.getQualityValue(settings);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  `Failed to convert to ${settings.format} using regular canvas`
                )
              );
            }
          },
          mimeType,
          quality
        );
      } catch (_error) {
        reject(_error);
      }
    });
  }

  /**
   * Determine the best conversion method for given settings
   */
  public async getBestConversionMethod(
    settings: ConversionSettingsType
  ): Promise<"wasm" | "javascript" | "canvas"> {
    await this.initialize();

    if (!this.capabilities) {
      return "canvas"; // Safest fallback
    }

    // Prefer WASM for WebP and AVIF if available
    if (
      this.wasmModule &&
      (settings.format === "webp" || settings.format === "avif")
    ) {
      if (this.canConvertFormat(settings.format)) {
        return "wasm";
      }
    }

    // Use JavaScript fallback (OffscreenCanvas) if available
    if (typeof OffscreenCanvas !== "undefined") {
      return "javascript";
    }

    // Final fallback to regular Canvas
    return "canvas";
  }

  /**
   * Convert image using the best available method
   */
  public async convertImage(
    imageData: ImageData,
    settings: ConversionSettingsType
  ): Promise<Blob> {
    const method = await this.getBestConversionMethod(settings);

    this.log(
      `Using conversion method: ${method} for format: ${settings.format}`
    );

    switch (method) {
      case "wasm":
        return this.convertImageWithWasm(imageData, settings);
      case "javascript":
        return this.convertImageWithJavaScript(imageData, settings);
      case "canvas":
        return this.convertWithRegularCanvas(imageData, settings);
      default:
        throw new Error(`Unknown conversion method: ${method}`);
    }
  }

  /**
   * Check if format can be converted with current capabilities
   */
  public canConvertFormat(format: SupportedFormatType): boolean {
    if (!this.capabilities) {
      return false;
    }

    switch (format) {
      case "webp":
        return this.capabilities.webpSupported;
      case "avif":
        return this.capabilities.avifSupported;
      case "jpeg":
        return this.capabilities.jpegSupported;
      case "png":
        return this.capabilities.pngSupported;
      case "gif":
      case "svg":
      case "ico":
        return true; // These should be supported by Canvas API
      default:
        return false;
    }
  }

  /**
   * Get current capabilities
   */
  public getCapabilities(): WasmCapabilitiesType | null {
    return this.capabilities;
  }

  /**
   * Check if WebAssembly module is loaded and ready
   */
  public isWasmReady(): boolean {
    return this.wasmModule !== null;
  }

  /**
   * Prepare options for WebAssembly module
   */
  private prepareWasmOptions(settings: ConversionSettingsType): Record<string, unknown> {
    const options: Record<string, unknown> = {
      format: settings.format,
    };

    // Add format-specific options
    if (settings.quality !== undefined) {
      options.quality = settings.quality;
    }

    if (settings.lossless !== undefined) {
      options.lossless = settings.lossless;
    }

    if (settings.compressionLevel !== undefined) {
      options.compressionLevel = settings.compressionLevel;
    }

    return options;
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: SupportedFormatType): string {
    const mimeTypes: Record<SupportedFormatType, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      svg: "image/svg+xml",
      ico: "image/x-icon",
    };

    return mimeTypes[format];
  }

  /**
   * Get quality value for conversion
   */
  private getQualityValue(
    settings: ConversionSettingsType
  ): number | undefined {
    // Special handling for WebP - check lossless mode
    if (settings.format === "webp") {
      if (settings.lossless) {
        // For lossless WebP, use quality = 1.0
        // Firefox 105+ and some other browsers use this to trigger lossless encoding
        return 1.0;
      }
      return settings.quality !== undefined ? settings.quality / 100 : undefined;
    }

    // Other lossy formats always use quality
    const lossyFormats: SupportedFormatType[] = ["jpeg", "avif"];
    if (
      lossyFormats.includes(settings.format) &&
      settings.quality !== undefined
    ) {
      return settings.quality / 100; // Convert 1-100 to 0-1
    }

    return undefined;
  }

  /**
   * Log debug messages if enabled
   */
  private log(_message: string, ..._args: unknown[]): void {
    if (this.options.enableDebugLogging && typeof console !== 'undefined') {
      // Debug logging for development only
      // console.log(`[WebAssemblyFallbackService] ${_message}`, ..._args);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.wasmModule = null;
    this.capabilities = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    WebAssemblyFallbackService.instance = null;
  }
}
