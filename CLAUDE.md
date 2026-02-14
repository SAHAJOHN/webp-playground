# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**webp-playground** is a professional Next.js image converter using server-side Sharp for superior compression. The key architectural decision is that all image processing happens server-side via API routes using Sharp/libvips, providing 10-20% better compression than browser-based Canvas API.

## Development Commands

```bash
yarn dev      # Development server with Turbopack
yarn build    # Production build with Turbopack
yarn start    # Production server
yarn lint     # Run ESLint
```

No test framework is configured.

## Architecture

### Server-Side Conversion Flow

The conversion pipeline follows this flow:

1. **Upload** (`src/hooks/ui/useFileUpload.ts`): File validation and Blob URL creation
2. **Client Service** (`src/lib/services/server-conversion-service.ts`): Prepares FormData, calls `/api/convert`
3. **API Route** (`src/app/api/convert/route.ts`): Sharp processing with format-specific options
4. **Headers** return metadata (X-Original-Size, X-Converted-Size, X-Compression-Ratio)
5. **Download** (`src/lib/services/download-service.ts`): Single files or batch ZIP via JSZip

### Key Architectural Patterns

**Server-Only Processing**: The `shouldUseServerConversion()` function in `server-conversion-service.ts` always returns `true` because Sharp provides superior compression algorithms (libwebp, mozjpeg, libpng, libavif) that are not available in browsers.

**Memory Management**: The `memory-management-service.ts` tracks and revokes Blob URLs to prevent memory leaks during batch processing.

**Format-Specific Sharp Options**:
- WebP: effort clamped to 0-6 (Sharp limitation), supports near-lossless mode
- JPEG: mozjpeg encoder, progressive encoding, chroma subsampling
- PNG: palette quantization with dithering, Adam7 interlacing
- AVIF: effort 0-9, lossless/lossy toggle

### File Naming Conventions

- **Components**: PascalCase with `Styled` suffix for styled-components (e.g., `ButtonStyled`)
- **Types**: PascalCase with `Type` suffix (e.g., `ConversionSettingsType`)
- **Utilities**: camelCase (e.g., `fileValidation.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useImageConversion.ts`)

### Type Patterns

Use `type` declarations (not `interface`) with strict suffixes:

```typescript
type ConversionSettingsType = {
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality: number;
  lossless?: boolean;
};
```

### Styled Components Pattern

```typescript
const ButtonStyled = styled.button<ButtonPropsType>`
  .button-text {
    color: ${props => props.variant === 'primary' ? 'white' : 'black'};
  }
`;
```

## Technology Stack

- Next.js 15.5.0 with App Router and Turbopack
- React 19.1.0 with TypeScript 5
- Sharp 0.34.3 for image processing
- Tailwind CSS 4 + styled-components
- Lucide React for icons
- JSZip for batch downloads

## Project Structure

```
src/
├── app/
│   ├── api/convert/route.ts    # Sharp processing endpoint
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Main conversion UI
├── components/
│   ├── conversion/             # ConversionPanel, DownloadManager, PreviewComparison
│   ├── feedback/               # ErrorBoundary, LoadingStates, NotificationSystem
│   └── ui/                     # FileUpload, select (Radix-based)
├── hooks/
│   ├── conversion/             # useSimpleImageConversion, useImageConversion
│   └── ui/                     # useFileUpload, useAccessibility
├── lib/services/               # Business logic layer
│   ├── server-conversion-service.ts   # API client for /api/convert
│   ├── download-service.ts            # ZIP download handling
│   └── memory-management-service.ts   # Blob URL lifecycle
└── types/
    └── conversion.ts           # Core types (ConversionSettingsType, etc.)
```

## Important Implementation Notes

- **Max file size**: 50MB limit in API route (`MAX_FILE_SIZE`)
- **WebP effort**: UI allows 0-9 but Sharp only supports 0-6 (clamped in API)
- **Progress tracking**: Each conversion job reports progress via callbacks
- **Accessibility**: High contrast mode and keyboard navigation in `accessibility-service.ts`
- **Error handling**: Error boundaries + notification system for user feedback
