# Technology Stack

## Current State

Next.js 15 application with TypeScript, Tailwind CSS, and ESLint configured.

## Tech Stack

### Frontend Framework

- **Next.js 15** with App Router
- **React 18** for UI components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **styled-components** for component styling
- **Lucide React** for icons

### Build System & Package Management

- **Yarn** for package management
- **Next.js** built-in bundling and optimization
- **Turbopack** (optional, recommended for faster builds)

### Development Tools

- **ESLint** with Next.js configuration
- **TypeScript** compiler
- **PostCSS** for CSS processing

### Image Conversion Implementation

Current client-side conversion stack:

- **Canvas API** for browser-based image processing
- **Web Workers** for non-blocking conversion (`public/workers/image-conversion-worker.js`)
- **JSZip** for batch download functionality
- **File API** and **Blob API** for file handling
- **Progressive enhancement** with fallbacks for older browsers

## Common Commands

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

## Current Dependencies

### Production Dependencies

- **jszip**: Batch file download functionality
- **lucide-react**: Icon library
- **next**: React framework
- **react** & **react-dom**: React library
- **styled-components**: CSS-in-JS styling

### Development Dependencies

- **@tailwindcss/postcss**: Tailwind CSS integration
- **eslint** & **eslint-config-next**: Code linting
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety
- **@types/\***: TypeScript type definitions

## Project Configuration

- Uses `src/` directory structure with organized subfolders
- Import alias `@/*` configured for `src/` directory
- App Router (not Pages Router)
- TypeScript strict mode enabled
- Turbopack enabled for faster builds
- No testing framework (removed for playground simplicity)
- Clean, organized architecture with logical separation of concerns

## Coding Conventions

### Component Styling

- Use **styled-components** for component styling
- Suffix styled components with `Styled` (e.g., `ButtonStyled`, `ContainerStyled`)
- Use TypeScript generics for props and nested class styling
- Example:

```typescript
const ButtonStyled = styled.button<ButtonPropsType>`
  .button-text {
    color: white;
  }
`;
```

### TypeScript Types

- Use `type` declarations instead of `interface`
- Suffix types with `Type` (e.g., `UserType`, `ConversionSettingsType`)
- Example: `type UserType = { name: string; email: string; }`

### Icons

- Use **Lucide React** for all icons
- Import specific icons: `import { Upload, Download, Settings } from 'lucide-react'`
