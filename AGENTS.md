# AGENT.md

This file documents the current behavior and constraints of the app so coding agents can stay aligned with runtime reality.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Current Runtime Model

- Conversion is server-side via `POST /api/convert` using Sharp.
- Response body is binary image data (e.g. `image/webp`, `image/jpeg`) plus metadata headers.
- Server status is streamed via SSE on `GET /api/convert` (`Accept: text/event-stream`).
- Video-to-audio conversion is isolated under `/video-to-audio` and `/api/video-to-audio/jobs`.
- Video uploads use sequential raw `PATCH` chunks written directly to temporary disk; they never use `request.formData()` or a full-file `Buffer`.
- FFprobe validates completed uploads and FFmpeg creates MP3 (`libmp3lame`) or M4A (AAC) output.

## Video-to-Audio Flow and Limits

- Maximum input: `8 GiB` per file.
- Chunk size: `16 MiB`.
- Supported output: `mp3` and `m4a`.
- Allowed bitrate: `32/48/64/96/128/160/192/256/320` kbps.
- Default UI setting: M4A at `64 kbps`.
- Media conversion concurrency: `1`.
- Maximum live media jobs: `10`.
- Reserved media input budget: `24 GiB`.
- Job/output TTL: `6 hours`.
- Temporary root: `MEDIA_TEMP_DIR` or the OS temp directory.
- Input is removed after successful conversion; output remains until cancel/expiry.

### Media API

- `POST /api/video-to-audio/jobs`: validate metadata and create an upload job.
- `PATCH /api/video-to-audio/jobs/:jobId`: stream one sequential raw chunk with `Content-Range`.
- `POST /api/video-to-audio/jobs/:jobId`: FFprobe and queue conversion.
- `GET /api/video-to-audio/jobs/:jobId`: poll public progress/state.
- `DELETE /api/video-to-audio/jobs/:jobId`: cancel and remove temporary files.
- `GET /api/video-to-audio/jobs/:jobId/download`: range-capable output stream.

FFmpeg and FFprobe resolve from `FFMPEG_PATH`/`FFPROBE_PATH` first, then the packaged platform binaries. Never construct shell commands; use `spawn()` argument arrays.

## Throughput, Queue, and Memory Limits

- Max upload size per file: `15MB`.
- SVG input is blocked 100% for security (`SVG_BLOCKED`).
- Client conversion parallelism: `5` jobs per client.
- Server processing parallelism: `5` active jobs.
- Server queue cap: `100` total jobs (`pending + active`).
- Server memory budget: `100MB` reserved input bytes (`pendingBytes + activeBytes`).

## Server-Side Security Guards

- Input file signature is validated (magic bytes) before processing.
- Unsupported/invalid signatures are rejected (`INVALID_FILE_SIGNATURE`).
- Image dimensions are constrained (`8192x8192`, `40,000,000` pixels max).
- Conversion jobs have a processing timeout (`60s`, `PROCESSING_TIMEOUT`).

When server cannot accept new work:

- API returns `429` with `Retry-After` and one of:
  - `QUEUE_FULL`
  - `MEMORY_BUDGET_EXCEEDED`
- Client retries automatically with backoff instead of failing immediately.

## UI Behavior (Current)

- Upload panel no longer renders a file list; queue is shown in the queue section.
- Queue rows always show a progress track.
  - `processing`: indeterminate animated flow + `Processing...`
  - `pending`: `Waiting...`
  - `done`: `Completed`
  - `error`: `Failed`
- `Convert All` is colocated with `Clear All` in `ClearAllArea`.
- `Clear All` clears selected files, resets upload input, and aborts active conversion jobs.
- Server status text (queue/processing/memory) appears in `ClearAllArea` stats row.

## Queue and Preview Data Rules

- New upload selection replaces queue content shown to the user.
- Preview results persist across batches until `Clear All`.
- If a newly converted file has the same `file.name` as an existing preview item, the new result replaces the old one.

## Blob URL Strategy

- Queue thumbnails use cached object URLs keyed by file fingerprint.
- Preview converted images use cached object URLs keyed by file name with fingerprint refresh.
- Stale URLs are revoked when no longer active and on unmount.

## Naming Conventions

- Styled-components variables use `Styled` suffix.
- Type aliases use `Type` suffix.

## Download Naming Rules

- Downloaded files and ZIP entries keep the original file base name; the extension follows the converted format (`holiday.jpg` → `holiday.webp`, also inside ZIPs).
- Duplicate names inside a ZIP are suffixed ` (2)`, ` (3)`, ... so no entry overwrites another (`photo.jpg` + `photo.png` → `photo.webp` + `photo (2).webp`).
- `customPrefix`/`addTimestamp` only affect the downloaded ZIP archive name; they apply to entry names only when `preserveNames: false` is passed explicitly.
- Entry names are sanitized (directory parts and control characters removed); a blank base name becomes `image`.

## Important Architecture Constraint

- Queue state is in-memory and single-instance oriented.
- Multi-instance deployments would require shared queue/state (e.g., Redis) for consistent global behavior.
- Media jobs additionally depend on local temporary disk. Multi-instance media deployment requires object storage plus durable shared job state and a worker queue.