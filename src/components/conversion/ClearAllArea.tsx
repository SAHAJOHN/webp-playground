"use client";

import React from "react";
import styled from "styled-components";
import { Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
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

const ActionButtonStyled = styled(Button)`
  width: 100%;
`;

const ActionsRowStyled = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${theme.spacing[2]};
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
        <ActionButtonStyled
          variant="danger"
          onClick={onClearAll}
          disabled={filesInQueue === 0 || isClearing}
        >
          <Trash2 size={18} />
          {isClearing ? "Clearing..." : "Clear All"}
        </ActionButtonStyled>
        <ActionButtonStyled
          variant="primary"
          onClick={onConvertAll}
          disabled={!canConvert || isProcessing}
        >
          <Play size={18} />
          {isProcessing ? "Converting..." : "Convert All"}
        </ActionButtonStyled>
      </ActionsRowStyled>
    </ContainerStyled>
  );
};

export default ClearAllArea;
