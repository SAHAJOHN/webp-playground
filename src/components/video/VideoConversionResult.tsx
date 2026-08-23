"use client";

import { AlertTriangle, Check, Download, Music2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import styled from "styled-components";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { VideoJobPublicType } from "@/types/video-conversion";
import { theme } from "@/styles/theme";

type VideoConversionResultPropsType = {
  file: File | null;
  previewUrl: string | null;
  job: VideoJobPublicType | null;
  error: Error | null;
  isBusy: boolean;
  onCancel: () => void;
  onReset: () => void;
};

const ResultStyled = styled.section.attrs({
  className: "video-result-scroll",
})`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: ${theme.spacing[6]};
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .result-card {
    flex: 0 0 auto;
    width: 100%;
    display: grid;
    gap: ${theme.spacing[5]};
    border: 1px solid ${theme.colors.border.default};
    border-radius: 24px;
    background: linear-gradient(145deg, #111114, ${theme.colors.bg.surface});
    box-shadow: ${theme.shadows.xl};
    padding: clamp(24px, 3vw, 40px);
  }

  .preview-frame {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.xl};
    background: #050506;
  }

  .preview-frame video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .preview-badge {
    position: absolute;
    top: ${theme.spacing[3]};
    left: ${theme.spacing[3]};
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: ${theme.radii.full};
    background: rgba(9, 9, 11, 0.78);
    backdrop-filter: blur(10px);
    color: ${theme.colors.text.secondary};
    font: 10px ${theme.fonts.mono};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    pointer-events: none;
  }

  .preview-badge::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: ${theme.radii.full};
    background: ${theme.colors.accent.primaryHover};
    box-shadow: 0 0 10px rgba(129, 140, 248, 0.8);
  }

  .file-heading {
    min-width: 0;
  }

  .file-heading h1,
  .file-heading h2 {
    overflow-wrap: anywhere;
  }

  .eyebrow {
    color: ${theme.colors.accent.primaryHover};
    font: 11px ${theme.fonts.mono};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1,
  h2 {
    color: ${theme.colors.text.primary};
    font-size: clamp(24px, 4vw, 38px);
    letter-spacing: -0.04em;
    line-height: 1.05;
    margin: 0;
  }

  .description {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.base};
    line-height: 1.65;
    margin: 0;
    max-width: 500px;
  }

  .signal-rail {
    width: 100%;
    height: 92px;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 ${theme.spacing[2]};
    border-block: 1px solid ${theme.colors.border.subtle};
    overflow: hidden;
  }

  .signal-bar {
    flex: 1 1 0;
    min-width: 0;
    height: var(--signal-height);
    border-radius: ${theme.radii.full};
    background: linear-gradient(
      to top,
      rgba(99, 102, 241, 0.24),
      ${theme.colors.accent.primaryHover}
    );
    opacity: 0.78;
  }

  .status-row,
  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.spacing[3]};
  }

  .status-label {
    color: ${theme.colors.text.primary};
    font-weight: ${theme.fontWeights.medium};
  }

  .status-value,
  .meta-row {
    color: ${theme.colors.text.muted};
    font: ${theme.fontSizes.xs} ${theme.fonts.mono};
  }

  progress {
    width: 100%;
    height: 8px;
    border: 0;
    border-radius: ${theme.radii.full};
    overflow: hidden;
    background: ${theme.colors.bg.elevated};
    transition: .3s ease-in-out;
  }

  progress::-webkit-progress-bar {
    background: ${theme.colors.bg.elevated};
  }

  progress::-webkit-progress-value {
    background: linear-gradient(
      90deg,
      ${theme.colors.accent.primary},
      ${theme.colors.accent.primaryHover}
    );
  }

  progress::-moz-progress-bar {
    background: ${theme.colors.accent.primary};
  }

  .progress-group {
    display: grid;
    gap: ${theme.spacing[2]};
  }

  .process-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${theme.spacing[2]};
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .process-step {
    min-width: 0;
    display: grid;
    gap: 5px;
    padding: ${theme.spacing[3]};
    border: 1px solid ${theme.colors.border.subtle};
    border-radius: ${theme.radii.lg};
    background: rgba(255, 255, 255, 0.018);
  }

  .process-step[data-state="active"] {
    border-color: rgba(129, 140, 248, 0.44);
    background: rgba(99, 102, 241, 0.1);
  }

  .process-step[data-state="complete"] {
    border-color: rgba(34, 197, 94, 0.24);
    background: rgba(34, 197, 94, 0.06);
  }

  .step-index {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: ${theme.radii.full};
    background: ${theme.colors.bg.elevated};
    color: ${theme.colors.text.muted};
    font: 10px ${theme.fonts.mono};
  }

  .process-step[data-state="active"] .step-index {
    background: ${theme.colors.accent.primary};
    color: white;
  }

  .process-step[data-state="complete"] .step-index {
    background: rgba(34, 197, 94, 0.18);
    color: #86efac;
  }

  .step-title {
    overflow: hidden;
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.semibold};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .step-detail {
    overflow: hidden;
    color: ${theme.colors.text.muted};
    font: 10px ${theme.fonts.mono};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preparing-progress:not([value]) {
    animation: preparing-pulse 1.25s ease-in-out infinite alternate;
  }

  @keyframes preparing-pulse {
    from {
      opacity: 0.45;
    }
    to {
      opacity: 1;
    }
  }

  .complete-mark,
  .error-mark {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: ${theme.radii.full};
  }

  .complete-mark {
    color: #86efac;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .error-mark {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .error-card {
    border-color: rgba(239, 68, 68, 0.28);
  }

  audio {
    width: 100%;
    accent-color: ${theme.colors.accent.primary};
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing[2]};
  }

  @media (max-width: 640px) {
    padding: ${theme.spacing[4]};

    .result-card {
      padding: ${theme.spacing[5]};
    }

    .process-list {
      grid-template-columns: 1fr;
    }
  }
`;

const SIGNAL_HEIGHTS = [
  24, 42, 30, 66, 48, 78, 38, 58, 84, 46, 70, 34, 62, 88, 52, 28, 64,
  44, 74, 36, 56, 82, 48, 68, 32, 60, 76, 42, 54, 72, 38, 50,
];

const SIGNAL_BAR_WIDTH = 8;
const SIGNAL_BAR_GAP = 5;

const getSignalBarCount = (width: number) => {
  if (!Number.isFinite(width) || width <= 0) return SIGNAL_HEIGHTS.length;

  return Math.max(
    1,
    Math.floor((width + SIGNAL_BAR_GAP) / (SIGNAL_BAR_WIDTH + SIGNAL_BAR_GAP))
  );
};

const getSignalHeights = (count: number) => {
  if (count === SIGNAL_HEIGHTS.length) return SIGNAL_HEIGHTS;
  if (count === 1) return [SIGNAL_HEIGHTS[Math.floor(SIGNAL_HEIGHTS.length / 2)]];

  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.round(
      (index * (SIGNAL_HEIGHTS.length - 1)) / (count - 1)
    );
    return SIGNAL_HEIGHTS[sourceIndex];
  });
};

const SignalRail = () => {
  const signalRailRef = useRef<HTMLDivElement>(null);
  const [signalBarCount, setSignalBarCount] = useState(SIGNAL_HEIGHTS.length);

  const updateSignalBarCount = useCallback(() => {
    const width = signalRailRef.current?.getBoundingClientRect().width ?? 0;
    setSignalBarCount(getSignalBarCount(width));
  }, []);

  useEffect(() => {
    const signalRail = signalRailRef.current;
    if (!signalRail) return;

    const initialMeasureId = window.setTimeout(updateSignalBarCount, 0);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateSignalBarCount);
      resizeObserver.observe(signalRail);

      return () => {
        window.clearTimeout(initialMeasureId);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateSignalBarCount);
    return () => {
      window.clearTimeout(initialMeasureId);
      window.removeEventListener("resize", updateSignalBarCount);
    };
  }, [updateSignalBarCount]);

  const signalHeights = useMemo(
    () => getSignalHeights(signalBarCount),
    [signalBarCount]
  );

  return (
    <div
      ref={signalRailRef}
      className="signal-rail"
      data-signal-count={signalHeights.length}
      aria-hidden="true"
    >
      {signalHeights.map((height, index) => (
        <span
          className="signal-bar"
          style={{ "--signal-height": `${height}%` } as CSSProperties}
          key={`${height}-${index}`}
        />
      ))}
    </div>
  );
};

const formatFileSize = (bytes?: number) => {
  if (bytes === undefined) return "—";
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
};

const outputFileName = (job: VideoJobPublicType) => {
  const dotIndex = job.fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? job.fileName.slice(0, dotIndex) : job.fileName;
  return `${baseName}.${job.outputFormat}`;
};

const statusCopy = (job: VideoJobPublicType) => {
  switch (job.status) {
    case "uploading":
      return "Streaming video to temporary disk";
    case "queued":
      return "Waiting for the audio encoder";
    case "processing":
      return "Extracting and compressing audio";
    case "cancelled":
      return "Conversion cancelled";
    default:
      return "Preparing conversion";
  }
};

type ProcessStepStateType = "pending" | "active" | "complete";

const processState = (
  step: "upload" | "convert" | "download",
  job: VideoJobPublicType | null
): ProcessStepStateType => {
  if (!job) return step === "upload" ? "active" : "pending";

  if (step === "upload") {
    return job.status === "uploading" ? "active" : "complete";
  }

  if (step === "convert") {
    if (job.status === "completed") return "complete";
    return job.status === "queued" || job.status === "processing"
      ? "active"
      : "pending";
  }

  return job.status === "completed" ? "active" : "pending";
};

const processDetail = (
  step: "upload" | "convert" | "download",
  job: VideoJobPublicType | null,
  isBusy: boolean
) => {
  if (step === "upload") {
    if (!job) return isBusy ? "Starting" : "Ready";
    if (job.status === "uploading") return `${Math.round(job.uploadProgress)}%`;
    return "Complete";
  }

  if (step === "convert") {
    if (!job) return "Next";
    if (job.status === "queued") return "Queued";
    if (job.status === "processing") {
      return `${Math.round(job.conversionProgress)}%`;
    }
    return job.status === "completed" ? "Complete" : "Next";
  }

  return job?.status === "completed" ? "Ready" : "After encoding";
};

const ConversionProcess = ({
  job,
  isBusy,
}: {
  job: VideoJobPublicType | null;
  isBusy: boolean;
}) => {
  const steps = [
    { key: "upload" as const, title: "Upload" },
    { key: "convert" as const, title: "Convert" },
    { key: "download" as const, title: "Download" },
  ];

  return (
    <ol className="process-list" aria-label="Conversion process">
      {steps.map((step, index) => {
        const state = processState(step.key, job);
        return (
          <li
            className="process-step"
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
            key={step.key}
          >
            <span className="step-index" aria-hidden="true">
              {state === "complete" ? <Check size={12} /> : index + 1}
            </span>
            <span className="step-title">{step.title}</span>
            <span className="step-detail">
              {processDetail(step.key, job, isBusy)}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export const VideoConversionResult = ({
  file,
  previewUrl,
  job,
  error,
  isBusy,
  onCancel,
  onReset,
}: VideoConversionResultPropsType) => {
  if (error) {
    return (
      <ResultStyled
        aria-label="Video preview and conversion status"
        tabIndex={0}
      >
        <div className="result-card error-card" role="alert">
          <div className="error-mark" aria-hidden="true">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="eyebrow">Conversion stopped</div>
            <h2>Audio could not be created</h2>
          </div>
          <p className="description">{error.message}</p>
          <div className="actions">
            <Button variant="primary" onClick={onReset}>
              Try again
            </Button>
          </div>
        </div>
      </ResultStyled>
    );
  }

  if (file && !job) {
    return (
      <ResultStyled
        aria-label="Video preview and conversion status"
        tabIndex={0}
      >
        <div className="result-card">
          <div className="file-heading">
            <div className="eyebrow">
              {isBusy ? "Creating conversion job" : "Selected video"}
            </div>
            <h2>{isBusy ? "Preparing secure upload" : "Ready to convert"}</h2>
          </div>
          <ConversionProcess job={null} isBusy={isBusy} />
          {previewUrl ? (
            <div className="preview-frame">
              <video
                key={previewUrl}
                controls
                playsInline
                preload="metadata"
                src={previewUrl}
                aria-label="Selected video preview"
              />
              <span className="preview-badge">
                {isBusy ? "Preparing" : "Local preview"}
              </span>
            </div>
          ) : null}
          <div className="meta-row">
            <span>{file.name}</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
          {isBusy ? (
            <div className="progress-group" aria-live="polite">
              <div className="status-row">
                <span className="status-label">Preparing upload</span>
                <span className="status-value">Connecting…</span>
              </div>
              <progress
                className="preparing-progress"
                aria-label="Preparing video upload"
              />
              <div className="actions">
                <Button variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="description">
              Review the preview, format and bitrate, then start the conversion.
              The video will stream to temporary disk in 16 MiB chunks.
            </p>
          )}
        </div>
      </ResultStyled>
    );
  }

  if (!job) {
    return (
      <ResultStyled
        aria-label="Video preview and conversion status"
        tabIndex={0}
      >
        <div className="result-card">
          <div className="eyebrow">Video → audio</div>
          <h1>Keep the sound. Lose the weight.</h1>
          <p className="description">
            Extract a lecture, interview or recording as lightweight audio.
            The original video never has to fit in server memory.
          </p>
          <SignalRail />
          <div className="meta-row">
            <span>16 MiB chunks</span>
            <span>8 GiB maximum</span>
            <span>MP3 / M4A</span>
          </div>
        </div>
      </ResultStyled>
    );
  }

  if (job.status === "completed" && job.downloadUrl) {
    return (
      <ResultStyled
        aria-label="Video preview and conversion status"
        tabIndex={0}
      >
        <div className="result-card">
          <div className="complete-mark" aria-hidden="true">
            <Check size={24} />
          </div>
          <div>
            <div className="eyebrow">Ready to listen</div>
            <h2>{outputFileName(job)}</h2>
          </div>
          <div className="meta-row">
            <span>{job.outputFormat.toUpperCase()}</span>
            <span>{job.bitrateKbps} kbps</span>
            <span>{formatFileSize(job.outputSize)}</span>
          </div>
          <ConversionProcess job={job} isBusy={isBusy} />
          <audio
            controls
            preload="metadata"
            src={job.downloadUrl}
            aria-label="Converted audio preview"
          />
          <div className="actions">
            <ButtonLink
              variant="primary"
              href={job.downloadUrl}
              download={outputFileName(job)}
            >
              <Download size={16} aria-hidden="true" />
              Download {job.outputFormat.toUpperCase()}
            </ButtonLink>
            <Button variant="secondary" onClick={onReset}>
              Convert another
            </Button>
          </div>
        </div>
      </ResultStyled>
    );
  }

  if (job.status === "cancelled") {
    return (
      <ResultStyled
        aria-label="Video preview and conversion status"
        tabIndex={0}
      >
        <div className="result-card">
          <div className="error-mark" aria-hidden="true">
            <X size={24} />
          </div>
          <h2>Conversion cancelled</h2>
          <Button variant="primary" onClick={onReset}>
            Start again
          </Button>
        </div>
      </ResultStyled>
    );
  }

  return (
    <ResultStyled
      aria-label="Video preview and conversion status"
      tabIndex={0}
    >
      <div className="result-card" aria-live="polite">
        <div className="complete-mark" aria-hidden="true">
          <Music2 size={24} />
        </div>
        <div>
          <div className="eyebrow">Job {job.id.slice(0, 8)}</div>
          <h2>{statusCopy(job)}</h2>
        </div>
        <ConversionProcess job={job} isBusy={isBusy} />
        <div className="progress-group">
          <div className="status-row">
            <span className="status-label">Upload</span>
            <span className="status-value">{Math.round(job.uploadProgress)}%</span>
          </div>
          <progress
            max={100}
            value={job.uploadProgress}
            aria-label="Video upload progress"
          />
        </div>
        <div className="progress-group">
          <div className="status-row">
            <span className="status-label">Audio conversion</span>
            <span className="status-value">
              {Math.round(job.conversionProgress)}%
            </span>
          </div>
          <progress
            max={100}
            value={job.conversionProgress}
            aria-label="Audio conversion progress"
          />
        </div>
        {file && previewUrl ? (
          <div className="preview-frame">
            <video
              key={previewUrl}
              controls
              playsInline
              preload="metadata"
              src={previewUrl}
              aria-label="Selected video preview"
            />
            <span className="preview-badge">Source video</span>
          </div>
        ) : null}
        <div className="actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </ResultStyled>
  );
};
