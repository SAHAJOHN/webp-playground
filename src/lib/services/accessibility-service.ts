// Accessibility service for managing keyboard navigation and screen reader support

export type AccessibilityModeType =
  | "normal"
  | "high-contrast"
  | "reduced-motion";

export type KeyboardNavigationConfigType = {
  enableFocusTrapping: boolean;
  enableSkipLinks: boolean;
  enableArrowKeyNavigation: boolean;
  announceChanges: boolean;
};

export type ScreenReaderAnnouncementType = {
  message: string;
  priority: "polite" | "assertive";
  delay?: number;
};

class AccessibilityService {
  private static instance: AccessibilityService;
  private announcer: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];
  private currentMode: AccessibilityModeType = "normal";
  private keyboardConfig: KeyboardNavigationConfigType = {
    enableFocusTrapping: true,
    enableSkipLinks: true,
    enableArrowKeyNavigation: true,
    announceChanges: true,
  };

  private constructor() {
    this.initializeAnnouncer();
    this.detectUserPreferences();
  }

  static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  // Initialize screen reader announcer
  private initializeAnnouncer(): void {
    if (typeof window === "undefined") return;

    this.announcer = document.createElement("div");
    this.announcer.setAttribute("aria-live", "polite");
    this.announcer.setAttribute("aria-atomic", "true");
    this.announcer.setAttribute("id", "accessibility-announcer");
    this.announcer.style.position = "absolute";
    this.announcer.style.left = "-10000px";
    this.announcer.style.width = "1px";
    this.announcer.style.height = "1px";
    this.announcer.style.overflow = "hidden";
    document.body.appendChild(this.announcer);
  }

  // Detect user accessibility preferences
  private detectUserPreferences(): void {
    if (typeof window === "undefined") return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia(
      "(prefers-contrast: high)"
    ).matches;

    if (prefersReducedMotion) {
      this.setAccessibilityMode("reduced-motion");
    } else if (prefersHighContrast) {
      this.setAccessibilityMode("high-contrast");
    }

    // Listen for preference changes
    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener("change", (e) => {
        if (e.matches) {
          this.setAccessibilityMode("reduced-motion");
        } else {
          this.setAccessibilityMode("normal");
        }
      });

    window
      .matchMedia("(prefers-contrast: high)")
      .addEventListener("change", (e) => {
        if (e.matches) {
          this.setAccessibilityMode("high-contrast");
        } else {
          this.setAccessibilityMode("normal");
        }
      });
  }

  // Set accessibility mode
  setAccessibilityMode(mode: AccessibilityModeType): void {
    this.currentMode = mode;
    document.documentElement.setAttribute("data-accessibility-mode", mode);

    this.announce({
      message: `Accessibility mode changed to ${mode.replace("-", " ")}`,
      priority: "polite",
    });
  }

  getAccessibilityMode(): AccessibilityModeType {
    return this.currentMode;
  }

  // Screen reader announcements
  announce(announcement: ScreenReaderAnnouncementType): void {
    if (!this.announcer || !this.keyboardConfig.announceChanges) return;

    const delay = announcement.delay || 100;

    setTimeout(() => {
      if (this.announcer) {
        this.announcer.setAttribute("aria-live", announcement.priority);
        this.announcer.textContent = announcement.message;

        // Clear after announcement
        setTimeout(() => {
          if (this.announcer) {
            this.announcer.textContent = "";
          }
        }, 1000);
      }
    }, delay);
  }

  // Focus management
  trapFocus(container: HTMLElement): () => void {
    if (!this.keyboardConfig.enableFocusTrapping) {
      return () => {};
    }

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Focus first element
    firstElement.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }

  // Get all focusable elements within a container
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      'a[href]:not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
      '[contenteditable="true"]:not([aria-hidden="true"])',
    ];

    return Array.from(
      container.querySelectorAll(focusableSelectors.join(", "))
    ) as HTMLElement[];
  }

  // Keyboard navigation helpers
  handleArrowKeyNavigation(
    e: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    orientation: "horizontal" | "vertical" | "both" = "both"
  ): number {
    if (!this.keyboardConfig.enableArrowKeyNavigation) return currentIndex;

    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        if (orientation === "horizontal" || orientation === "both") {
          newIndex = (currentIndex + 1) % elements.length;
          e.preventDefault();
        }
        break;
      case "ArrowLeft":
        if (orientation === "horizontal" || orientation === "both") {
          newIndex =
            currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
          e.preventDefault();
        }
        break;
      case "ArrowDown":
        if (orientation === "vertical" || orientation === "both") {
          newIndex = (currentIndex + 1) % elements.length;
          e.preventDefault();
        }
        break;
      case "ArrowUp":
        if (orientation === "vertical" || orientation === "both") {
          newIndex =
            currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
          e.preventDefault();
        }
        break;
      case "Home":
        newIndex = 0;
        e.preventDefault();
        break;
      case "End":
        newIndex = elements.length - 1;
        e.preventDefault();
        break;
    }

    if (newIndex !== currentIndex && elements[newIndex]) {
      elements[newIndex].focus();
    }

    return newIndex;
  }

  // Skip link functionality
  createSkipLink(targetId: string, label: string): HTMLElement {
    const skipLink = document.createElement("a");
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = "skip-link";
    skipLink.style.position = "absolute";
    skipLink.style.left = "-10000px";
    skipLink.style.top = "auto";
    skipLink.style.width = "1px";
    skipLink.style.height = "1px";
    skipLink.style.overflow = "hidden";

    skipLink.addEventListener("focus", () => {
      skipLink.style.left = "6px";
      skipLink.style.top = "7px";
      skipLink.style.width = "auto";
      skipLink.style.height = "auto";
      skipLink.style.padding = "8px";
      skipLink.style.background = "#000";
      skipLink.style.color = "#fff";
      skipLink.style.textDecoration = "none";
      skipLink.style.borderRadius = "3px";
      skipLink.style.zIndex = "1000";
    });

    skipLink.addEventListener("blur", () => {
      skipLink.style.left = "-10000px";
      skipLink.style.top = "auto";
      skipLink.style.width = "1px";
      skipLink.style.height = "1px";
      skipLink.style.padding = "0";
    });

    return skipLink;
  }

  // ARIA helpers
  setAriaLabel(element: HTMLElement, label: string): void {
    element.setAttribute("aria-label", label);
  }

  setAriaDescribedBy(element: HTMLElement, describedById: string): void {
    element.setAttribute("aria-describedby", describedById);
  }

  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute("aria-expanded", expanded.toString());
  }

  setAriaPressed(element: HTMLElement, pressed: boolean): void {
    element.setAttribute("aria-pressed", pressed.toString());
  }

  setAriaSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute("aria-selected", selected.toString());
  }

  setAriaLive(
    element: HTMLElement,
    live: "off" | "polite" | "assertive"
  ): void {
    element.setAttribute("aria-live", live);
  }

  // Progress announcement
  announceProgress(fileName: string, progress: number, status: string): void {
    const message = `${fileName}: ${status}${
      progress > 0 ? `, ${Math.round(progress)}% complete` : ""
    }`;

    this.announce({
      message,
      priority: status === "error" ? "assertive" : "polite",
    });
  }

  // File upload announcements
  announceFileUpload(fileCount: number, validFiles: number): void {
    const message =
      validFiles === fileCount
        ? `${fileCount} file${fileCount !== 1 ? "s" : ""} selected successfully`
        : `${validFiles} of ${fileCount} files selected. ${
            fileCount - validFiles
          } files have errors`;

    this.announce({
      message,
      priority: validFiles < fileCount ? "assertive" : "polite",
    });
  }

  // Conversion completion announcement
  announceConversionComplete(completedCount: number, totalCount: number): void {
    const message =
      completedCount === totalCount
        ? `All ${totalCount} files converted successfully`
        : `${completedCount} of ${totalCount} files converted successfully`;

    this.announce({
      message,
      priority: "polite",
    });
  }

  // Configuration
  updateKeyboardConfig(config: Partial<KeyboardNavigationConfigType>): void {
    this.keyboardConfig = { ...this.keyboardConfig, ...config };
  }

  getKeyboardConfig(): KeyboardNavigationConfigType {
    return { ...this.keyboardConfig };
  }

  // Cleanup
  cleanup(): void {
    if (this.announcer && this.announcer.parentNode) {
      this.announcer.parentNode.removeChild(this.announcer);
    }
    this.focusHistory = [];
  }
}

export const accessibilityService = AccessibilityService.getInstance();
export default AccessibilityService;
