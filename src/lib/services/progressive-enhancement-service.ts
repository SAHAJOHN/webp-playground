/**
 * Progressive Enhancement Service
 * Provides graceful degradation and feature detection for older browsers
 * Ensures the application works across a wide range of browser capabilities
 */

import {
  SupportedFormatType,
  ConversionSettingsType,
} from "@/types/conversion";

type BrowserFeatureType = {
  canvas: boolean;
  canvas2d: boolean;
  webWorkers: boolean;
  webAssembly: boolean;
  offscreenCanvas: boolean;
  fileApi: boolean;
  dragAndDrop: boolean;
  webp: boolean;
  avif: boolean;
  modernJavaScript: boolean;
  touchEvents: boolean;
  pointerEvents: boolean;
};

type CompatibilityLevelType = "modern" | "enhanced" | "basic" | "minimal";

type FeaturePolyfillType = {
  name: string;
  check: () => boolean;
  polyfill?: () => Promise<void>;
  fallback: () => void;
  required: boolean;
};

type EnhancementOptionsType = {
  enablePolyfills: boolean;
  enableFallbacks: boolean;
  minCompatibilityLevel: CompatibilityLevelType;
  showCompatibilityWarnings: boolean;
  enableDebugLogging: boolean;
};

export class ProgressiveEnhancementService {
  private static instance: ProgressiveEnhancementService | null = null;
  private features: BrowserFeatureType | null = null;
  private compatibilityLevel: CompatibilityLevelType = "minimal";
  private isInitialized = false;
  private polyfillsLoaded = new Set<string>();

  private readonly DEFAULT_OPTIONS: EnhancementOptionsType = {
    enablePolyfills: true,
    enableFallbacks: true,
    minCompatibilityLevel: "basic",
    showCompatibilityWarnings: true,
    enableDebugLogging: false,
  };

  private constructor(private options: Partial<EnhancementOptionsType> = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    options?: Partial<EnhancementOptionsType>
  ): ProgressiveEnhancementService {
    if (!this.instance) {
      this.instance = new ProgressiveEnhancementService(options);
    }
    return this.instance;
  }

  /**
   * Initialize progressive enhancement detection
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Detect browser features
      this.features = await this.detectBrowserFeatures();

      // Determine compatibility level
      this.compatibilityLevel = this.determineCompatibilityLevel(this.features);

      // Load polyfills if enabled and needed
      if (this.options.enablePolyfills) {
        await this.loadRequiredPolyfills();
      }

      // Setup fallbacks if enabled
      if (this.options.enableFallbacks) {
        this.setupFallbacks();
      }

      // Show compatibility warnings if enabled
      if (this.options.showCompatibilityWarnings) {
        this.showCompatibilityWarnings();
      }

      this.isInitialized = true;
      this.log("Progressive enhancement initialized", {
        features: this.features,
        compatibilityLevel: this.compatibilityLevel,
      });
    } catch (error) {
      this.log("Failed to initialize progressive enhancement:", error);
      // Continue with minimal compatibility
      this.compatibilityLevel = "minimal";
      this.isInitialized = true;
    }
  }

  /**
   * Detect browser features and capabilities
   */
  private async detectBrowserFeatures(): Promise<BrowserFeatureType> {
    const features: BrowserFeatureType = {
      canvas: this.hasCanvas(),
      canvas2d: this.hasCanvas2D(),
      webWorkers: this.hasWebWorkers(),
      webAssembly: this.hasWebAssembly(),
      offscreenCanvas: this.hasOffscreenCanvas(),
      fileApi: this.hasFileApi(),
      dragAndDrop: this.hasDragAndDrop(),
      webp: await this.hasFormatSupport("webp"),
      avif: await this.hasFormatSupport("avif"),
      modernJavaScript: this.hasModernJavaScript(),
      touchEvents: this.hasTouchEvents(),
      pointerEvents: this.hasPointerEvents(),
    };

    return features;
  }

  /**
   * Check for Canvas API support
   */
  private hasCanvas(): boolean {
    try {
      return (
        typeof HTMLCanvasElement !== "undefined" &&
        document.createElement("canvas").getContext !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Check for Canvas 2D context support
   */
  private hasCanvas2D(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return canvas.getContext("2d") !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check for Web Workers support
   */
  private hasWebWorkers(): boolean {
    return typeof Worker !== "undefined";
  }

  /**
   * Check for WebAssembly support
   */
  private hasWebAssembly(): boolean {
    try {
      return (
        typeof WebAssembly === "object" &&
        typeof WebAssembly.instantiate === "function"
      );
    } catch {
      return false;
    }
  }

  /**
   * Check for OffscreenCanvas support
   */
  private hasOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== "undefined";
  }

  /**
   * Check for File API support
   */
  private hasFileApi(): boolean {
    return (
      typeof File !== "undefined" &&
      typeof FileReader !== "undefined" &&
      typeof Blob !== "undefined"
    );
  }

  /**
   * Check for drag and drop support
   */
  private hasDragAndDrop(): boolean {
    try {
      const div = document.createElement("div");
      return "draggable" in div && "ondrop" in div;
    } catch {
      return false;
    }
  }

  /**
   * Check for image format support
   */
  private async hasFormatSupport(format: "webp" | "avif"): Promise<boolean> {
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

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 1, 1);

        const mimeType = format === "webp" ? "image/webp" : "image/avif";

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
   * Check for modern JavaScript features
   */
  private hasModernJavaScript(): boolean {
    try {
      // Check for ES6+ features
      return (
        typeof Promise !== "undefined" &&
        typeof Map !== "undefined" &&
        typeof Set !== "undefined" &&
        typeof Symbol !== "undefined" &&
        Array.prototype.includes !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Check for touch events support
   */
  private hasTouchEvents(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Check for pointer events support
   */
  private hasPointerEvents(): boolean {
    return "onpointerdown" in window;
  }

  /**
   * Determine compatibility level based on features
   */
  private determineCompatibilityLevel(
    features: BrowserFeatureType
  ): CompatibilityLevelType {
    // Modern: All advanced features available
    if (
      features.canvas &&
      features.webWorkers &&
      features.webAssembly &&
      features.offscreenCanvas &&
      features.webp &&
      features.modernJavaScript
    ) {
      return "modern";
    }

    // Enhanced: Most features available, some advanced features missing
    if (
      features.canvas &&
      features.canvas2d &&
      features.fileApi &&
      features.modernJavaScript &&
      (features.webWorkers || features.webp)
    ) {
      return "enhanced";
    }

    // Basic: Essential features available
    if (features.canvas && features.canvas2d && features.fileApi) {
      return "basic";
    }

    // Minimal: Very limited features
    return "minimal";
  }

  /**
   * Load required polyfills based on missing features
   */
  private async loadRequiredPolyfills(): Promise<void> {
    const polyfills: FeaturePolyfillType[] = [
      {
        name: "Promise",
        check: () => typeof Promise !== "undefined",
        polyfill: () =>
          this.loadPolyfill(
            "https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js"
          ),
        fallback: () => this.setupPromiseFallback(),
        required: true,
      },
      {
        name: "FileReader",
        check: () => typeof FileReader !== "undefined",
        polyfill: () =>
          this.loadPolyfill(
            "https://cdn.jsdelivr.net/npm/filereader-js@0.1.0/filereader.min.js"
          ),
        fallback: () => this.setupFileReaderFallback(),
        required: true,
      },
      {
        name: "ArrayIncludes",
        check: () => Array.prototype.includes !== undefined,
        polyfill: () => this.loadArrayIncludesPolyfill(),
        fallback: () => this.setupArrayIncludesFallback(),
        required: false,
      },
    ];

    for (const polyfill of polyfills) {
      if (!polyfill.check()) {
        try {
          if (polyfill.polyfill) {
            await polyfill.polyfill();
            this.polyfillsLoaded.add(polyfill.name);
            this.log(`Loaded polyfill: ${polyfill.name}`);
          } else {
            polyfill.fallback();
            this.log(`Applied fallback: ${polyfill.name}`);
          }
        } catch (error) {
          this.log(`Failed to load polyfill ${polyfill.name}:`, error);
          if (polyfill.required) {
            polyfill.fallback();
          }
        }
      }
    }
  }

  /**
   * Load external polyfill script
   */
  private async loadPolyfill(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load polyfill: ${url}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Load Array.includes polyfill inline
   */
  private async loadArrayIncludesPolyfill(): Promise<void> {
    if (!Array.prototype.includes) {
      Array.prototype.includes = function (
        searchElement: unknown,
        _fromIndex?: number
      ): boolean {
        const O = Object(this);
        const len = parseInt(O.length) || 0;
        if (len === 0) return false;
        const n = _fromIndex !== undefined ? parseInt(_fromIndex.toString()) : 0;
        let k = n >= 0 ? n : Math.max(len + n, 0);

        while (k < len) {
          if (O[k] === searchElement) return true;
          k++;
        }
        return false;
      };
    }
  }

  /**
   * Setup fallbacks for missing features
   */
  private setupFallbacks(): void {
    // Setup Canvas fallback message
    if (!this.features?.canvas) {
      this.setupCanvasFallback();
    }

    // Setup File API fallback
    if (!this.features?.fileApi) {
      this.setupFileApiFallback();
    }

    // Setup drag and drop fallback
    if (!this.features?.dragAndDrop) {
      this.setupDragDropFallback();
    }
  }

  /**
   * Setup Canvas API fallback
   */
  private setupCanvasFallback(): void {
    // Create a mock canvas element that shows an error message
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName: string) {
      if (tagName.toLowerCase() === "canvas") {
        const div = originalCreateElement.call(document, "div");
        div.innerHTML = "Canvas not supported. Please use a modern browser.";
        div.style.cssText =
          "border: 1px solid #ccc; padding: 20px; text-align: center; background: #f9f9f9;";
        return div as unknown as HTMLCanvasElement;
      }
      return originalCreateElement.call(document, tagName);
    };
  }

  /**
   * Setup File API fallback
   */
  private setupFileApiFallback(): void {
    // Show message about file upload limitations
    this.showUserMessage(
      "File upload features are limited in your browser. Please use a modern browser for full functionality.",
      "warning"
    );
  }

  /**
   * Setup drag and drop fallback
   */
  private setupDragDropFallback(): void {
    // Ensure file input is always visible when drag and drop is not available
    const style = document.createElement("style");
    style.textContent = `
      .drag-drop-zone {
        display: none !important;
      }
      .file-input-fallback {
        display: block !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup Promise fallback for very old browsers
   */
  private setupPromiseFallback(): void {
    // Very basic Promise implementation
    if (typeof Promise === "undefined") {
      (window as { Promise?: unknown }).Promise = class BasicPromise {
        constructor(_executor: (resolve: (value?: unknown) => void, reject: (error?: unknown) => void) => void) {
          setTimeout(() => {
            try {
              _executor(
                (value: unknown) => this.resolve(value),
                (error: unknown) => this.reject(error)
              );
            } catch (error) {
              this.reject(error);
            }
          }, 0);
        }

        resolve(_value: unknown) {
          // Basic implementation
        }

        reject(_error: unknown) {
          // Basic implementation
        }

        static resolve(value: unknown) {
          return new BasicPromise((resolve) => resolve(value));
        }

        static reject(error: unknown) {
          return new BasicPromise((_resolve, reject) => reject(error));
        }
      };
    }
  }

  /**
   * Setup FileReader fallback
   */
  private setupFileReaderFallback(): void {
    this.showUserMessage(
      "File reading is not supported in your browser. Some features may not work.",
      "error"
    );
  }

  /**
   * Setup Array.includes fallback
   */
  private setupArrayIncludesFallback(): void {
    // Already handled in loadArrayIncludesPolyfill
  }

  /**
   * Show compatibility warnings to users
   */
  private showCompatibilityWarnings(): void {
    if (!this.features) return;

    const warnings: string[] = [];

    if (this.compatibilityLevel === "minimal") {
      warnings.push(
        "Your browser has limited support for image conversion features."
      );
    }

    if (!this.features.webp) {
      warnings.push("WebP format is not supported in your browser.");
    }

    if (!this.features.avif) {
      warnings.push("AVIF format is not supported in your browser.");
    }

    if (!this.features.webWorkers) {
      warnings.push(
        "Background processing is not available. Large files may cause the page to freeze temporarily."
      );
    }

    if (!this.features.dragAndDrop) {
      warnings.push(
        "Drag and drop is not supported. Please use the file selection button."
      );
    }

    if (warnings.length > 0) {
      this.showUserMessage(
        `Browser Compatibility Notice:\n${warnings.join("\n")}`,
        "info"
      );
    }
  }

  /**
   * Show message to user
   */
  private showUserMessage(
    message: string,
    type: "info" | "warning" | "error"
  ): void {
    // Create a simple notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 300px;
      padding: 15px;
      border-radius: 5px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10000;
      ${type === "error" ? "background: #dc3545;" : ""}
      ${type === "warning" ? "background: #ffc107; color: #000;" : ""}
      ${type === "info" ? "background: #17a2b8;" : ""}
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  /**
   * Get supported formats based on browser capabilities
   */
  public getSupportedFormats(): SupportedFormatType[] {
    if (!this.features) {
      return ["jpeg", "png"]; // Safest fallback
    }

    const formats: SupportedFormatType[] = ["jpeg", "png", "gif"];

    if (this.features.webp) {
      formats.push("webp");
    }

    if (this.features.avif) {
      formats.push("avif");
    }

    // SVG and ICO are generally supported if Canvas is available
    if (this.features.canvas) {
      formats.push("svg", "ico");
    }

    return formats;
  }

  /**
   * Get recommended settings for current browser
   */
  public getRecommendedSettings(
    targetFormat: SupportedFormatType
  ): Partial<ConversionSettingsType> {
    const settings: Partial<ConversionSettingsType> = {
      format: targetFormat,
    };

    // Adjust quality based on capabilities
    if (
      this.compatibilityLevel === "minimal" ||
      this.compatibilityLevel === "basic"
    ) {
      // Use higher quality for better compatibility
      settings.quality = 90;
    } else {
      // Can use more aggressive compression
      settings.quality = 80;
    }

    // Fallback format if target is not supported
    if (!this.getSupportedFormats().includes(targetFormat)) {
      if (targetFormat === "webp" || targetFormat === "avif") {
        settings.format = "jpeg"; // Most compatible fallback
      } else {
        settings.format = "png"; // Lossless fallback
      }
    }

    return settings;
  }

  /**
   * Check if a specific feature is available
   */
  public hasFeature(feature: keyof BrowserFeatureType): boolean {
    return this.features?.[feature] ?? false;
  }

  /**
   * Get current compatibility level
   */
  public getCompatibilityLevel(): CompatibilityLevelType {
    return this.compatibilityLevel;
  }

  /**
   * Get all detected features
   */
  public getFeatures(): BrowserFeatureType | null {
    return this.features;
  }

  /**
   * Check if polyfill was loaded
   */
  public isPolyfillLoaded(name: string): boolean {
    return this.polyfillsLoaded.has(name);
  }

  /**
   * Log debug messages if enabled
   */
  private log(_message: string, ..._args: unknown[]): void {
    if (this.options.enableDebugLogging && typeof console !== 'undefined') {
      // Debug logging for development only
      // console.log(`[ProgressiveEnhancementService] ${_message}`, ..._args);
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.features = null;
    this.isInitialized = false;
    this.polyfillsLoaded.clear();
    ProgressiveEnhancementService.instance = null;
  }
}
