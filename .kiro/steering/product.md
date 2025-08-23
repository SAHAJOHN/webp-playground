# Product Overview

webp-playground is an experimental Next.js application for lightweight client-side file conversion utilities, with a focus on WebP format conversion.

## Key Characteristics

- **Client-side processing** - No server uploads required for privacy and speed
- **Next.js App Router** - Modern React framework with server components
- **TypeScript** - Type-safe development experience
- **Responsive design** - Tailwind CSS for mobile-first UI
- **Experimental/playground** nature allows for rapid prototyping
- **WebP focus** but extensible to other formats

## Target Use Cases

- Quick file format conversion in the browser
- Testing WebP conversion capabilities and quality settings
- Educational tool for understanding file format conversion
- Batch conversion of multiple files
- Comparison of original vs converted file sizes

## User Experience Goals

- **Drag & drop** file upload interface
- **Real-time preview** of conversion results
- **Download options** for converted files
- **Conversion settings** (quality, compression options)
- **Progress indicators** for large file processing
- **File size comparison** before/after conversion

## Technical Goals

- Leverage **Web Workers** for non-blocking conversion
- Use **Canvas API** or **WebAssembly** for image processing
- Implement **progressive enhancement** for browser compatibility
- Maintain **client-side only** approach for privacy
- Optimize for **performance** with large files
