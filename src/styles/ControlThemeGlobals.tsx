"use client";

import { createGlobalStyle } from "styled-components";
import { theme } from "@/styles/theme";

const ControlThemeGlobalsStyled = createGlobalStyle`
  :root {
    --control-accent: ${theme.colors.control.accent};
    --control-accent-hover: ${theme.colors.control.accentHover};
    --control-surface: ${theme.colors.control.surface};
    --control-surface-hover: ${theme.colors.control.surfaceHover};
    --control-surface-selected: ${theme.colors.control.surfaceSelected};
    --control-popup: ${theme.colors.control.popup};
    --control-border: ${theme.colors.control.border};
    --control-border-strong: ${theme.colors.control.borderStrong};
    --control-text: ${theme.colors.control.text};
    --control-text-muted: ${theme.colors.control.textMuted};
    --control-focus-ring: ${theme.colors.control.focusRing};
  }
`;

export const ControlThemeGlobals = () => <ControlThemeGlobalsStyled />;
