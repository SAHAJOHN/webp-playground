"use client";

import React from "react";
import styled from "styled-components";
import { Trash2 } from "lucide-react";
import { theme } from "@/styles/theme";

const Container = styled.div`
  background: ${theme.colors.bg.surface};
  border-top: 1px solid ${theme.colors.border.subtle};
  padding-top: ${theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StatsText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text.secondary};
`;

const QueueText = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text.muted};
`;

const ClearButton = styled.button`
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

interface ClearAllAreaPropsType {
  filesInQueue: number;
  onClearAll: () => void;
  isClearing?: boolean;
}

export const ClearAllArea: React.FC<ClearAllAreaPropsType> = ({
  filesInQueue,
  onClearAll,
  isClearing = false,
}) => {
  return (
    <Container>
      <StatsRow>
        <StatsText>{filesInQueue} files in queue</StatsText>
        <QueueText>Click to remove all</QueueText>
      </StatsRow>
      <ClearButton
        onClick={onClearAll}
        disabled={filesInQueue === 0 || isClearing}
      >
        <Trash2 size={18} />
        {isClearing ? "Clearing..." : "Clear All"}
      </ClearButton>
    </Container>
  );
};

export default ClearAllArea;
