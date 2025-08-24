# Technical Implementation

## Current Tech Stack

### Core Framework
- **Next.js 15** with App Router and API routes
- **React 19** with TypeScript
- **Sharp 0.34.3** for server-side image processing
- **Tailwind CSS 4** + styled-components for UI
- **Lucide React** for icons

### Dual Processing Architecture

#### Client-Side (Privacy Mode)
- **Canvas API** for image processing
- **Web Workers** for non-blocking conversion
- **File/Blob APIs** for local file handling
- **JSZip** for batch downloads

#### Server-Side (Performance Mode)
- **Sharp/libvips** for advanced compression
- **API route** at `/api/convert` 
- **libwebp** for near-lossless WebP (80% quality = visually identical, 20% smaller)
- **mozjpeg** for optimized JPEG (10-15% better compression)
- **libavif** for AVIF format support

### Key Services

#### Conversion Services
- **image-conversion-service.ts**: Main conversion orchestration
- **server-conversion-service.ts**: Sharp integration with format-specific optimizations
- **image-conversion-worker.js**: Client-side Web Worker processing

#### Supporting Services  
- **download-service.ts**: Batch zip creation with JSZip
- **memory-management-service.ts**: Resource cleanup and optimization
- **error-handling-service.ts**: Graceful error recovery

### Processing Mode Logic

#### Auto-Selection Rules
```typescript
// Server-side preferred for:
- WebP lossless (libwebp compression advantage)
- AVIF all modes (no browser support)  
- JPEG quality ≥80 (mozjpeg benefits)
- PNG all modes (better algorithms)
- Files >3MB (memory management)

// Client-side fallback for privacy or server failure
```

### Format-Specific Optimizations

#### JPEG Settings
- Quality slider (1-100)
- Progressive encoding toggle  
- Chroma subsampling (4:4:4, 4:2:2, 4:2:0, Auto)
- MozJPEG optimization (server-side)

#### PNG Settings  
- Compression level (0-9)
- Adam7 interlacing
- Palette quantization (2-256 colors)
- Dithering control

#### WebP Settings
- Lossy/Lossless mode toggle
- Near-lossless slider (server-side, 0-100)
- Optimization presets (photo, drawing, icon, text)  
- Alpha channel quality (0-100)

#### AVIF Settings
- Lossy/Lossless mode toggle
- Encoding speed (0-10)
- Compression effort (0-9)
- Server-only implementation

### Development Tools
- **Yarn** package management
- **Turbopack** for fast builds
- **ESLint 9** with Next.js configuration  
- **TypeScript 5** with strict mode

### Performance Optimizations
- Web Workers prevent UI blocking
- Chunked processing for large files
- Memory cleanup after conversions
- Progressive enhancement with fallbacks
- Smart caching of conversion results