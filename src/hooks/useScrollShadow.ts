import * as React from 'react';

const DEFAULT_SELECTORS = [
  '[data-dialog-scroll]',
  '.dialog-body',
  '[data-scrollable]',
];

interface UseScrollShadowOptions {
  selectors?: string[];
  enabled?: boolean;
  dependencies?: React.DependencyList;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
}

export interface ScrollShadowState {
  hasTopShadow: boolean;
  hasBottomShadow: boolean;
  scrollContainer: HTMLElement | null;
  resolveScrollContainer: () => HTMLElement | null;
  updateShadows: () => void;
}

export function useScrollShadow(
  rootRef: React.RefObject<HTMLElement | null>,
  {
    selectors = DEFAULT_SELECTORS,
    enabled = true,
    dependencies = [],
    onScroll,
  }: UseScrollShadowOptions = {},
): ScrollShadowState {
  const selectorsRef = React.useRef(selectors);

  React.useEffect(() => {
    selectorsRef.current = selectors;
  }, [selectors]);

  const [scrollContainer, setScrollContainer] =
    React.useState<HTMLElement | null>(null);
  const [hasTopShadow, setHasTopShadow] = React.useState(false);
  const [hasBottomShadow, setHasBottomShadow] = React.useState(false);

  const resolveScrollContainer = React.useCallback(() => {
    if (!enabled) return null;
    const root = rootRef.current;
    if (!root) return null;

    const resolved = selectorsRef.current
      .map((selector) => root.querySelector<HTMLElement>(selector))
      .find((el): el is HTMLElement => Boolean(el));

    const next = resolved ?? root;
    if (scrollContainer !== next) {
      setScrollContainer(next);
    }

    return next;
  }, [enabled, rootRef, scrollContainer]);

  const updateShadows = React.useCallback(() => {
    if (!enabled) return;
    const el = scrollContainer ?? rootRef.current;
    // Check if element exists and is connected to DOM
    if (!el || !el.isConnected) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    setHasTopShadow(!atTop);
    setHasBottomShadow(!atBottom);
  }, [enabled, rootRef, scrollContainer]);

  React.useEffect(() => {
    if (!enabled) return;

    const handleResize = () => updateShadows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [enabled, updateShadows]);

  React.useEffect(() => {
    if (!enabled || typeof ResizeObserver === 'undefined') {
      return;
    }

    const el = scrollContainer ?? rootRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      // Check if element is still connected before updating
      const currentEl = scrollContainer ?? rootRef.current;
      if (currentEl && currentEl.isConnected) {
        updateShadows();
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [enabled, scrollContainer, rootRef, updateShadows]);

  React.useEffect(() => {
    if (!enabled || typeof MutationObserver === 'undefined') {
      return;
    }

    const el = scrollContainer ?? rootRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const observer = new MutationObserver(() => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        // Check if element still exists in DOM before updating
        const currentEl = scrollContainer ?? rootRef.current;
        if (currentEl && currentEl.isConnected) {
          updateShadows();
        }
      });
    });

    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      observer.disconnect();
    };
  }, [enabled, scrollContainer, rootRef, updateShadows]);

  React.useEffect(() => {
    if (!enabled) return;

    const el = scrollContainer ?? rootRef.current;
    if (!el) return;

    const handleScroll = (event: Event) => {
      // Check if element is still connected before updating
      const currentEl = event.currentTarget as HTMLElement;
      if (!currentEl || !currentEl.isConnected) return;

      updateShadows();
      if (typeof onScroll === 'function') {
        onScroll(event as unknown as React.UIEvent<HTMLElement>);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      // Check if element still exists before removing listener
      if (el && el.isConnected) {
        el.removeEventListener('scroll', handleScroll);
      }
    };
  }, [enabled, onScroll, rootRef, scrollContainer, updateShadows]);

  React.useEffect(() => {
    if (!enabled) return;

    const timer = window.setTimeout(() => {
      resolveScrollContainer();
      updateShadows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [enabled, resolveScrollContainer, updateShadows, dependencies]);

  React.useEffect(() => {
    if (!enabled) return;
    resolveScrollContainer();
    updateShadows();
  }, [enabled, resolveScrollContainer, updateShadows, scrollContainer]);

  return {
    hasTopShadow,
    hasBottomShadow,
    scrollContainer,
    resolveScrollContainer,
    updateShadows,
  };
}

export const SCROLL_SHADOW_DEFAULT_SELECTORS = DEFAULT_SELECTORS;
