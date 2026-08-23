"use client";

import React from "react";
import styled from "styled-components";
import { FileArchive, HardDriveDownload } from "lucide-react";
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
`;

const StatsTextStyled = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text.secondary};
`;

const SavedTextStyled = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.accent.success};
  font-weight: ${theme.fontWeights.medium};
`;

const ButtonsRowStyled = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
`;

const DownloadAllButtonStyled = styled(Button)`
  flex: 1;
`;

interface DownloadAreaPropsType {
  filesReady: number;
  totalSaved: string;
  onDownloadAll: () => void;
  onDownloadIndividual?: () => void;
  isDownloading?: boolean;
}

export const DownloadArea: React.FC<DownloadAreaPropsType> = ({
  filesReady,
  totalSaved,
  onDownloadAll,
  onDownloadIndividual,
  isDownloading = false,
}) => {
  return (
    <ContainerStyled>
      <StatsRowStyled>
        <StatsTextStyled>{filesReady} files ready</StatsTextStyled>
        <SavedTextStyled>{totalSaved} saved</SavedTextStyled>
      </StatsRowStyled>
      <ButtonsRowStyled>
        <DownloadAllButtonStyled
          variant="primary"
          onClick={onDownloadAll}
          disabled={filesReady === 0 || isDownloading}
        >
          <FileArchive size={18} />
          {isDownloading ? "Downloading..." : "Download All as ZIP"}
        </DownloadAllButtonStyled>
        {onDownloadIndividual && (
          <Button
            variant="secondary"
            onClick={onDownloadIndividual}
            disabled={filesReady === 0 || isDownloading}
          >
            <HardDriveDownload size={16} />
            Individual
          </Button>
        )}
      </ButtonsRowStyled>
    </ContainerStyled>
  );
};

export default DownloadArea;
