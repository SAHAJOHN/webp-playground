# Technology Stack

## Current State

Next.js 15 application with TypeScript, Tailwind CSS, and ESLint configured.

## Tech Stack

### Frontend Framework

- **Next.js 15** with App Router
- **React 18** for UI components
- **TypeScript** for type safety
- **Tailwind CSS** for styling

### Build System & Package Management

- **Yarn** for package management
- **Next.js** built-in bundling and optimization
- **Turbopack** (optional, recommended for faster builds)

### Development Tools

- **ESLint** with Next.js configuration
- **TypeScript** compiler
- **PostCSS** for CSS processing

### WebP Conversion Libraries

Consider adding these for client-side conversion:

- `sharp` (if server-side processing needed)
- `canvas` API for browser-based conversion
- WebAssembly modules for libwebp

## Common Commands

```bash
# Package management
yarn install         # Install dependencies
yarn add <package>   # Add new dependency
yarn remove <package> # Remove dependency

# Development
yarn dev            # Start development server (localhost:3000)
yarn build          # Build for production
yarn start          # Start production server
yarn lint           # Run ESLint

# Optional Turbopack (faster builds)
yarn dev --turbo    # Development with Turbopack
```

## Project Configuration

- Uses `src/` directory structure
- Import alias `@/*` configured for `src/` directory
- App Router (not Pages Router)
- TypeScript strict mode enabled
