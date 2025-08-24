# Product Features

## Current State

**webp-playground** is a professional Next.js image converter using server-side Sharp for superior compression.

### Supported Formats
- **JPEG**: Progressive (default on), chroma subsampling, MozJPEG encoder
- **PNG**: Interlacing/Adam7 (default on), palette quantization, dithering  
- **WebP**: Lossy/lossless, near-lossless (0-100%), presets, alpha quality
- **AVIF**: Lossy/lossless, compression effort (0-9)

### Processing Architecture
- **Server-only processing**: Sharp/libvips for all conversions
- **No client-side fallback**: Ensures consistent, best compression
- **API route**: `/api/convert` handles all image processing

### Compression Benefits
- **WebP**: libwebp 10-20% better than Canvas API
- **JPEG**: MozJPEG 10-15% smaller files
- **PNG**: Maximum compression with libpng
- **AVIF**: Only available server-side

### Key Features
- Drag & drop multi-file upload
- Real-time progress tracking
- Batch processing with ZIP downloads
- Format-specific optimization panels
- Before/after size comparison
- Memory management via blob URL cleanup

### Default Settings
- **Progressive JPEG**: Enabled by default
- **PNG Interlacing**: Enabled by default  
- **WebP Quality**: 80 (lossy), 100 (lossless)
- **AVIF Effort**: 4 (balanced speed/quality)

### User Experience
- Clean UI with Lucide React icons
- Responsive design with Tailwind CSS
- Error boundaries for stability
- Accessibility hooks and ARIA support
- Visual feedback during processing