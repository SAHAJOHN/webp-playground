# Project Structure

## Current Organization

```
webp-playground/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/convert/     # Server-side conversion API
│   │   ├── page.tsx         # Main application
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   │   ├── conversion/      # Conversion UI (ConversionPanel, DownloadManager, PreviewComparison)
│   │   ├── feedback/        # Status components (ErrorBoundary, LoadingStates, NotificationSystem, ProgressIndicator)
│   │   └── ui/              # Basic components (FileUpload)
│   ├── hooks/               # Custom hooks
│   │   ├── conversion/      # Image conversion logic
│   │   ├── ui/              # UI interactions
│   │   └── utils/           # Error handling utilities
│   ├── lib/                 # Core services
│   │   ├── services/        # Business logic (image-conversion-service, server-conversion-service, download-service)
│   │   ├── utils/           # Utilities (constants, file-validation)
│   │   └── components/      # React utilities (styled-components-registry)
│   └── types/               # TypeScript definitions
├── public/
│   └── workers/             # Web Workers (image-conversion-worker.js)
├── package.json             # Dependencies (sharp, jszip, lucide-react)
└── Configuration files      # Next.js, TypeScript, Tailwind, ESLint
```

## Key Architecture Patterns

### Organized Components
- **conversion/**: Core conversion UI components  
- **feedback/**: User feedback and status displays
- **ui/**: Reusable basic components

### Service Layer
- **image-conversion-service.ts**: Main conversion logic
- **server-conversion-service.ts**: Sharp/libvips integration  
- **download-service.ts**: Batch download with JSZip
- **memory-management-service.ts**: Resource cleanup

### Dual Processing Pipeline
- **Client-side**: Web Workers + Canvas API
- **Server-side**: API route + Sharp library
- **Auto-selection**: Logic in conversion services

### Import Organization
- Index files for clean imports: `@/components`, `@/lib/services`
- Grouped by functionality: conversion, ui, utils
- TypeScript aliases: `@/` maps to `src/`