# CLAUDE.md - AI Assistant Guide for webp-playground

## Project Overview

**webp-playground** is an advanced Next.js image conversion tool with dual processing modes (client/server) supporting JPEG, PNG, WebP, and AVIF formats with comprehensive compression settings.

### Key Features
- **Dual processing**: Client-side (privacy) or server-side (performance) 
- **Advanced compression**: Near-lossless WebP, MozJPEG, format-specific optimizations
- **Smart auto-selection**: Intelligent mode switching based on format and file size
- **Professional UI**: Drag & drop, real-time preview, batch downloads

### Core Architecture
- **Next.js 15** with App Router and API routes
- **Sharp/libvips** for server-side processing (10-40% better compression)
- **Canvas API + Web Workers** for client-side processing
- **TypeScript** with organized component structure

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

### Import Organization
```typescript
// Use organized imports
import { ImageConversionService, DownloadService } from "@/lib/services";
import { useFileUpload } from "@/hooks/ui"; 
import { FileUpload } from "@/components/ui";
import { ErrorBoundary } from "@/components/feedback";
```

## Project Structure

```
src/
├── app/                 # Next.js App Router + API routes
├── components/          # Organized by purpose
│   ├── conversion/      # ConversionPanel, DownloadManager, PreviewComparison  
│   ├── feedback/        # ErrorBoundary, LoadingStates, ProgressIndicator
│   └── ui/              # FileUpload, basic components
├── hooks/               # Custom React hooks
│   ├── conversion/      # Image conversion logic
│   ├── ui/              # UI interactions  
│   └── utils/           # Error handling
├── lib/                 # Services and utilities
│   ├── services/        # Business logic (image-conversion, server-conversion, download)
│   ├── utils/           # Constants, validation
│   └── components/      # styled-components registry
└── types/               # TypeScript definitions
```

## Format-Specific Implementation

### JPEG Settings
- Quality (1-100), Progressive, Chroma subsampling, MozJPEG (server)

### PNG Settings  
- Compression level (0-9), Interlacing, Palette quantization, Dithering

### WebP Settings
- Lossy/Lossless toggle, Near-lossless (server, 0-100), Optimization presets, Alpha quality

### AVIF Settings
- Lossy/Lossless toggle, Encoding speed (0-10), Compression effort (0-9), Server-only

## Key Services

### Conversion Logic
- **image-conversion-service.ts**: Main orchestration
- **server-conversion-service.ts**: Sharp integration  
- **image-conversion-worker.js**: Client-side Web Worker

### Auto-Selection Logic
```typescript
// Server-side preferred for:
- WebP lossless (libwebp advantage)
- AVIF all modes (no browser support)
- JPEG quality ≥80 (mozjpeg benefits)  
- PNG all modes (better algorithms)
- Files >3MB (memory management)
```

## Development Commands
```bash
yarn dev     # Development server (localhost:3000)
yarn build   # Production build
yarn lint    # ESLint
```

## AI Assistant Guidelines

### Code Quality
1. Maintain TypeScript throughout with proper types
2. Use hooks and functional components exclusively
3. Implement accessibility (ARIA, keyboard navigation)
4. Follow organized folder structure

### Implementation Priorities  
1. **Never create new files** unless absolutely necessary
2. **Always prefer editing** existing files in the codebase
3. **Test both modes**: Verify client and server processing
4. **Performance first**: Consider memory usage and mode selection
5. **Privacy option**: Always maintain client-side capability

### Component Development
1. Use styled-components with `Styled` suffix
2. Use Lucide React icons consistently
3. Wrap with error boundaries where needed
4. Provide clear loading states

This is an experimental playground project with production-ready compression capabilities and clean architecture standards.