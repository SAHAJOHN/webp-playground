// src/styles/theme.ts
// Design tokens for Dark Premium theme (Figma/Linear inspired)

export const theme = {
  colors: {
    // Background layers
    bg: {
      base: '#09090b',
      surface: '#18181b',
      elevated: '#27272a',
      overlay: '#3f3f46',
    },
    // Accent colors
    accent: {
      primary: '#3282b8',
      primaryHover: '#5aa1cf',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    // Shared Blue Ocean interaction colors
    control: {
      accent: '#3282b8',
      accentHover: '#5aa1cf',
      surface: 'rgba(15, 76, 117, 0.30)',
      surfaceHover: 'rgba(15, 76, 117, 0.50)',
      surfaceSelected: 'rgba(50, 130, 184, 0.34)',
      popup: '#0f4c75',
      border: 'rgba(50, 130, 184, 0.34)',
      borderStrong: 'rgba(50, 130, 184, 0.58)',
      text: '#bbe1fa',
      textMuted: 'rgba(187, 225, 250, 0.68)',
      focusRing: 'rgba(50, 130, 184, 0.36)',
    },
    // Text colors
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
      muted: '#71717a',
    },
    // Borders
    border: {
      subtle: 'rgba(255,255,255,0.06)',
      default: 'rgba(255,255,255,0.1)',
      strong: 'rgba(255,255,255,0.2)',
    },
  },
  fonts: {
    sans: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "var(--font-geist-mono), 'SF Mono', 'Monaco', 'Consolas', monospace",
  },
  fontSizes: {
    xs: '12px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '24px',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.2)',
    md: '0 4px 12px rgba(0,0,0,0.25)',
    lg: '0 8px 24px rgba(0,0,0,0.3)',
    xl: '0 16px 48px rgba(0,0,0,0.4)',
  },
  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  transitions: {
    fast: '100ms ease',
    normal: '150ms ease',
    slow: '300ms ease',
  },
} as const;

export type ThemeType = typeof theme;
