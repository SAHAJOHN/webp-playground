"use client";

import { useRef, useState } from "react";
import { FileVideo2, Upload } from "lucide-react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { validateCreateVideoJobInput } from "@/lib/video-conversion/validation";
import { SUPPORTED_VIDEO_EXTENSIONS } from "@/types/video-conversion";
import { theme } from "@/styles/theme";

type VideoFileUploadPropsType = {
  file: File | null;
  onFileSelected: (file: File) => void;
  disabled: boolean;
};

const VideoFileUploadStyled = styled.section<{ $dragActive: boolean }>`
  display: grid;
  gap: ${theme.spacing[3]};

  .drop-zone {
    min-height: 184px;
    border: 1px dashed
      ${({ $dragActive }) =>
        $dragActive ? theme.colors.accent.primaryHover : theme.colors.border.strong};
    border-radius: ${theme.radii.xl};
    background: ${({ $dragActive }) =>
      $dragActive ? "rgba(99, 102, 241, 0.1)" : theme.colors.bg.base};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing[3]};
    padding: ${theme.spacing[6]};
    text-align: center;
    transition: border-color ${theme.transitions.normal},
      background ${theme.transitions.normal};
  }

  .upload-mark {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: ${theme.radii.xl};
    color: ${theme.colors.accent.primaryHover};
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(129, 140, 248, 0.25);
  }

  .title {
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.semibold};
  }

  .hint {
    max-width: 280px;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.xs};
    line-height: 1.55;
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .selected-file {
    display: flex;
    align-items: center;
    gap: ${theme.spacing[3]};
    padding: ${theme.spacing[3]};
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.lg};
    background: ${theme.colors.bg.elevated};
  }

  .selected-file svg {
    color: ${theme.colors.accent.primaryHover};
    flex: 0 0 auto;
  }

  .file-copy {
    min-width: 0;
  }

  .file-name {
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: ${theme.colors.text.muted};
    font: ${theme.fontSizes.xs} ${theme.fonts.mono};
    margin-top: 2px;
  }

  .error {
    margin: 0;
    padding: ${theme.spacing[3]};
    border-radius: ${theme.radii.md};
    border: 1px solid rgba(239, 68, 68, 0.32);
    background: rgba(239, 68, 68, 0.08);
    color: #fca5a5;
    font-size: ${theme.fontSizes.xs};
    line-height: 1.5;
  }
`;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
};

export const VideoFileUpload = ({
  file,
  onFileSelected,
  disabled,
}: VideoFileUploadPropsType) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = SUPPORTED_VIDEO_EXTENSIONS.map(
    (extension) => `.${extension}`
  ).join(",");

  const selectFile = (nextFile: File | undefined) => {
    if (!nextFile) return;

    const validation = validateCreateVideoJobInput({
      fileName: nextFile.name,
      fileSize: nextFile.size,
      contentType: nextFile.type,
      outputFormat: "m4a",
      bitrateKbps: 64,
    });
    if (!validation.ok) {
      setError(validation.message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError(null);
    onFileSelected(nextFile);
  };

  return (
    <VideoFileUploadStyled $dragActive={dragActive}>
      <div
        className="drop-zone"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          if (!disabled) selectFile(event.dataTransfer.files[0]);
        }}
      >
        <div className="upload-mark" aria-hidden="true">
          <Upload size={24} />
        </div>
        <div>
          <div className="title">Drop a video here</div>
          <div className="hint">
            MOV, MP4, MKV, WebM and more. Files are streamed to disk in small
            chunks — up to 8 GiB each.
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <FileVideo2 size={16} aria-hidden="true" />
          Choose video
        </Button>
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept={accept}
          aria-label="Choose a video file"
          disabled={disabled}
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
      </div>

      {file ? (
        <div className="selected-file" aria-live="polite">
          <FileVideo2 size={20} aria-hidden="true" />
          <div className="file-copy">
            <div className="file-name">{file.name}</div>
            <div className="file-size">{formatFileSize(file.size)}</div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </VideoFileUploadStyled>
  );
};
