# Technical Implementation

## Current Tech Stack

### Core Framework
- **Next.js 15** with App Router
- **React 19** with TypeScript 5
- **Sharp 0.34.3** for all image processing
- **Tailwind CSS 4** + styled-components
- **Lucide React** for icons

### Server-Side Processing Only
- **Sharp/libvips** backend
- **API route** at `/api/convert`
- **No Web Workers** (removed)
- **No client-side Canvas API** (removed)

### Format Support
- **libwebp** for WebP (lossless, lossy, near-lossless)
- **mozjpeg** for JPEG (10-15% better compression)
- **libpng** for PNG (maximum compression level 9)
- **libavif** for AVIF (server-exclusive format)

### Key Services

#### Active Services
- **image-conversion-service.ts**: Calls server API
- **server-conversion-service.ts**: Sharp integration
- **download-service.ts**: Batch ZIP with JSZip
- **memory-management-service.ts**: Blob URL cleanup
- **error-handling-service.ts**: Error recovery
- **accessibility-service.ts**: A11y features

#### Removed Services (cleanup done)
- ~~image-conversion-worker-service.ts~~
- ~~chunked-processing-service.ts~~
- ~~webassembly-fallback-service.ts~~
- ~~progressive-enhancement-service.ts~~

### Format-Specific Settings

#### JPEG
- Quality (1-100)
- Progressive (default: enabled)
- Chroma subsampling (4:4:4, 4:2:2, 4:2:0, auto)
- MozJPEG (always enabled)

#### PNG  
- Compression level (0-9)
- Interlacing/Adam7 (default: enabled)
- Palette quantization (2-256 colors)
- Dithering (0-1)

#### WebP
- Lossy/Lossless toggle
- Near-lossless (0-100%, only in lossless mode)
- Presets (default, photo, picture, drawing, icon, text)
- Alpha quality (0-100)
- Effort (0-6, clamped from 0-9 input)

#### AVIF
- Lossy/Lossless toggle
- Effort (0-9, controls speed/quality tradeoff)
- Chroma subsampling (auto based on mode)

### Development Setup
- **Yarn** package manager
- **Turbopack** for fast builds
- **ESLint 9** with Next.js config
- **TypeScript** strict mode

### Performance
- Server processing for all files
- Memory cleanup after conversions
- Progressive enhancement UI
- ~157KB total bundle size