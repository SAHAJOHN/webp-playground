"use client";

import styled from "styled-components";
import { ImageIcon, Zap } from "lucide-react";
import { theme } from "@/styles/theme";

const HeaderStyled = styled.header`
  height: 56px;
  background: ${theme.colors.bg.base};
  border-bottom: 1px solid ${theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${theme.spacing[6]};
  position: sticky;
  top: 0;
  z-index: 50;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${theme.colors.accent.primary}40, transparent);
  }
`;

const LogoSectionStyled = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const LogoIconStyled = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.accent.primary};
`;

const LogoTextStyled = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text.primary};
  letter-spacing: -0.02em;
`;

const StatsBadgeStyled = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  padding: ${theme.spacing[2]} ${theme.spacing[4]};
  background: ${theme.colors.bg.surface};
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.radii.full};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text.secondary};

  svg {
    color: ${theme.colors.accent.success};
  }
`;

interface AppHeaderPropsType {
  filesProcessed?: number;
  totalSaved?: string;
}

export const AppHeader: React.FC<AppHeaderPropsType> = ({
  filesProcessed = 0,
  totalSaved = "0 KB",
}) => {
  return (
    <HeaderStyled>
      <LogoSectionStyled>
        <LogoIconStyled>
          <ImageIcon size={24} />
        </LogoIconStyled>
        <LogoTextStyled>WebP Converter</LogoTextStyled>
      </LogoSectionStyled>
      <StatsBadgeStyled>
        <Zap size={14} />
        {filesProcessed} files • {totalSaved} saved
      </StatsBadgeStyled>
    </HeaderStyled>
  );
};

export default AppHeader;
