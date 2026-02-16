"use client";

import React, { useRef, useEffect, useState } from "react";
import styled from "styled-components";

const ShadowContainer = styled.div<{ $topOpacity: number; $bottomOpacity: number; $color: string }>`
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 40px;
    pointer-events: none;
    z-index: 10;
    transition: opacity 0.2s ease;
  }

  &::before {
    top: 0;
    background: linear-gradient(to bottom,
      ${(props) => props.$color} 0%,
      ${(props) => props.$color}00 100%
    );
    opacity: ${(props) => props.$topOpacity};
  }

  &::after {
    bottom: 0;
    background: linear-gradient(to top,
      ${(props) => props.$color} 0%,
      ${(props) => props.$color}00 100%
    );
    opacity: ${(props) => props.$bottomOpacity};
  }
`;

interface ScrollShadowPropsType {
  children: React.ReactNode;
  selectors?: string[];
  color?: string;
  className?: string;
}

export const ScrollShadow: React.FC<ScrollShadowPropsType> = ({
  children,
  selectors = [],
  color = "#000000",
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find scrollable element
    let scrollElement: Element | null = container;
    for (const selector of selectors) {
      const el = container.querySelector(`.${selector}`);
      if (el) {
        scrollElement = el;
        break;
      }
    }

    const handleScroll = (el: Element) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      setTopOpacity(isAtTop ? 0 : 1);
      setBottomOpacity(isAtBottom ? 0 : 1);
    };

    // Initial check
    if (scrollElement) {
      handleScroll(scrollElement);

      // Add scroll listener
      scrollElement.addEventListener("scroll", () => handleScroll(scrollElement!));

      // Also check on resize
      const resizeObserver = new ResizeObserver(() => handleScroll(scrollElement!));
      resizeObserver.observe(scrollElement);

      return () => {
        scrollElement.removeEventListener("scroll", () => handleScroll(scrollElement!));
        resizeObserver.disconnect();
      };
    }
  }, [selectors]);

  return (
    <ShadowContainer
      ref={containerRef}
      $topOpacity={topOpacity}
      $bottomOpacity={bottomOpacity}
      $color={color}
      className={className}
    >
      {children}
    </ShadowContainer>
  );
};

export default ScrollShadow;
