"use client";

import React from "react";
import styled, { css } from "styled-components";
import { theme } from "@/styles/theme";

export type ButtonVariantType = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSizeType = "sm" | "md";

export type ButtonPropsType = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariantType;
  size?: ButtonSizeType;
  isLoading?: boolean;
};

export type ButtonLinkPropsType = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Exclude<ButtonVariantType, "danger">;
  size?: ButtonSizeType;
};

type InteractiveStylePropsType = {
  $variant: ButtonVariantType;
  $size: ButtonSizeType;
};

const variantStyles = (variant: ButtonVariantType) => {
  switch (variant) {
    case "secondary":
      return css`
        border-color: ${theme.colors.control.border};
        background: ${theme.colors.control.surface};
        color: ${theme.colors.control.text};

        &:hover:not(:disabled) {
          border-color: ${theme.colors.control.borderStrong};
          background: ${theme.colors.control.surfaceHover};
        }

        &[aria-pressed="true"] {
          border-color: ${theme.colors.control.accent};
          background: ${theme.colors.control.surfaceSelected};
          box-shadow: inset 0 0 0 1px ${theme.colors.control.focusRing};
        }
      `;
    case "ghost":
      return css`
        border-color: transparent;
        background: transparent;
        color: ${theme.colors.control.textMuted};

        &:hover:not(:disabled) {
          background: ${theme.colors.control.surface};
          color: ${theme.colors.control.text};
        }
      `;
    case "danger":
      return css`
        border-color: rgba(239, 68, 68, 0.72);
        background: ${theme.colors.accent.error};
        color: white;

        &:hover:not(:disabled) {
          background: #dc2626;
        }
      `;
    default:
      return css`
        border-color: ${theme.colors.control.accent};
        background: ${theme.colors.control.accent};
        color: ${theme.colors.control.text};

        &:hover:not(:disabled) {
          border-color: ${theme.colors.control.accentHover};
          background: ${theme.colors.control.accentHover};
        }
      `;
  }
};

const interactiveStyles = css<InteractiveStylePropsType>`
  min-height: ${({ $size }) => ($size === "sm" ? "40px" : "44px")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  border: 1px solid transparent;
  border-radius: ${theme.radii.lg};
  padding: 0 ${({ $size }) => ($size === "sm" ? theme.spacing[3] : theme.spacing[5])};
  font: ${({ $size }) =>
    $size === "sm" ? theme.fontSizes.sm : theme.fontSizes.base}
    ${theme.fonts.sans};
  font-weight: ${theme.fontWeights.semibold};
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  transition: border-color ${theme.transitions.fast},
    background ${theme.transitions.fast}, color ${theme.transitions.fast},
    box-shadow ${theme.transitions.fast};

  svg {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    pointer-events: none;
  }

  ${({ $variant }) => variantStyles($variant)}

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

const ButtonStyled = styled.button<InteractiveStylePropsType>`
  ${interactiveStyles}
`;

const ButtonLinkStyled = styled.a<InteractiveStylePropsType>`
  ${interactiveStyles}
`;

export const Button = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  type = "button",
  ...props
}: ButtonPropsType) => (
  <ButtonStyled
    type={type}
    $variant={variant}
    $size={size}
    data-variant={variant}
    data-size={size}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    {...props}
  />
);

export const ButtonLink = ({
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkPropsType) => (
  <ButtonLinkStyled
    $variant={variant}
    $size={size}
    data-variant={variant}
    data-size={size}
    {...props}
  />
);
