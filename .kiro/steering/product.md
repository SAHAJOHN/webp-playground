# Product Features

## Current Capabilities

**webp-playground** is a Next.js image conversion tool with dual processing modes and comprehensive format optimization.

### Supported Formats
- **JPEG**: Quality, progressive, chroma subsampling, MozJPEG
- **PNG**: Compression levels, interlacing, palette quantization, dithering  
- **WebP**: Lossy/lossless modes, near-lossless, optimization presets, alpha quality
- **AVIF**: Lossy/lossless modes, encoding speed, compression effort

### Processing Modes
- **Client-side**: Canvas API, Web Workers, privacy-focused
- **Server-side**: Sharp/libvips, advanced compression, 10-40% better results
- **Auto mode selection**: Intelligent switching based on format and file size

### Key Features
- Drag & drop file upload interface
- Real-time conversion with progress indicators  
- Batch processing with zip downloads
- Format-specific settings panels
- Before/after file size comparison
- Manual or automatic processing mode selection

### Advanced Compression
- **Near-lossless WebP**: 80% quality produces visually identical images, 20% smaller files
- **MozJPEG**: 10-15% better JPEG compression (server-side)
- **Smart defaults**: Automatic optimization based on format and content type
- **Memory management**: Chunked processing for large files

### Auto Mode Selection Logic
- WebP lossless: Always server (better compression)
- AVIF: Always server (no browser support)
- JPEG Q≥80: Server (MozJPEG benefits)
- PNG: Always server (better algorithms)
- Files >3MB: Server (performance)

### User Experience
- Professional UI with Lucide React icons
- Responsive design with Tailwind CSS
- Error boundaries and graceful fallbacks
- Accessibility features throughout
- Clear visual feedback for processing mode