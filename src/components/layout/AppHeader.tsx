"use client";

import Link from "next/link";
import styled from "styled-components";
import { ImageIcon, Video, Zap } from "lucide-react";
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

  @media (max-width: 700px) {
    padding: 0 ${theme.spacing[3]};
    gap: ${theme.spacing[2]};
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

  @media (max-width: 520px) {
    display: none;
  }
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

  @media (max-width: 700px) {
    display: none;
  }
`;

const ConverterNavigationStyled = styled.nav`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid ${theme.colors.border.default};
  border-radius: ${theme.radii.full};
  background: ${theme.colors.bg.surface};

  a {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: ${theme.radii.full};
    color: ${theme.colors.text.muted};
    padding: 0 ${theme.spacing[3]};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.medium};
    text-decoration: none;
    white-space: nowrap;
  }

  a[aria-current="page"] {
    color: ${theme.colors.text.primary};
    background: ${theme.colors.bg.elevated};
  }

  a:focus-visible {
    outline: 2px solid ${theme.colors.accent.primaryHover};
    outline-offset: 2px;
  }
`;

interface AppHeaderPropsType {
  filesProcessed?: number;
  totalSaved?: string;
  mode?: "image" | "video-audio";
  statusLabel?: string;
}

export const AppHeader: React.FC<AppHeaderPropsType> = ({
  filesProcessed = 0,
  totalSaved = "0 KB",
  mode = "image",
  statusLabel,
}) => {
  return (
    <HeaderStyled>
      <LogoSectionStyled>
        <LogoIconStyled>
          {mode === "image" ? <ImageIcon size={24} /> : <Video size={24} />}
        </LogoIconStyled>
        <LogoTextStyled>Media Forge</LogoTextStyled>
      </LogoSectionStyled>
      <ConverterNavigationStyled aria-label="Converters">
        <Link href="/" aria-current={mode === "image" ? "page" : undefined}>
          <ImageIcon size={14} aria-hidden="true" />
          Image
        </Link>
        <Link
          href="/video-to-audio"
          aria-current={mode === "video-audio" ? "page" : undefined}
        >
          <Video size={14} aria-hidden="true" />
          Video to audio
        </Link>
      </ConverterNavigationStyled>
      <StatsBadgeStyled>
        <Zap size={14} />
        {statusLabel || `${filesProcessed} files • ${totalSaved} saved`}
      </StatsBadgeStyled>
    </HeaderStyled>
  );
};

export default AppHeader;
