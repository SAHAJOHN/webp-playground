"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import styled, { css, keyframes } from "styled-components";
import { theme } from "@/styles/theme";

const contentOpen = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`;

const contentClose = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.96); }
`;

const SelectTriggerStyled = styled(SelectPrimitive.Trigger)<{
  $size: "sm" | "default";
}>`
  min-height: ${({ $size }) => ($size === "sm" ? "40px" : "44px")};
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing[2]};
  border: 1px solid ${theme.colors.control.border};
  border-radius: ${theme.radii.lg};
  background: ${theme.colors.control.surface};
  color: ${theme.colors.control.text};
  padding: 0 ${theme.spacing[3]};
  font: ${theme.fontSizes.sm} ${theme.fonts.sans};
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  transition: border-color ${theme.transitions.fast},
    background ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};

  > [data-slot="select-value"] {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
    color: ${theme.colors.control.textMuted};
    pointer-events: none;
  }

  &[data-placeholder] {
    color: ${theme.colors.control.textMuted};
  }

  &:hover:not(:disabled) {
    border-color: ${theme.colors.control.borderStrong};
    background: ${theme.colors.control.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.control.accent};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${theme.colors.control.focusRing};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const SelectContentStyled = styled(SelectPrimitive.Content)<{
  $position: "item-aligned" | "popper";
}>`
  position: relative;
  z-index: 50;
  max-height: var(--radix-select-content-available-height);
  overflow: hidden;
  border: 1px solid ${theme.colors.control.borderStrong};
  border-radius: ${theme.radii.lg};
  background: ${theme.colors.control.popup};
  color: ${theme.colors.control.text};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  transform-origin: var(--radix-select-content-transform-origin);

  ${({ $position }) =>
    $position === "popper" &&
    css`
      width: var(--radix-select-trigger-width);
    `}

  &[data-state="open"] {
    animation: ${contentOpen} ${theme.transitions.normal};
  }

  &[data-state="closed"] {
    animation: ${contentClose} ${theme.transitions.fast};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const SelectViewportStyled = styled(SelectPrimitive.Viewport)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]};
`;

const SelectLabelStyled = styled(SelectPrimitive.Label)`
  padding: 6px ${theme.spacing[2]};
  color: ${theme.colors.control.textMuted};
  font-size: ${theme.fontSizes.xs};
`;

const SelectItemStyled = styled(SelectPrimitive.Item)`
  position: relative;
  min-height: 36px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  border-radius: ${theme.radii.sm};
  padding: 7px 32px 7px ${theme.spacing[2]};
  color: ${theme.colors.control.text};
  font-size: ${theme.fontSizes.sm};
  line-height: 1.35;
  cursor: default;
  outline: none;
  user-select: none;
  transition: color ${theme.transitions.fast},
    background ${theme.transitions.fast};

  &[data-highlighted] {
    background: ${theme.colors.control.surfaceHover};
  }

  &[data-state="checked"] {
    background: ${theme.colors.control.surfaceSelected};
  }

  &[data-disabled] {
    pointer-events: none;
    opacity: 0.45;
  }

  svg {
    width: 16px;
    height: 16px;
    color: ${theme.colors.control.text};
  }
`;

const ItemIndicatorStyled = styled.span`
  position: absolute;
  right: ${theme.spacing[2]};
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
`;

const SelectSeparatorStyled = styled(SelectPrimitive.Separator)`
  height: 1px;
  margin: ${theme.spacing[1]} -${theme.spacing[1]};
  background: ${theme.colors.control.border};
`;

const ScrollButtonStyled = styled.div`
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.control.textMuted};

  svg {
    width: 16px;
    height: 16px;
  }
`;

function Select(
  props: React.ComponentProps<typeof SelectPrimitive.Root>
) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>
) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectTriggerStyled
      data-slot="select-trigger"
      data-size={size}
      $size={size}
      className={className}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectTriggerStyled>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectContentStyled
        data-slot="select-content"
        $position={position}
        position={position}
        sideOffset={sideOffset}
        className={className}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectViewportStyled>{children}</SelectViewportStyled>
        <SelectScrollDownButton />
      </SelectContentStyled>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectLabelStyled
      data-slot="select-label"
      className={className}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectItemStyled
      data-slot="select-item"
      className={className}
      {...props}
    >
      <ItemIndicatorStyled>
        <SelectPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </ItemIndicatorStyled>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectItemStyled>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectSeparatorStyled
      data-slot="select-separator"
      className={className}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton asChild {...props}>
      <ScrollButtonStyled
        data-slot="select-scroll-up-button"
        className={className}
      >
        <ChevronUpIcon aria-hidden="true" />
      </ScrollButtonStyled>
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton asChild {...props}>
      <ScrollButtonStyled
        data-slot="select-scroll-down-button"
        className={className}
      >
        <ChevronDownIcon aria-hidden="true" />
      </ScrollButtonStyled>
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
