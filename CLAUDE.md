# CLAUDE.md - AI Assistant Guide for webp-playground

## Project Overview

**webp-playground** is a professional Next.js image converter using server-side Sharp for superior compression.

### Key Features
- **Server-only processing**: Sharp/libvips for best compression (10-20% better)
- **Format support**: JPEG, PNG, WebP, AVIF with advanced settings
- **Batch processing**: Multi-file upload with ZIP downloads
- **Real-time preview**: Before/after comparisons

### Core Architecture
- **Next.js 15** with App Router
- **Sharp 0.34.3** for all image processing
- **React 19** with TypeScript 5
- **Tailwind CSS 4** + styled-components

## Development Guidelines

### File Conventions
- PascalCase for components: `FileUpload.tsx`
- camelCase for utilities: `fileUtils.ts`
- Suffix styled components: `ButtonStyled`, `ContainerStyled`
- Suffix types: `UserType`, `ConversionSettingsType`

### Component Patterns
```typescript
// Styled components with TypeScript
const ButtonStyled = styled.button<ButtonPropsType>`
  .button-text {
    color: ${props => props.variant === 'primary' ? 'white' : 'black'};
  }
`;

// Use type declarations (not interface)
type ConversionSettingsType = {
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality: number;
  lossless?: boolean;
};
```

## Project Structure

```
src/
├── app/                 # Next.js App Router + API routes
├── components/          # UI components
│   ├── conversion/      # ConversionPanel, DownloadManager
│   ├── feedback/        # ErrorBoundary, LoadingStates
│   └── ui/              # FileUpload, basic components
├── hooks/               # Custom React hooks
├── lib/                 # Services and utilities
│   ├── services/        # Business logic
│   └── utils/           # Constants, validation
└── types/               # TypeScript definitions
```

## Format-Specific Settings

### JPEG
- Quality (1-100)
- Progressive (default: enabled)
- Chroma subsampling (4:4:4, 4:2:2, 4:2:0, auto)
- MozJPEG encoder (10-15% better)

### PNG
- Compression level (0-9)
- Interlacing/Adam7 (default: enabled)
- Palette quantization (2-256 colors)
- Dithering (0-1)

### WebP
- Lossy/Lossless toggle
- Near-lossless (0-100%, lossless only)
- Presets (default, photo, picture, drawing, icon, text)
- Alpha quality (0-100)
- Effort (0-6, clamped from UI 0-9)

### AVIF
- Lossy/Lossless toggle
- Effort (0-9, controls speed/quality)
- Server-exclusive format

## Key Services

### Active Services
- **image-conversion-service.ts**: Calls server API
- **server-conversion-service.ts**: Sharp integration
- **download-service.ts**: Batch ZIP downloads
- **memory-management-service.ts**: Blob URL cleanup
- **error-handling-service.ts**: Error recovery
- **accessibility-service.ts**: A11y features

## Development Commands
```bash
yarn dev     # Development server
yarn build   # Production build
yarn lint    # ESLint
```

## AI Assistant Guidelines

### Code Quality
1. Maintain TypeScript with proper types
2. Use functional components and hooks
3. Implement accessibility (ARIA, keyboard)
4. Follow existing folder structure

### Implementation Priorities
1. **Never create new files** unless necessary
2. **Always prefer editing** existing files
3. **Test server processing** with Sharp
4. **Performance first**: Memory management
5. **Compression quality**: Use Sharp settings

### Component Development
1. Use styled-components with `Styled` suffix
2. Use Lucide React icons
3. Add error boundaries where needed
4. Provide loading states

This is a production-ready image converter with server-side Sharp for optimal compression.