"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSpring, motion, useMotionValue } from "motion/react";
import styled from "styled-components";
import { theme } from "@/styles/theme";

type ScrollProgressPropsType = {
  children: React.ReactNode;
  selectors?: string[];
  color?: string;
  className?: string;
};

export const ScrollProgress: React.FC<ScrollProgressPropsType> = ({
  children,
  selectors = [],
  color = theme.colors.control.accent,
  className,
}) => {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const selectorQuery = selectors.map((selector) => `.${selector}`).join(",");

  // Create motion value for manual scroll tracking
  const scrollProgress = useMotionValue(0);
  const scaleY = useSpring(scrollProgress, {
    stiffness: 220,
    damping: 14,
    mass: 0.6,
    restDelta: 0.0005,
  });

  const handleContainerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) {
        setScrollElement(null);
        setOverlayHost(null);
        return;
      }

      setScrollElement(
        selectorQuery
          ? (container.querySelector(selectorQuery) as HTMLElement | null)
          : null
      );
      setOverlayHost(
        container.closest(
          '[data-scroll-render-target="true"]'
        ) as HTMLElement | null
      );
    },
    [selectorQuery, setOverlayHost, setScrollElement]
  );

  // Setup scroll listener after the callback ref locates the target.
  useEffect(() => {
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      scrollProgress.set(progress);
    };

    // Initial calculation
    handleScroll();

    // Add scroll listener
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });

    // Observe resize
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleScroll);
    const observeResizeTargets = () => {
      resizeObserver?.disconnect();
      resizeObserver?.observe(scrollElement);
      Array.from(scrollElement.children).forEach((child) =>
        resizeObserver?.observe(child)
      );
    };
    observeResizeTargets();

    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            observeResizeTargets();
            handleScroll();
          });
    mutationObserver?.observe(scrollElement, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [scrollElement, scrollProgress]);

  return (
    <ProgressContainerStyled ref={handleContainerRef} className={className}>
      {children}
      {scrollElement &&
        overlayHost &&
        createPortal(
          <ProgressOverlayStyled
            data-scroll-progress="true"
            aria-hidden="true"
          >
            <ProgressTrackStyled />
            <ProgressFillStyled
              as={motion.div}
              $color={color}
              style={{ scaleY }}
            />
          </ProgressOverlayStyled>,
          overlayHost
        )}
    </ProgressContainerStyled>
  );
};

const ProgressContainerStyled = styled.div`
  flex: 1;
  min-height: 0;
`;

const ProgressOverlayStyled = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  pointer-events: none;
  z-index: 20;
`;

const ProgressTrackStyled = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.06);
`;

const ProgressFillStyled = styled.div<{ $color: string }>`
  position: absolute;
  right: 0;
  top: 0;
  width: 1px;
  height: 100%;
  background: ${(props) => props.$color};
  box-shadow: 0 0 8px ${(props) => props.$color}99;
  transform-origin: top;
`;

export default ScrollProgress;
