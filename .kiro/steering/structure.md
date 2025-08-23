# Project Structure

## Current Organization

```
webp-playground/
├── .git/                    # Git repository
├── .kiro/                   # Kiro AI assistant configuration
│   └── steering/            # AI steering documents
├── .next/                   # Next.js build output (generated)
├── node_modules/            # Dependencies (generated)
├── public/                  # Static assets
│   ├── workers/             # Web Workers
│   │   └── image-conversion-worker.js
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                     # Source code
│   ├── app/                 # App Router directory
│   │   ├── accessibility.css
│   │   ├── favicon.ico
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
├── eslint.config.mjs        # ESLint configuration
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── postcss.config.mjs      # PostCSS configuration
├── README.md               # Project documentation
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── yarn.lock               # Yarn lockfile
```

## Organized Architecture

The project follows a clean, organized structure with logical separation of concerns:

### Components Organization

- **conversion/**: Components related to image conversion (ConversionPanel, DownloadManager, PreviewComparison)
- **feedback/**: User feedback and status components (ErrorBoundary, LoadingStates, NotificationSystem, ProgressIndicator)
- **ui/**: Basic UI components (FileUpload)

### Hooks Organization

- **conversion/**: Image conversion logic hooks
- **ui/**: UI interaction and accessibility hooks
- **utils/**: Utility and error handling hooks

### Services Organization

- **services/**: Business logic services for image conversion, memory management, error handling, etc.
- **utils/**: Utility functions, constants, and validation
- **components/**: React-specific utilities like styled-components registry

## Next.js App Router Conventions

- **Pages**: Create `page.tsx` files in `src/app/` subdirectories
- **Layouts**: Use `layout.tsx` for shared layouts
- **Loading**: Use `loading.tsx` for loading states
- **Error**: Use `error.tsx` for error boundaries
- **Not Found**: Use `not-found.tsx` for 404 pages
- **Route Groups**: Use `(group)` folders for organization without affecting routes

## File Naming Conventions

- Use kebab-case for directories: `webp-converter/`
- Use PascalCase for React components: `FileUpload.tsx`
- Use camelCase for utilities: `fileUtils.ts`
- Use lowercase for pages: `page.tsx`, `layout.tsx`
- Suffix styled components with `Styled`: `ButtonStyled`, `ContainerStyled`
- Suffix TypeScript types with `Type`: `UserType`, `ConversionSettingsType`

## Import Conventions

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

## Clean Architecture Benefits

- **Logical Grouping**: Related functionality is grouped together
- **Easy Navigation**: Clear folder structure makes finding files intuitive
- **Scalable**: Easy to add new components/hooks/services in appropriate categories
- **Clean Imports**: Organized imports reduce clutter and improve readability
- **Maintainable**: Clear separation of concerns makes code easier to maintain
