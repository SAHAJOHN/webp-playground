"use client";

import React from "react";
import styled from "styled-components";
import { Play, Trash2 } from "lucide-react";
import { theme } from "@/styles/theme";

const ContainerStyled = styled.div`
  background: ${theme.colors.bg.surface};
  border-top: 1px solid ${theme.colors.border.subtle};
  padding-top: ${theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const StatsRowStyled = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing[2]};

  > * {
    min-width: 0;
  }
`;

const QueueTextStyled = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text.muted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ClearButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  width: 100%;
  padding: ${theme.spacing[2]};
  background: ${theme.colors.accent.error};
  color: white;
  border: none;
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionsRowStyled = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing[2]};
`;

const ConvertButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  width: 100%;
  padding: ${theme.spacing[2]};
  background: ${theme.colors.accent.primary};
  color: white;
  border: none;
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ClearAllAreaPropsType {
  filesInQueue: number;
  onClearAll: () => void;
  onConvertAll: () => void;
  canConvert: boolean;
  isProcessing?: boolean;
  isClearing?: boolean;
  statusText?: string;
}

export const ClearAllArea: React.FC<ClearAllAreaPropsType> = ({
  filesInQueue,
  onClearAll,
  onConvertAll,
  canConvert,
  isProcessing = false,
  isClearing = false,
  statusText,
}) => {
  return (
    <ContainerStyled>
      <StatsRowStyled>
        <QueueTextStyled>{statusText || "Click to remove all"}</QueueTextStyled>
      </StatsRowStyled>
      <ActionsRowStyled>
        <ClearButtonStyled
          onClick={onClearAll}
          disabled={filesInQueue === 0 || isClearing}
        >
          <Trash2 size={18} />
          {isClearing ? "Clearing..." : "Clear All"}
        </ClearButtonStyled>
        <ConvertButtonStyled
            onClick={onConvertAll}
            disabled={!canConvert || isProcessing}
        >
          <Play size={18} />
          {isProcessing ? "Converting..." : "Convert All"}
        </ConvertButtonStyled>
      </ActionsRowStyled>
    </ContainerStyled>
  );
};

export default ClearAllArea;
