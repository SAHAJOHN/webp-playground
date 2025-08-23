// Custom hook for accessibility features and keyboard navigation

import { useEffect, useRef, useState, useCallback } from "react";
import {
  accessibilityService,
  type AccessibilityModeType,
  type KeyboardNavigationConfigType,
  type ScreenReaderAnnouncementType,
} from "@/lib/services";

export type UseAccessibilityOptionsType = {
  enableFocusTrapping?: boolean;
  enableArrowKeyNavigation?: boolean;
  announceChanges?: boolean;
  skipLinkTarget?: string;
  skipLinkLabel?: string;
};

export type UseAccessibilityReturnType = {
  accessibilityMode: AccessibilityModeType;
  setAccessibilityMode: (mode: AccessibilityModeType) => void;
  announce: (announcement: ScreenReaderAnnouncementType) => void;
  trapFocus: (container: HTMLElement) => () => void;
  handleKeyboardNavigation: (
    e: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    orientation?: "horizontal" | "vertical" | "both"
  ) => number;
  createSkipLink: (targetId: string, label: string) => HTMLElement;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  focusRef: React.RefObject<HTMLElement>;
  keyboardConfig: KeyboardNavigationConfigType;
  updateKeyboardConfig: (config: Partial<KeyboardNavigationConfigType>) => void;
};

export const useAccessibility = (
  options: UseAccessibilityOptionsType = {}
): UseAccessibilityReturnType => {
  const {
    enableFocusTrapping = true,
    enableArrowKeyNavigation = true,
    announceChanges = true,
    skipLinkTarget,
    skipLinkLabel,
  } = options;

  const [accessibilityMode, setAccessibilityModeState] =
    useState<AccessibilityModeType>("normal");
  const [keyboardConfig, setKeyboardConfig] =
    useState<KeyboardNavigationConfigType>(
      accessibilityService.getKeyboardConfig()
    );

  const focusRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLElement | null>(null);

  // Initialize accessibility service configuration
  useEffect(() => {
    accessibilityService.updateKeyboardConfig({
      enableFocusTrapping,
      enableArrowKeyNavigation,
      announceChanges,
      enableSkipLinks: !!skipLinkTarget,
    });

    setAccessibilityModeState(accessibilityService.getAccessibilityMode());
  }, [
    enableFocusTrapping,
    enableArrowKeyNavigation,
    announceChanges,
    skipLinkTarget,
  ]);

  // Create skip link if target is provided
  useEffect(() => {
    if (skipLinkTarget && skipLinkLabel && !skipLinkRef.current) {
      skipLinkRef.current = accessibilityService.createSkipLink(
        skipLinkTarget,
        skipLinkLabel
      );
      document.body.insertBefore(skipLinkRef.current, document.body.firstChild);
    }

    return () => {
      if (skipLinkRef.current && skipLinkRef.current.parentNode) {
        skipLinkRef.current.parentNode.removeChild(skipLinkRef.current);
        skipLinkRef.current = null;
      }
    };
  }, [skipLinkTarget, skipLinkLabel]);

  // Set accessibility mode
  const setAccessibilityMode = useCallback((mode: AccessibilityModeType) => {
    accessibilityService.setAccessibilityMode(mode);
    setAccessibilityModeState(mode);
  }, []);

  // Announce to screen readers
  const announce = useCallback((announcement: ScreenReaderAnnouncementType) => {
    accessibilityService.announce(announcement);
  }, []);

  // Trap focus within container
  const trapFocus = useCallback((container: HTMLElement) => {
    return accessibilityService.trapFocus(container);
  }, []);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback(
    (
      e: KeyboardEvent,
      elements: HTMLElement[],
      currentIndex: number,
      orientation: "horizontal" | "vertical" | "both" = "both"
    ) => {
      return accessibilityService.handleArrowKeyNavigation(
        e,
        elements,
        currentIndex,
        orientation
      );
    },
    []
  );

  // Create skip link
  const createSkipLink = useCallback((targetId: string, label: string) => {
    return accessibilityService.createSkipLink(targetId, label);
  }, []);

  // Update keyboard configuration
  const updateKeyboardConfig = useCallback(
    (config: Partial<KeyboardNavigationConfigType>) => {
      accessibilityService.updateKeyboardConfig(config);
      setKeyboardConfig(accessibilityService.getKeyboardConfig());
    },
    []
  );

  // Computed accessibility states
  const isHighContrast = accessibilityMode === "high-contrast";
  const isReducedMotion = accessibilityMode === "reduced-motion";

  return {
    accessibilityMode,
    setAccessibilityMode,
    announce,
    trapFocus,
    handleKeyboardNavigation,
    createSkipLink,
    isHighContrast,
    isReducedMotion,
    focusRef,
    keyboardConfig,
    updateKeyboardConfig,
  };
};

// Hook for keyboard navigation within a specific container
export const useKeyboardNavigation = (
  elements: HTMLElement[],
  orientation: "horizontal" | "vertical" | "both" = "both",
  initialIndex = 0
) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { handleKeyboardNavigation } = useAccessibility();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const newIndex = handleKeyboardNavigation(
        e,
        elements,
        currentIndex,
        orientation
      );
      setCurrentIndex(newIndex);
    },
    [elements, currentIndex, orientation, handleKeyboardNavigation]
  );

  useEffect(() => {
    setCurrentIndex(Math.min(initialIndex, elements.length - 1));
  }, [elements.length, initialIndex]);

  return {
    currentIndex,
    setCurrentIndex,
    onKeyDown,
  };
};

// Hook for focus management
export const useFocusManagement = (autoFocus = false) => {
  const focusRef = useRef<HTMLElement>(null);
  const { trapFocus } = useAccessibility();

  const focusElement = useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const trapFocusInContainer = useCallback(() => {
    if (focusRef.current) {
      return trapFocus(focusRef.current);
    }
    return () => {};
  }, [trapFocus]);

  useEffect(() => {
    if (autoFocus) {
      focusElement();
    }
  }, [autoFocus, focusElement]);

  return {
    focusRef,
    focusElement,
    trapFocusInContainer,
  };
};

export default useAccessibility;
