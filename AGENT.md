# AGENT.md

This file documents the current behavior and constraints of the app so coding agents can stay aligned with runtime reality.

## Current Runtime Model

- Conversion is server-side via `POST /api/convert` using Sharp.
- Response body is binary image data (e.g. `image/webp`, `image/jpeg`) plus metadata headers.
- Server status is streamed via SSE on `GET /api/convert` (`Accept: text/event-stream`).

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

## Important Architecture Constraint

- Queue state is in-memory and single-instance oriented.
- Multi-instance deployments would require shared queue/state (e.g., Redis) for consistent global behavior.
