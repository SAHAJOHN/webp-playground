# webp-playground

A modern, experimental Next.js application for advanced image format conversion with both client-side and server-side processing capabilities. Convert between multiple image formats (JPEG, PNG, WebP, AVIF) with comprehensive control over compression settings and optimization parameters.

## ✨ Key Features

- 🔒 **Dual Processing Modes**: Choose between privacy-focused client-side or powerful server-side processing
- 🚀 **Advanced Format Support**: JPEG, PNG, WebP, and AVIF with full control over format-specific settings
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

#### Client-side
- **Canvas API** for browser-based image processing
- **Web Workers** for non-blocking conversion operations
- **File API** and **Blob API** for client-side file handling
- **Progressive enhancement** with browser compatibility fallbacks

#### Server-side
- **Sharp** (libvips) for advanced image processing
- **libwebp** for superior WebP compression
- **mozjpeg** for optimized JPEG encoding
- **libavif** for next-gen AVIF format
- **JSZip** for batch download functionality

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

| Format | Input | Output | Client-side | Server-side |
|--------|-------|--------|-------------|-------------|
| JPEG   | ✅    | ✅     | ✅          | ✅ (mozjpeg) |
| PNG    | ✅    | ✅     | ✅          | ✅ (optimized) |
| WebP   | ✅    | ✅     | ⚠️ (basic)  | ✅ (libwebp) |
| AVIF   | ✅    | ✅     | ❌          | ✅ (libavif) |

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

## 📋 Comprehensive Settings Guide

### 🖼️ JPEG Settings

#### Quality (1-100)
- **Purpose**: Controls lossy compression level
- **Effect**: Lower = smaller file but more artifacts, Higher = larger file but better quality
- **Recommendation**: 85-90 for photos, 75-85 for web images
- **File Size Impact**: ~50% reduction at quality 85

#### Progressive JPEG
- **Purpose**: Changes how image loads in browsers
- **Effect**: 
  - **Enabled**: Shows blurry full image first, then sharpens (better for slow connections)
  - **Disabled**: Loads top-to-bottom sequentially
- **File Size Impact**: +2-5% larger but better perceived performance
- **Recommendation**: Enable for images >10KB on websites

#### Chroma Subsampling
- **Options**: 4:4:4, 4:2:2, 4:2:0, Auto
- **Purpose**: Reduces color information to save space
- **Effect**:
  - **4:4:4**: No color reduction (best for graphics/text)
  - **4:2:0**: Maximum color reduction (best for photos)
  - **Auto**: Chooses based on quality setting
- **File Size Impact**: 10-20% reduction with 4:2:0
- **Recommendation**: Auto or 4:2:0 for photos, 4:4:4 for screenshots

#### MozJPEG Encoder (Server-side)
- **Purpose**: Uses Mozilla's optimized JPEG encoder
- **Effect**: 10-15% smaller files with same visual quality
- **Recommendation**: Always enable when available

### 🎨 PNG Settings

#### Compression Level (0-9)
- **Purpose**: Controls zlib compression effort
- **Effect**: Higher = smaller file but slower encoding
- **File Size Impact**: Level 9 can be 10-30% smaller than level 0
- **Recommendation**: Level 9 for production, Level 6 for development

#### Interlacing (Adam7)
- **Purpose**: Progressive loading for PNG
- **Effect**: Shows low-res preview while loading
- **File Size Impact**: +10-20% larger file
- **Recommendation**: Only for large images on slow connections

#### Palette Quantization
- **Purpose**: Reduces colors to create smaller indexed PNG
- **Effect**: Converts to palette mode with specified colors (2-256)
- **File Size Impact**: Can reduce by 50-70% for simple images
- **Recommendation**: Great for logos, icons, simple graphics
- **Note**: Will reduce quality for photos

### 🌐 WebP Settings

#### Compression Mode
- **Lossy**: Variable quality with artifacts
- **Lossless**: Perfect quality, larger files
- **File Size**: Lossy is 25-35% smaller than JPEG, Lossless is 26% smaller than PNG

#### Quality (Lossy mode, 1-100)
- **Purpose**: Controls compression level
- **Effect**: Similar to JPEG but 25-35% smaller at same quality
- **Recommendation**: 80-85 for general use

#### Near-Lossless (Lossless mode, 0-100)
- **Purpose**: Preprocessing to allow minimal quality loss for better compression
- **Effect**:
  - **100**: True lossless (perfect quality)
  - **80**: Visually identical, 10-20% smaller
  - **60**: Minor quality loss, 20-40% smaller
- **File Size Impact**: Significant reduction with minimal visual impact
- **Recommendation**: 80-95 for best balance

#### Optimization Preset (Lossy mode)
- **Options**: Default, Photo, Picture, Drawing, Icon, Text
- **Purpose**: Optimizes encoder for specific content types
- **Effect**: Tunes internal parameters for content characteristics
- **Recommendation**: Match to your image type

#### Alpha Channel Quality (0-100)
- **Purpose**: Controls transparency compression
- **Effect**: Lower values reduce transparency quality
- **Recommendation**: 100 for logos, 90 for general use

### 🚀 AVIF Settings

#### Compression Mode
- **Lossy**: Variable quality, smallest files
- **Lossless**: Perfect quality, larger files
- **File Size**: 50% smaller than JPEG, 30% smaller than WebP

#### Quality (Lossy mode, 1-100)
- **Purpose**: Controls compression level
- **Effect**: More efficient than WebP/JPEG
- **Recommendation**: 60-75 (lower than JPEG due to better efficiency)

#### Encoding Speed (0-10)
- **Purpose**: Trade-off between encoding time and compression
- **Effect**:
  - **0**: Slowest encoding (10-30s), smallest file
  - **4**: Balanced (2-5s), good compression
  - **10**: Fastest (<1s), larger file
- **File Size Impact**: Speed 0 can be 40% smaller than Speed 10
- **Recommendation**: Speed 0-2 for production, 4-6 for preview
- **Note**: Does NOT affect decoding/display speed

#### Compression Effort (0-9)
- **Purpose**: Number of optimization passes
- **Effect**: Higher = more attempts to find best compression
- **Works with Speed**: Speed chooses algorithm, Effort optimizes it
- **Recommendation**: 4-6 for balance, 9 for maximum compression

## 🎯 Usage Recommendations

### By Use Case

| Use Case | Format | Settings |
|----------|--------|----------|
| **Photography Portfolio** | JPEG | Quality 90, Progressive, 4:4:4, MozJPEG |
| **Blog Images** | WebP | Lossy, Quality 80, Photo preset |
| **Screenshots** | PNG | Compression 9, No interlacing |
| **Icons/Logos** | WebP | Lossless, Near-lossless 95 |
| **Modern Websites** | AVIF | Quality 65, Speed 2, Effort 6 |
| **Social Media** | JPEG | Quality 85, Progressive, Auto chroma |
| **Archives** | PNG/WebP | Lossless, Maximum compression |

### File Size Comparison

| Original PNG (1MB) | Format | Settings | Result |
|--------------------|--------|----------|--------|
| 1000 KB | JPEG | Q85, MozJPEG | ~250 KB |
| 1000 KB | PNG | Level 9 | ~800 KB |
| 1000 KB | WebP Lossy | Q85 | ~180 KB |
| 1000 KB | WebP Lossless | NL80 | ~600 KB |
| 1000 KB | AVIF | Q70, Speed 2 | ~120 KB |

### Server vs Client Processing

| Feature | Client-side | Server-side |
|---------|------------|-------------|
| **Privacy** | ✅ No upload | ⚠️ File uploaded |
| **Speed** | Fast for small files | Fast for all sizes |
| **Compression** | Basic | Advanced (10-40% better) |
| **Settings** | Limited | Full control |
| **Browser Support** | Varies | Consistent |

**When to use Server-side:**
- WebP lossless (always)
- AVIF (always - poor browser support)
- Large files (>3MB)
- Need best compression
- Batch processing

**When to use Client-side:**
- Privacy critical
- Small files (<1MB)
- Quick preview
- No server available

## 💡 Pro Tips

### Optimizing for Web Performance

1. **Use modern formats**: AVIF > WebP > JPEG/PNG
2. **Enable server processing**: 10-40% better compression
3. **Progressive/Interlaced**: Only for images >10KB
4. **Near-lossless WebP**: Use 80-95 for imperceptible quality loss
5. **AVIF Speed**: Use 0-2 for production (worth the wait)
6. **Batch process**: Convert multiple images with consistent settings

### Format Selection Guide

```
Photography? → JPEG (Q85-90) or AVIF (Q65-75)
Transparency needed? → PNG or WebP Lossless
Maximum compatibility? → JPEG
Maximum compression? → AVIF
Balance? → WebP
```

### Common Mistakes to Avoid

1. ❌ Using PNG for photos (use JPEG/WebP/AVIF)
2. ❌ JPEG quality 100 (95 is visually identical, much smaller)
3. ❌ Ignoring modern formats (AVIF/WebP save 30-50%)
4. ❌ Client-side for large files (use server for >3MB)
5. ❌ Same settings for all images (adjust per content type)

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