"use client";

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSpring, motion, useMotionValue } from "motion/react";
import styled from "styled-components";

type ScrollProgressPropsType = {
  children: React.ReactNode;
  selectors?: string[];
  color?: string;
  className?: string;
};

export const ScrollProgress: React.FC<ScrollProgressPropsType> = ({
  children,
  selectors = [],
  color = "#3282B8",
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);

  // Create motion value for manual scroll tracking
  const scrollProgress = useMotionValue(0);
  const scaleY = useSpring(scrollProgress, {
    stiffness: 220,
    damping: 14,
    mass: 0.6,
    restDelta: 0.0005,
  });

  // Find scrollable element and setup scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find scrollable element using selectors
    for (const selector of selectors) {
      const el = container.querySelector(`.${selector}`) as HTMLElement;
      if (el) {
        scrollElementRef.current = el;
        setIsReady(true);
        break;
      }
    }

    const scrollEl = scrollElementRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      scrollProgress.set(progress);
    };

    // Initial calculation
    handleScroll();

    // Add scroll listener
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    // Observe resize
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [selectors, scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const panelContent = container.closest(
      '[data-scroll-render-target="true"]'
    ) as HTMLElement | null;

    setOverlayHost(panelContent);
  }, []);

  return (
    <ProgressContainerStyled ref={containerRef} className={className}>
      {children}
      {isReady &&
        overlayHost &&
        createPortal(
          <ProgressOverlayStyled>
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
