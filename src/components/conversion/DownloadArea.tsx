"use client";

import React from "react";
import styled from "styled-components";
import { FileArchive, HardDriveDownload } from "lucide-react";
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

const PrimaryButtonStyled = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  padding: ${theme.spacing[2]};
  background: ${theme.colors.accent.primary};
  color: white;
  border: none;
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.base};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: background ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.accent.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing[2]};
  padding: ${theme.spacing[4]} ${theme.spacing[5]};
  background: transparent;
  color: ${theme.colors.text.secondary};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.radii.lg};
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    border-color: ${theme.colors.border.strong};
    color: ${theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
        <PrimaryButtonStyled
          onClick={onDownloadAll}
          disabled={filesReady === 0 || isDownloading}
        >
          <FileArchive size={18} />
          {isDownloading ? "Downloading..." : "Download All as ZIP"}
        </PrimaryButtonStyled>
        {onDownloadIndividual && (
          <SecondaryButtonStyled
            onClick={onDownloadIndividual}
            disabled={filesReady === 0 || isDownloading}
          >
            <HardDriveDownload size={16} />
            Individual
          </SecondaryButtonStyled>
        )}
      </ButtonsRowStyled>
    </ContainerStyled>
  );
};

export default DownloadArea;
