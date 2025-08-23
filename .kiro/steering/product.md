# Product Overview

webp-playground is an experimental Next.js application for lightweight client-side file conversion utilities, supporting multiple image formats (JPEG, PNG, GIF, WebP, AVIF, SVG, ICO) with a professional UI built using styled-components and Lucide React icons.

## Key Characteristics

- **Client-side processing** - No server uploads required for privacy and speed
- **Next.js App Router** - Modern React framework with server components
- **TypeScript** - Type-safe development experience
- **Responsive design** - Tailwind CSS and styled-components for mobile-first UI
- **Professional iconography** - Lucide React icons throughout the interface
- **Multi-format support** - JPEG, PNG, GIF, WebP, AVIF, SVG, and ICO conversion
- **Clean architecture** - Organized components, hooks, and services structure
- **Performance optimized** - Web Workers, memory management, and progressive enhancement
- **Experimental/playground** nature allows for rapid prototyping

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

- ✅ **Web Workers** implemented for non-blocking conversion
- ✅ **Canvas API** used for image processing with fallbacks
- ✅ **Progressive enhancement** implemented for browser compatibility
- ✅ **Client-side only** approach maintained for privacy
- ✅ **Performance optimization** with memory management and chunked processing
- ✅ **Clean architecture** with organized services, hooks, and components

## Development Standards

### UI Components

- Use **styled-components** with `Styled` suffix for component styling
- Implement **Lucide React** icons for consistent visual language
- Use TypeScript generics and nested class styling: `styled.button<PropsType>\`.class { }\``
- Follow **TypeScript type** declarations with `Type` suffix (no interfaces)

### Code Quality

- Maintain **type safety** with TypeScript throughout
- Use **modern React patterns** with hooks and functional components
- Implement **accessibility standards** for inclusive design
- Follow **Next.js App Router** conventions for optimal performance
- Use **organized architecture** with logical separation of concerns:
  - `src/components/` organized by purpose (conversion, feedback, ui)
  - `src/hooks/` organized by functionality (conversion, ui, utils)
  - `src/lib/` organized by type (services, utils, components)
- **Clean imports** using organized folder structure and index files
