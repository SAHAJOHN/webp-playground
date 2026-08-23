# webp-playground

A professional Next.js media converter. It uses server-side Sharp for optimized JPEG, PNG, WebP, and AVIF images, plus a disk-streamed FFmpeg pipeline that extracts MP3 or M4A audio from videos up to 8 GiB.

## ✨ Key Features

- 🚀 **Server-side Processing**: Sharp/libvips for best compression (10-20% smaller files)
- 📁 **Format Support**: JPEG, PNG, WebP, AVIF with format-specific optimizations
- 📦 **Batch Processing**: Client-side queue with controlled parallel conversion
- 📡 **Real-time Server Status**: SSE updates for queue, processing slots, and memory budget
- 📊 **Size Comparison**: Real-time before/after file size display
- 🎨 **Modern UI**: Clean interface with Tailwind CSS and Lucide icons
- ♿ **Accessible**: Full keyboard navigation and ARIA support
- 🎧 **Video to Audio**: Extract MP3 or M4A from MOV, MP4, MKV, WebM, AVI, MPEG, TS, 3GP, and OGV containers
- 💾 **8 GiB Streaming Uploads**: Sequential 16 MiB chunks are written to temporary disk instead of server memory
- 🎚️ **Selectable Audio Bitrate**: 32–320 kbps, with M4A 64 kbps as the compact default

## 🛠️ Technology Stack

- **Next.js 16.1.6** with App Router
- **Sharp 0.34.3** for image processing
- **FFmpeg + FFprobe** packaged per platform for video/audio processing
- **React 19** with TypeScript 5
- **Tailwind CSS 4** + styled-components
- **Lucide React** for icons

### Image Processing Backends
- **libwebp** for WebP (10-20% better than browser)
- **mozjpeg** for JPEG (10-15% smaller files)
- **libpng** for PNG (maximum compression)
- **libavif** for AVIF (server-exclusive)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Yarn package manager
- At least 9 GiB of free temporary disk space for one maximum-size media job

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

Open [http://localhost:3000](http://localhost:3000) to start converting images.

### Commands

```bash
yarn dev      # Development server
yarn build    # Production build
yarn start    # Production server
yarn lint     # Run ESLint
yarn test     # Run Vitest
yarn verify:video  # Verify the real MOV fixture as M4A 64 kbps
```

Open [http://localhost:3000/video-to-audio](http://localhost:3000/video-to-audio) for video-to-audio conversion.

## Image Conversion Limits and Queue Behavior

- **Max file size**: `15MB` per file
- **SVG input**: blocked 100% for security
- **Client parallelism**: `5` conversions per client
- **Server active processing**: `5` jobs
- **Server queue capacity**: `100` jobs (`pending + active`)
- **Server memory budget**: `100MB` reserved input bytes (`pending + active`)

Server also enforces input signature validation (magic bytes), image dimension limits, and conversion timeout protection.

### Video-to-Audio Limits

- **Max input size**: `8 GiB` per video
- **Upload chunk size**: `16 MiB` (the full video is never buffered in memory)
- **Live media jobs**: `10` per server process
- **Reserved input budget**: `24 GiB`
- **FFmpeg concurrency**: `1` by default
- **Temporary-file expiry**: `6 hours`
- **Output formats**: MP3 (`audio/mpeg`) and M4A/AAC (`audio/mp4`)
- **Bitrates**: `32`, `48`, `64`, `96`, `128`, `160`, `192`, `256`, `320` kbps

Video extensions are an early filter only. FFprobe validates the completed upload and requires a real audio stream before FFmpeg starts.

### Verify API Error Codes

Run the lightweight curl-based verification script while the app is running:

```bash
bash scripts/verify-convert-error-codes.sh http://localhost:3000
```

The script verifies:

- `SVG_BLOCKED`
- `INVALID_FILE_SIGNATURE`
- `FILE_TOO_LARGE`
- `NO_FILE_PROVIDED`
- `INVALID_OUTPUT_FORMAT`

When server capacity is full, `/api/convert` returns `429` with `Retry-After` and a reason code (`QUEUE_FULL` or `MEMORY_BUDGET_EXCEEDED`).
The client retries automatically with backoff.

## 📋 Format Settings Guide

### JPEG Settings

| Setting | Options | Default | Recommendation |
|---------|---------|---------|----------------|
| **Quality** | 1-100 | 85 | 85-90 for photos, 75-85 for web |
| **Progressive** | On/Off | **On** | Enable for better perceived loading |
| **Chroma Subsampling** | 4:4:4, 4:2:2, 4:2:0, Auto | Auto | Auto or 4:2:0 for photos |

### PNG Settings

| Setting | Options | Default | Recommendation |
|---------|---------|---------|----------------|
| **Compression** | 0-9 | 9 | 9 for production |
| **Interlacing** | On/Off | **On** | Enable for large images |
| **Palette** | 2-256 colors | Off | Use for simple graphics |
| **Dithering** | 0-1 | 0 | 0.5-1 for smooth gradients |

### WebP Settings

| Setting | Options | Default | Recommendation |
|---------|---------|---------|----------------|
| **Mode** | Lossy/Lossless | Lossy | Lossy for photos, Lossless for graphics |
| **Quality** | 1-100 (lossy) | 80 | 80-85 for general use |
| **Near-lossless** | 0-100% (lossless) | 100% | 80-95% for smaller files |
| **Preset** | default, photo, picture, drawing, icon, text | default | Match to content |
| **Alpha Quality** | 0-100 | 100 | 90-100 for transparency |
| **Effort** | 0-9 (clamped to 0-6) | 6 | 6 for best compression |

### AVIF Settings

| Setting | Options | Default | Recommendation |
|---------|---------|---------|----------------|
| **Mode** | Lossy/Lossless | Lossy | Lossy for most cases |
| **Quality** | 1-100 | 50 | 50-70 (more efficient than JPEG) |
| **Effort** | 0-9 | 4 | 4-6 for balance, 9 for max compression |

## 🎯 Usage Examples

### Basic Workflow
1. **Upload**: Drag & drop or click to select images
2. **Configure**: Choose format and adjust settings
3. **Convert**: Use **Convert All** in the bottom action area next to **Clear All**
4. **Monitor**: Queue status updates in real time (`Server Queue`, `Processing`, `Memory`)
5. **Download**: Individual files or batch ZIP

### Video-to-Audio Workflow

1. Open `/video-to-audio` and select one video.
2. Choose MP3 or M4A and a bitrate. M4A at 64 kbps is recommended for compact spoken audio.
3. Start conversion. Upload and FFmpeg progress are shown separately.
4. Preview the completed audio in the browser.
5. Download the result. Completed temporary output expires automatically.

### Verify the Real MOV Fixture

With `yarn dev` running:

```bash
node scripts/verify-video-to-audio.mjs http://localhost:3000 public/testfiles/705432-Ch1-Part1.mov m4a 64
node scripts/verify-video-to-audio.mjs http://localhost:3000 public/testfiles/705432-Ch1-Part1.mov mp3 64
```

The script uploads in chunks, converts, polls status, downloads, probes the output, checks the target bitrate, and deletes all temporary verification files.

### Recommended Settings by Use Case

| Use Case | Format | Settings |
|----------|--------|----------|
| **Web Photos** | WebP | Lossy, Quality 80-85 |
| **Product Images** | JPEG | Quality 90, Progressive on |
| **Screenshots** | PNG | Compression 9, No interlacing |
| **Icons/Logos** | WebP | Lossless, Near-lossless 95% |
| **Modern Web** | AVIF | Quality 60-70, Effort 6 |

### File Size Comparison

| Original | Format | Typical Reduction |
|----------|--------|-------------------|
| PNG 1MB | JPEG | 70-75% smaller |
| PNG 1MB | WebP Lossy | 80-85% smaller |
| PNG 1MB | WebP Lossless | 30-40% smaller |
| PNG 1MB | AVIF | 85-90% smaller |
| JPEG 1MB | WebP | 25-35% smaller |
| JPEG 1MB | AVIF | 45-55% smaller |

## 🏗️ Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # Image and video/audio Route Handlers
│   └── video-to-audio/ # Dedicated video converter page
├── components/       # React components
│   ├── conversion/   # ConversionPanel, DownloadManager
│   ├── feedback/     # ErrorBoundary, LoadingStates
│   ├── video/        # Video upload, audio settings, status/result
│   └── ui/           # FileUpload, basic UI
├── hooks/            # Custom React hooks
├── lib/              # Core logic
│   ├── services/     # Business logic
│   ├── video-conversion/ # FFmpeg, disk store, validation, ranges
│   └── utils/        # Utilities
└── types/            # TypeScript types
```

## 💡 Pro Tips

### Best Compression
- **Photos**: AVIF > WebP > JPEG
- **Graphics**: WebP Lossless > PNG
- **Transparency**: WebP/PNG only
- **Animation**: Not supported (use video)

### Performance Tips
1. Use AVIF for modern browsers (50% smaller than JPEG)
2. Enable Progressive JPEG for better perceived performance
3. Use Near-lossless WebP at 80-95% for imperceptible quality loss
4. Batch process similar images with consistent settings

### Common Pitfalls
- ❌ Don't use PNG for photos (3-5x larger)
- ❌ Don't use JPEG quality 100 (95 is visually identical)
- ❌ Don't ignore AVIF (best compression available)
- ❌ Don't disable Progressive/Interlacing for large images

## 🔧 Development

### Code Style
- TypeScript with strict mode
- Functional components with hooks
- styled-components with `Styled` suffix
- Types with `Type` suffix

### Current UX Notes
- Upload panel does not render a file list; the queue section is the source of truth.
- Queue rows show status text (`Waiting...`, `Processing...`, `Completed`, `Failed`).
- Preview persists across batches until **Clear All**.
- Re-converting a file with the same filename replaces the previous preview item.

### Key Services
- `image-conversion-service.ts` - Main conversion orchestration
- `server-conversion-service.ts` - Sharp integration
- `download-service.ts` - Batch ZIP downloads
- `memory-management-service.ts` - Blob URL cleanup
- `video-conversion-service.ts` - Browser chunk upload, retry, finalize, and polling
- `video-conversion/store.ts` - Temporary disk, media queue, cancellation, and expiry
- `video-conversion/ffmpeg.ts` - FFprobe validation and safe argument-array FFmpeg execution

### Media Runtime Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `FFMPEG_PATH` | Packaged binary | Override FFmpeg executable |
| `FFPROBE_PATH` | Packaged binary | Override FFprobe executable |
| `MEDIA_TEMP_DIR` | OS temp directory | Persistent writable media workspace |
| `MEDIA_MAX_LIVE_JOBS` | `10` | Maximum retained jobs |
| `MEDIA_MAX_RESERVED_INPUT_BYTES` | `25769803776` | Reserved input budget (24 GiB) |
| `MEDIA_JOB_TTL_MS` | `21600000` | Job/output lifetime (6 hours) |
| `MEDIA_DISK_SAFETY_BYTES` | `536870912` | Free-space safety reserve |
| `MEDIA_CONVERSION_CONCURRENCY` | `1` | Concurrent FFmpeg processes (max 4) |

For production, prefer pinned, regularly patched system FFmpeg/FFprobe binaries through `FFMPEG_PATH` and `FFPROBE_PATH`. Review the LGPL/GPL obligations of the selected build before distribution.

This media pipeline is intentionally self-hosted and single-instance. A multi-instance deployment requires shared object storage and durable shared job state.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
- [FFmpeg](https://ffmpeg.org/) - Video probing and audio encoding
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Lucide](https://lucide.dev/) - Beautiful icons

---

**Note**: Image processing uses Sharp in memory. Video uploads and audio outputs use temporary disk streams. Both queues are currently single-instance and in-process.
