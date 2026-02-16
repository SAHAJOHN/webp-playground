import * as React from 'react';
import styled, { css } from 'styled-components';
import {
  SCROLL_SHADOW_DEFAULT_SELECTORS,
  useScrollShadow,
} from '@/hooks/useScrollShadow';
import {cn} from "@/lib/utils";

const Overlay = styled.div<{
  $placement: 'top' | 'bottom';
  $visible: boolean;
  $height: number;
  $offset: number;
  $color: string;
}>`
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
  height: ${({ $height }) => $height}px;
  ${({ $placement, $offset }) =>
    $placement === 'top'
      ? css`
          top: ${$offset}px;
        `
      : css`
          bottom: ${$offset}px;
        `}
  background: ${({ $placement, $color }) =>
    $placement === 'top'
      ? `linear-gradient(to top, transparent 0%, ${$color} 100%)`
      : `linear-gradient(to bottom, transparent 0%, ${$color} 100%)`};
  pointer-events: none;
  z-index: 10;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.3s ease-out;
`;
export interface ScrollShadowProps extends React.HTMLAttributes<HTMLDivElement> {
  topOffset?: number;
  bottomOffset?: number;
  shadowHeight?: number;
  shadowColor?: string;
  selectors?: string[];
  disabled?: boolean;
  dependencies?: React.DependencyList;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
}

export const ScrollShadow = React.forwardRef<HTMLDivElement, ScrollShadowProps>(
  (
    {
      className,
      children,
      topOffset = 0,
      bottomOffset = 0,
      shadowHeight = 24,
      shadowColor = 'rgba(255, 255, 255, 1)',
      selectors = SCROLL_SHADOW_DEFAULT_SELECTORS,
      disabled = false,
      dependencies = [],
      onScroll,
      ...props
    },
    forwardedRef,
  ) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (
            forwardedRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = node;
        }
      },
      [forwardedRef],
    );

    const handleScroll = React.useCallback(
      (event: React.UIEvent<HTMLElement>) => {
        if (onScroll) {
          onScroll(event as unknown as React.UIEvent<HTMLDivElement>);
        }
      },
      [onScroll],
    );

    const { hasTopShadow, hasBottomShadow } = useScrollShadow(rootRef, {
      enabled: !disabled,
      selectors,
      dependencies,
      onScroll: handleScroll,
    });

    return (
      <div ref={setRefs} className={cn('relative', className)} {...props}>
        {!disabled && (
          <>
            <Overlay
              $placement="top"
              $visible={hasTopShadow}
              $height={shadowHeight}
              $offset={topOffset}
              $color={shadowColor}
              data-scroll-shadow-top=""
            />
            <Overlay
              $placement="bottom"
              $visible={hasBottomShadow}
              $height={shadowHeight}
              $offset={bottomOffset}
              $color={shadowColor}
              data-scroll-shadow-bottom=""
            />
          </>
        )}
        {children}
      </div>
    );
  },
);

ScrollShadow.displayName = 'ScrollShadow';
