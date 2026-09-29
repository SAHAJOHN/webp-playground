"use client";

import React from "react";
import styled from "styled-components";
import { Download, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { theme } from "@/styles/theme";

const GridContainerStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${theme.spacing[4]};
`;

const PreviewCardStyled = styled.div<{ $status: "pending" | "processing" | "done" | "error" }>`
  aspect-ratio: 1;
  border-radius: ${theme.radii.xl};
  border: 1px solid ${theme.colors.border.subtle};
  background: ${theme.colors.bg.base};
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.border.default};
  }
`;

const PreviewImageStyled = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CardOverlayStyled = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);
  opacity: 0;
  transition: opacity ${theme.transitions.fast};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: ${theme.spacing[3]};

  ${PreviewCardStyled}:hover & {
    opacity: 1;
  }
`;

const OverlayContentStyled = styled.div`
  display: flex;
  flex-direction: column;
`;

const OverlayFileNameStyled = styled.span`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.medium};
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OverlayStatsStyled = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.accent.success};
  font-family: ${theme.fonts.mono};
`;

const StatusDotStyled = styled.div<{ $status: "pending" | "processing" | "done" | "error" }>`
  position: absolute;
  top: ${theme.spacing[3]};
  right: ${theme.spacing[3]};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${theme.colors.bg.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => {
    switch (props.$status) {
      case "done": return theme.colors.accent.success;
      case "error": return theme.colors.accent.error;
      case "processing": return theme.colors.accent.primary;
      default: return theme.colors.text.muted;
    }
  }};
`;

const DownloadBadgeStyled = styled.div`
  position: absolute;
  height: 36px;
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  bottom: ${theme.spacing[3]};
  right: ${theme.spacing[3]};
  background: ${theme.colors.accent.primary};
  color: white;
  padding: ${theme.spacing[2]};
  border-radius: ${theme.radii.md};
  opacity: 0;
  transition: opacity ${theme.transitions.fast};

  ${PreviewCardStyled}:hover & {
    opacity: 1;
  }
`;

const PlaceholderContentStyled = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  color: ${theme.colors.text.muted};
`;

const SpinningIconStyled = styled.div`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  animation: spin 1s linear infinite;
`;

export interface PreviewGridItemType {
  id: string;
  name: string;
  originalUrl: string;
  convertedUrl?: string;
  originalSize: string;
  convertedSize?: string;
  compressionRatio?: number;
  status: "pending" | "processing" | "done" | "error";
}

interface PreviewGridPropsType {
  items: PreviewGridItemType[];
  onItemClick?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export const PreviewGrid: React.FC<PreviewGridPropsType> = ({
  items,
  onItemClick,
  onDownload,
}) => {
  const getStatusIcon = (status: PreviewGridItemType["status"]) => {
    switch (status) {
      case "done":
        return <CheckCircle size={14} />;
      case "error":
        return <AlertCircle size={14} />;
      case "processing":
        return (
          <SpinningIconStyled>
            <Loader2 size={14} />
          </SpinningIconStyled>
        );
      case "pending":
        return <Clock size={14} />;
      default:
        return null;
    }
  };

  const formatCompression = (ratio?: number) => {
    if (ratio === undefined) return "";
    const sign = ratio > 0 ? "↓" : ratio < 0 ? "↑" : "→";
    return `${sign}${Math.abs(ratio).toFixed(1)}%`;
  };

  return (
    <GridContainerStyled>
      {items.map((item) => (
        <PreviewCardStyled
          key={item.id}
          $status={item.status}
          onClick={() => onItemClick?.(item.id)}
        >
          {item.convertedUrl ? (
            <PreviewImageStyled
              src={item.convertedUrl}
              alt={item.name}
            />
          ) : (
            <PlaceholderContentStyled>
              <SpinningIconStyled>
                <Loader2 size={24} />
              </SpinningIconStyled>
            </PlaceholderContentStyled>
          )}
          <StatusDotStyled $status={item.status}>
            {getStatusIcon(item.status)}
          </StatusDotStyled>
          {item.status === "done" && (
            <>
              <CardOverlayStyled>
                <OverlayContentStyled>
                  <OverlayFileNameStyled>{item.name}</OverlayFileNameStyled>
                  {item.compressionRatio !== undefined && (
                    <OverlayStatsStyled>
                      {formatCompression(item.compressionRatio)}
                    </OverlayStatsStyled>
                  )}
                </OverlayContentStyled>
              </CardOverlayStyled>
              <DownloadBadgeStyled onClick={(e) => {
                e.stopPropagation();
                onDownload?.(item.id);
              }}>
                <Download size={16} />
              </DownloadBadgeStyled>
            </>
          )}
        </PreviewCardStyled>
      ))}
    </GridContainerStyled>
  );
};

export default PreviewGrid;
