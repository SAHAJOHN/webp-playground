# webp-playground

A modern, experimental Next.js application for lightweight client-side image conversion utilities. Convert between multiple image formats (JPEG, PNG, GIF, WebP, AVIF, SVG, ICO) directly in your browser with privacy-first, client-side processing.

## ✨ Key Features

- 🔒 **Privacy-first**: All processing happens client-side - no server uploads
- 🚀 **Multiple formats**: Convert between JPEG, PNG, GIF, WebP, AVIF, SVG, and ICO
- 📱 **Responsive design**: Mobile-first UI with Tailwind CSS and styled-components
- ⚡ **Performance optimized**: Web Workers for non-blocking conversion
- 🎛️ **Batch processing**: Convert and download multiple files at once
- 📊 **File comparison**: Compare original vs converted file sizes
- 🎨 **Professional UI**: Clean interface with Lucide React icons
- ♿ **Accessible**: Built with accessibility standards in mind

## 🛠️ Technology Stack

### Frontend Framework
- **Next.js 15** with App Router and Turbopack
- **React 18** (React 19 compatible) with TypeScript
- **Tailwind CSS 4** for utility-first styling
- **styled-components 6** for component styling
- **Lucide React** for consistent iconography

### Image Processing
- **Canvas API** for browser-based image processing
- **Web Workers** for non-blocking conversion operations
- **File API** and **Blob API** for client-side file handling
- **JSZip** for batch download functionality
- **Progressive enhancement** with browser compatibility fallbacks

### Development Tools
- **TypeScript 5** for type safety
- **ESLint 9** with Next.js configuration
- **Yarn** for package management
- **PostCSS** for CSS processing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd webp-playground

# Install dependencies
yarn install

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

```bash
yarn dev          # Start development server with Turbopack
yarn build        # Build for production with Turbopack
yarn start        # Start production server
yarn lint         # Run ESLint
```

## 📁 Project Structure

```
webp-playground/
├── public/
│   ├── workers/              # Web Workers for image processing
│   └── *.svg                # Static SVG assets
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main application
│   ├── components/          # Organized React components
│   │   ├── conversion/      # Image conversion components
│   │   ├── feedback/        # User feedback & status components
│   │   └── ui/              # Basic UI components
│   ├── hooks/               # Custom React hooks
│   │   ├── conversion/      # Image conversion logic
│   │   ├── ui/              # UI interaction hooks
│   │   └── utils/           # Utility hooks
│   ├── lib/                 # Services and utilities
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   └── components/      # React utilities
│   └── types/               # TypeScript type definitions
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 💡 Usage

### Basic Conversion

1. **Upload files**: Drag and drop image files or click to select
2. **Choose format**: Select your target format (WebP, AVIF, etc.)
3. **Adjust settings**: Configure quality and compression options
4. **Convert**: Process files with real-time progress feedback
5. **Download**: Get individual files or batch download as ZIP

### Supported Formats

| Input Formats | Output Formats |
|---------------|----------------|
| JPEG, JPG     | WebP, AVIF     |
| PNG           | JPEG, WebP     |
| GIF           | PNG, WebP      |
| WebP          | JPEG, PNG      |
| AVIF          | JPEG, PNG      |
| SVG           | PNG, JPEG      |
| ICO           | PNG, JPEG      |

### Performance Features

- **Web Workers**: Heavy processing doesn't block the UI
- **Memory management**: Automatic cleanup for large files  
- **Chunked processing**: Handle multiple files efficiently
- **Progressive enhancement**: Works across different browsers

## 🏗️ Architecture

### Clean Architecture

The project follows a clean, organized architecture:

- **Components**: Organized by purpose (conversion, feedback, ui)
- **Hooks**: Grouped by functionality (conversion, ui, utils) 
- **Services**: Business logic separated from UI components
- **Types**: Centralized TypeScript definitions

### Code Conventions

- **Styled Components**: Suffix with `Styled` (e.g., `ButtonStyled`)
- **TypeScript Types**: Suffix with `Type` (e.g., `UserType`) 
- **Icons**: Use Lucide React for consistency
- **Imports**: Organized with `@/` alias for clean structure

## 🔧 Configuration

### Next.js Configuration

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true, // Enable styled-components
  },
};
```

### Import Alias

The project uses `@/` as an alias for the `src/` directory:

```typescript
import { FileUpload } from "@/components/ui";
import { useImageConversion } from "@/hooks/conversion";
```

## 🤝 Contributing

This is an experimental playground project that encourages:

- 🧪 Rapid prototyping of new features
- 🎨 UI/UX experimentation  
- ⚡ Performance optimization testing
- 🆕 New image format support

### Development Guidelines

1. **Type Safety**: Use TypeScript throughout
2. **Component Patterns**: Follow styled-components conventions
3. **Performance**: Consider memory usage and Web Workers
4. **Accessibility**: Maintain ARIA labels and keyboard navigation
5. **Privacy**: Keep all processing client-side

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [styled-components](https://styled-components.com/) - CSS-in-JS
- [Lucide React](https://lucide.dev/) - Beautiful icons
- [JSZip](https://stuk.github.io/jszip/) - Client-side ZIP generation

---

**Note**: This is an experimental playground project focused on client-side image conversion. All file processing happens locally in your browser for maximum privacy and performance.