# CLAUDE.md - AI Assistant Guide for webp-playground

This document provides comprehensive guidance for AI assistants working on the webp-playground project. It consolidates project vision, technical architecture, development standards, and implementation guidelines.

## Project Overview & Vision

**webp-playground** is an experimental Next.js application for lightweight client-side file conversion utilities, supporting multiple image formats (JPEG, PNG, GIF, WebP, AVIF, SVG, ICO) with a professional UI built using styled-components and Lucide React icons.

### Key Characteristics

- **Client-side processing** - No server uploads required for privacy and speed
- **Next.js App Router** - Modern React framework with server components
- **TypeScript** - Type-safe development experience
- **Responsive design** - Tailwind CSS and styled-components for mobile-first UI
- **Professional iconography** - Lucide React icons throughout the interface
- **Multi-format support** - JPEG, PNG, GIF, WebP, AVIF, SVG, and ICO conversion
- **Clean architecture** - Organized components, hooks, and services structure
- **Performance optimized** - Web Workers, memory management, and progressive enhancement
- **Experimental/playground** nature allows for rapid prototyping

### Target Use Cases

- Quick file format conversion in the browser
- Testing WebP conversion capabilities and quality settings
- Educational tool for understanding file format conversion
- Batch conversion of multiple files
- Comparison of original vs converted file sizes

### User Experience Goals

- **Drag & drop** file upload interface
- **Real-time preview** of conversion results
- **Download options** for converted files
- **Conversion settings** (quality, compression options)
- **Progress indicators** for large file processing
- **File size comparison** before/after conversion

## Technical Architecture & Stack

### Frontend Framework

- **Next.js 15** with App Router
- **React 18** for UI components (React 19 compatible)
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **styled-components 6** for component styling
- **Lucide React** for icons

### Build System & Package Management

- **Yarn** for package management
- **Next.js** built-in bundling and optimization with Turbopack
- **ESLint 9** with Next.js configuration
- **PostCSS** for CSS processing

### Image Conversion Implementation

Current client-side conversion stack:

- **Canvas API** for browser-based image processing
- **Web Workers** for non-blocking conversion (`public/workers/image-conversion-worker.js`)
- **JSZip** for batch download functionality
- **File API** and **Blob API** for file handling
- **Progressive enhancement** with fallbacks for older browsers

### Technical Goals Status

- ✅ **Web Workers** implemented for non-blocking conversion
- ✅ **Canvas API** used for image processing with fallbacks
- ✅ **Progressive enhancement** implemented for browser compatibility
- ✅ **Client-side only** approach maintained for privacy
- ✅ **Performance optimization** with memory management and chunked processing
- ✅ **Clean architecture** with organized services, hooks, and components

## Project Structure

```
webp-playground/
├── .git/                    # Git repository
├── .kiro/                   # Kiro AI assistant configuration
│   └── steering/            # AI steering documents
├── public/                  # Static assets
│   ├── workers/             # Web Workers
│   │   └── image-conversion-worker.js
│   └── *.svg               # Static SVG assets
├── src/                     # Source code
│   ├── app/                 # App Router directory
│   │   ├── accessibility.css
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main application page
│   ├── components/          # Organized React components
│   │   ├── conversion/      # Conversion-related components
│   │   │   ├── ConversionPanel.tsx
│   │   │   ├── DownloadManager.tsx
│   │   │   ├── PreviewComparison.tsx
│   │   │   └── index.ts
│   │   ├── feedback/        # User feedback components
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingStates.tsx
│   │   │   ├── NotificationSystem.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   └── index.ts
│   │   ├── ui/              # Basic UI components
│   │   │   ├── FileUpload.tsx
│   │   │   └── index.ts
│   │   └── index.ts         # Main component exports
│   ├── hooks/               # Organized custom React hooks
│   │   ├── conversion/      # Image conversion hooks
│   │   │   ├── useImageConversion.ts
│   │   │   ├── useImageConversionWithErrorHandling.ts
│   │   │   ├── useSimpleImageConversion.ts
│   │   │   └── index.ts
│   │   ├── ui/              # UI interaction hooks
│   │   │   ├── useAccessibility.ts
│   │   │   ├── useFileUpload.ts
│   │   │   └── index.ts
│   │   ├── utils/           # Utility hooks
│   │   │   ├── useErrorHandling.ts
│   │   │   └── index.ts
│   │   └── index.ts         # Main hook exports
│   ├── lib/                 # Organized utility functions and services
│   │   ├── components/      # React components and UI utilities
│   │   │   ├── styled-components-registry.tsx
│   │   │   └── index.ts
│   │   ├── services/        # Business logic services
│   │   │   ├── accessibility-service.ts
│   │   │   ├── chunked-processing-service.ts
│   │   │   ├── download-service.ts
│   │   │   ├── error-handling-service.ts
│   │   │   ├── image-conversion-service.ts
│   │   │   ├── image-conversion-worker-service.ts
│   │   │   ├── memory-management-service.ts
│   │   │   ├── progressive-enhancement-service.ts
│   │   │   ├── webassembly-fallback-service.ts
│   │   │   └── index.ts
│   │   ├── utils/           # Utility functions and constants
│   │   │   ├── constants.ts
│   │   │   ├── file-validation.ts
│   │   │   └── index.ts
│   │   └── index.ts         # Main lib exports
│   └── types/               # TypeScript type definitions
│       ├── components.ts
│       ├── conversion.ts
│       ├── index.ts
│       └── validation.ts
├── next.config.ts           # Next.js configuration
├── package.json             # Project dependencies and scripts
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── yarn.lock                # Yarn lockfile
```

## Development Guidelines & Coding Conventions

### File Naming Conventions

- Use kebab-case for directories: `webp-converter/`
- Use PascalCase for React components: `FileUpload.tsx`
- Use camelCase for utilities: `fileUtils.ts`
- Use lowercase for Next.js pages: `page.tsx`, `layout.tsx`
- Suffix styled components with `Styled`: `ButtonStyled`, `ContainerStyled`
- Suffix TypeScript types with `Type`: `UserType`, `ConversionSettingsType`

### Component Styling Patterns

#### Styled Components

- Use **styled-components** for component styling
- Suffix styled components with `Styled` (e.g., `ButtonStyled`, `ContainerStyled`)
- Use TypeScript generics for props and nested class styling
- Example pattern:

```typescript
import styled from 'styled-components';

type ButtonPropsType = {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

const ButtonStyled = styled.button<ButtonPropsType>`
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  
  .button-text {
    font-weight: 500;
    color: ${props => props.variant === 'primary' ? 'white' : 'black'};
  }
  
  .button-icon {
    margin-right: 8px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

#### Icons

- Use **Lucide React** for all icons
- Import specific icons: `import { Upload, Download, Settings } from 'lucide-react'`
- Consistent icon usage throughout the interface

### TypeScript Conventions

- Use `type` declarations instead of `interface`
- Suffix types with `Type` (e.g., `UserType`, `ConversionSettingsType`)
- Example: `type UserType = { name: string; email: string; }`
- Maintain strict type safety throughout the application

### Import Conventions

- Use `@/` alias for imports from `src/` directory
- Group imports: React, Next.js, third-party, local components, utilities
- Use organized imports from subfolders:

```typescript
// Organized imports
import { ImageConversionService, DownloadService } from "@/lib/services";
import { useFileUpload, useAccessibility } from "@/hooks/ui";
import { FileUpload } from "@/components/ui";
import { ErrorBoundary, ProgressIndicator } from "@/components/feedback";

// Or use main index exports
import { FileUpload, ErrorBoundary } from "@/components";
import { useFileUpload, useImageConversion } from "@/hooks";
```

### Architecture Organization

#### Components Organization

- **conversion/**: Components related to image conversion (ConversionPanel, DownloadManager, PreviewComparison)
- **feedback/**: User feedback and status components (ErrorBoundary, LoadingStates, NotificationSystem, ProgressIndicator)
- **ui/**: Basic UI components (FileUpload)

#### Hooks Organization

- **conversion/**: Image conversion logic hooks
- **ui/**: UI interaction and accessibility hooks
- **utils/**: Utility and error handling hooks

#### Services Organization

- **services/**: Business logic services for image conversion, memory management, error handling, etc.
- **utils/**: Utility functions, constants, and validation
- **components/**: React-specific utilities like styled-components registry

## Implementation Details & Completed Features

### Current Implementation Status

The project has a comprehensive architecture with the following implemented components:

#### Core Conversion Features
- ✅ Multi-format support (JPEG, PNG, GIF, WebP, AVIF, SVG, ICO)
- ✅ Client-side processing with Canvas API
- ✅ Web Workers for non-blocking conversion
- ✅ Progressive enhancement with fallbacks
- ✅ Memory management and chunked processing

#### User Interface Components
- ✅ File upload with drag & drop interface
- ✅ Conversion panel with settings
- ✅ Preview comparison view
- ✅ Download manager for batch downloads
- ✅ Progress indicators and loading states
- ✅ Error boundaries and notification system

#### Services & Utilities
- ✅ Image conversion service with worker integration
- ✅ Download service with JSZip integration
- ✅ Error handling and accessibility services
- ✅ File validation and memory management
- ✅ WebAssembly fallback capabilities

### Dependencies

#### Production
- `jszip@^3.10.1` - Batch file download functionality
- `lucide-react@^0.541.0` - Icon library
- `next@15.5.0` - React framework
- `react@19.1.0` & `react-dom@19.1.0` - React library
- `styled-components@^6.1.19` - CSS-in-JS styling

#### Development
- `@tailwindcss/postcss@^4` - Tailwind CSS integration
- `eslint@^9` & `eslint-config-next@15.5.0` - Code linting
- `tailwindcss@^4` - Utility-first CSS framework
- `typescript@^5` - Type safety

## Commands & Development Workflow

```bash
# Package management
yarn install         # Install dependencies
yarn add <package>   # Add new dependency
yarn remove <package> # Remove dependency

# Development
yarn dev            # Start development server with Turbopack (localhost:3000)
yarn build          # Build for production with Turbopack
yarn start          # Start production server
yarn lint           # Run ESLint
```

## Specific Instructions for AI Assistants

### Code Quality Standards

1. **Type Safety**: Maintain TypeScript throughout with proper type definitions
2. **Modern React Patterns**: Use hooks and functional components exclusively
3. **Accessibility**: Implement proper ARIA labels, keyboard navigation, and semantic HTML
4. **Performance**: Consider memory usage, Web Workers for heavy operations, and progressive loading
5. **Clean Architecture**: Follow the organized folder structure and separation of concerns

### Component Development

1. **Styled Components**: Always suffix with `Styled` and use TypeScript generics
2. **Icon Usage**: Use Lucide React icons consistently throughout the interface
3. **Error Boundaries**: Wrap components that might fail with appropriate error boundaries
4. **Loading States**: Provide clear feedback during async operations

### Service Integration

1. **Web Workers**: Use for heavy image processing operations
2. **Memory Management**: Clean up resources, especially for large files
3. **Progressive Enhancement**: Ensure fallbacks for older browsers
4. **Client-side Only**: Never send files to servers - maintain privacy

### Testing Considerations

- No testing framework currently configured (removed for playground simplicity)
- Focus on runtime error handling and graceful degradation
- Manual testing across different browsers and devices

### File Creation Guidelines

- NEVER create new files unless absolutely necessary
- ALWAYS prefer editing existing files in the codebase
- NEVER proactively create documentation files unless explicitly requested
- Follow the established project structure and naming conventions

### When Working on This Project

1. **Read the steering documents**: Always refer to the current steering files for context
2. **Follow the architecture**: Use the established component, hook, and service organization
3. **Maintain consistency**: Follow naming conventions and coding patterns
4. **Type everything**: Use TypeScript types with the `Type` suffix convention
5. **Test in browser**: Verify functionality works across different browsers and file types
6. **Performance first**: Consider memory usage and processing time for large files
7. **Privacy focused**: Ensure all processing remains client-side

This is an experimental playground project that encourages rapid prototyping while maintaining clean architecture and professional code quality standards.