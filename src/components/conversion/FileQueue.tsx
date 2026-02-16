"use client";

import React from "react";
import styled from "styled-components";
import { X, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { theme } from "@/styles/theme";

const QueueContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[2]};
`;

const QueueTitle = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const QueueCount = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text.muted};
  background: ${theme.colors.bg.elevated};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.radii.full};
`;

const FileItem = styled.div`
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

const Thumbnail = styled.div`
  width: 40px;
  height: 40px;
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

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileMeta = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text.muted};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const StatusIndicator = styled.div<{ $status: "pending" | "processing" | "done" | "error" }>`
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
`;

const RemoveButton = styled.button`
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

const ProgressBar = styled.div<{ $progress: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: ${theme.colors.accent.primary};
  width: ${(props) => props.$progress}%;
  transition: width ${theme.transitions.normal};
`;

const ProgressContainer = styled.div`
  position: relative;
  width: 100%;
  height: 2px;
  background: ${theme.colors.bg.elevated};
  border-radius: ${theme.radii.full};
  margin-top: ${theme.spacing[2]};
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

  return (
    <QueueContainer>
      <QueueHeader>
        <QueueTitle>Queue</QueueTitle>
        <QueueCount>{files.length} files</QueueCount>
      </QueueHeader>
      {files.map((file) => (
        <FileItem key={file.id}>
          <Thumbnail>
            {file.thumbnail && <img src={file.thumbnail} alt={file.name} />}
          </Thumbnail>
          <FileInfo>
            <FileName>{file.name}</FileName>
            <FileMeta>
              <span>{file.size}</span>
              {file.status === "processing" && file.progress !== undefined && (
                <span>{file.progress}%</span>
              )}
            </FileMeta>
            {file.status === "processing" && (
              <ProgressContainer>
                <ProgressBar $progress={file.progress || 0} />
              </ProgressContainer>
            )}
          </FileInfo>
          <StatusIndicator $status={file.status}>
            {getStatusIcon(file.status)}
          </StatusIndicator>
          {onRemove && (
            <RemoveButton onClick={() => onRemove(file.id)}>
              <X size={20} />
            </RemoveButton>
          )}
        </FileItem>
      ))}
    </QueueContainer>
  );
};

export default FileQueue;
