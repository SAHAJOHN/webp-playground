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
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                     # Source code
│   └── app/                 # App Router directory
│       ├── favicon.ico
│       ├── globals.css      # Global styles
│       ├── layout.tsx       # Root layout
│       └── page.tsx         # Home page
├── .eslintrc.json          # ESLint configuration
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

## Recommended Structure for WebP Features

```
src/
├── app/                     # App Router pages
│   ├── convert/            # WebP conversion page
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Landing page
├── components/             # Reusable UI components
│   ├── ui/                 # Base UI components
│   ├── FileUpload.tsx      # File upload component
│   ├── ConversionResult.tsx # Conversion result display
│   └── ProgressBar.tsx     # Progress indicator
├── lib/                    # Utility functions and configurations
│   ├── webp-converter.ts   # WebP conversion logic
│   ├── file-utils.ts       # File handling utilities
│   └── utils.ts            # General utilities
├── hooks/                  # Custom React hooks
│   ├── useFileUpload.ts    # File upload hook
│   └── useWebPConversion.ts # Conversion hook
└── types/                  # TypeScript type definitions
    └── conversion.ts       # Conversion-related types
```

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

## Import Conventions

- Use `@/` alias for imports from `src/` directory
- Group imports: React, Next.js, third-party, local components, utilities
