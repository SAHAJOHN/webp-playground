"use client";

import React from "react";
import styled from "styled-components";
import { X, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { theme } from "@/styles/theme";

const QueueContainerStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const QueueHeaderStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[2]};
`;

const QueueTitleStyled = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const QueueCountStyled = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text.muted};
  background: ${theme.colors.bg.elevated};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.radii.full};
`;

const FileItemStyled = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  padding: ${theme.spacing[3]};
  background: ${theme.colors.bg.surface};
  border: 1px solid ${theme.colors.border.subtle};
  border-radius: ${theme.radii.lg};
  transition: all ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.border.default};
  }
`;

const ThumbnailStyled = styled.div`
  width: 52px;
  height: 52px;
  border-radius: ${theme.radii.md};
  background: ${theme.colors.bg.elevated};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FileInfoStyled = styled.div`
  flex: 1;
  min-width: 0;
  height: 46px;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const FileNameStyled = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileMetaStyled = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const StatusIndicatorStyled = styled.div<{ $status: "pending" | "processing" | "done" | "error" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: ${(props) => {
    switch (props.$status) {
      case "done": return theme.colors.accent.success;
      case "error": return theme.colors.accent.error;
      case "processing": return theme.colors.accent.primary;
      default: return theme.colors.text.muted;
    }
  }};

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  svg {
    animation: ${(props) =>
      props.$status === "processing" ? "spin 0.8s linear infinite" : "none"};
  }
`;

const RemoveButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-height: 24px;
  min-width: 24px;
  border: none;
  background: transparent;
  color: ${theme.colors.text.muted};
  cursor: pointer;
  border-radius: ${theme.radii.xl};
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.bg.elevated};
    color: ${theme.colors.accent.error};
  }
`;

const ProgressBarStyled = styled.div<{
  $progress: number;
  $indeterminate?: boolean;
  $status: FileStatusType;
}>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: ${(props) => (props.$indeterminate ? "100%" : `${props.$progress}%`)};
  background: ${(props) =>
    props.$indeterminate
      ? "transparent"
      : props.$status === "done"
      ? theme.colors.accent.success
      : props.$status === "error"
      ? theme.colors.accent.error
      : theme.colors.accent.primary};
  transition: width ${theme.transitions.normal};
  overflow: hidden;

  @keyframes indeterminateFlow {
    0% {
      left: -35%;
    }
    100% {
      left: 100%;
    }
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -35%;
    width: 35%;
    background: linear-gradient(
      90deg,
      ${theme.colors.accent.primary}00 0%,
      ${theme.colors.accent.primary} 45%,
      ${theme.colors.accent.primary}00 100%
    );
    opacity: ${(props) => (props.$indeterminate ? 1 : 0)};
    animation: ${(props) =>
      props.$indeterminate ? "indeterminateFlow 1s ease-in-out infinite" : "none"};
  }
`;

const ProgressContainerStyled = styled.div`
  position: relative;
  width: 100%;
  height: 2px;
  background: ${theme.colors.bg.elevated};
  border-radius: ${theme.radii.full};
  margin-top: ${theme.spacing[2]};
  overflow: hidden;
`;

export type FileStatusType = "pending" | "processing" | "done" | "error";

export interface FileQueueItemType {
  id: string;
  name: string;
  size: string;
  thumbnail?: string;
  status: FileStatusType;
  progress?: number;
}

interface FileQueuePropsType {
  files: FileQueueItemType[];
  onRemove?: (id: string) => void;
}

export const FileQueue: React.FC<FileQueuePropsType> = ({
  files,
  onRemove,
}) => {
  const getStatusIcon = (status: FileStatusType) => {
    switch (status) {
      case "done":
        return <CheckCircle size={18} />;
      case "error":
        return <AlertCircle size={18} />;
      case "processing":
        return <Loader2 size={18} />;
      case "pending":
        return <Clock size={18} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: FileStatusType) => {
    switch (status) {
      case "processing":
        return "Processing...";
      case "done":
        return "Completed";
      case "error":
        return "Failed";
      case "pending":
      default:
        return "Waiting...";
    }
  };

  const getProgressValue = (status: FileStatusType, progress?: number) => {
    if (status === "done") return 100;
    if (status === "error") return 100;
    if (status === "processing") return progress || 0;
    return 0;
  };

  return (
    <QueueContainerStyled>
      <QueueHeaderStyled>
        <QueueTitleStyled>Queue</QueueTitleStyled>
        <QueueCountStyled>{files.length} files in queue</QueueCountStyled>
      </QueueHeaderStyled>
      {files.map((file) => (
        <FileItemStyled key={file.id}>
          <ThumbnailStyled>
            {file.thumbnail && <img src={file.thumbnail} alt={file.name} />}
          </ThumbnailStyled>
          <FileInfoStyled>
            <FileNameStyled>{file.name}</FileNameStyled>
            <FileMetaStyled>
              <span>{file.size}</span>
              <span>{getStatusText(file.status)}</span>
            </FileMetaStyled>
            <ProgressContainerStyled>
              <ProgressBarStyled
                $progress={getProgressValue(file.status, file.progress)}
                $indeterminate={file.status === "processing"}
                $status={file.status}
              />
            </ProgressContainerStyled>
          </FileInfoStyled>
          <StatusIndicatorStyled $status={file.status}>
            {getStatusIcon(file.status)}
          </StatusIndicatorStyled>
          {onRemove && (
            <RemoveButtonStyled onClick={() => onRemove(file.id)}>
              <X size={20} />
            </RemoveButtonStyled>
          )}
        </FileItemStyled>
      ))}
    </QueueContainerStyled>
  );
};

export default FileQueue;
