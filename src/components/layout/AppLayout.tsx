"use client";

import styled from "styled-components";
import { theme } from "@/styles/theme";

const LayoutStyled = styled.div`
  height: 100dvh;
  overflow: hidden;
  background: ${theme.colors.bg.base};
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const LeftPanel = styled.div`
  width: 40%;
  min-width: 360px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.bg.base};
  border-right: 1px solid ${theme.colors.border.subtle};
  overflow-y: auto;
  padding: ${theme.spacing[4]};
`;

const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.bg.base};
  overflow: hidden;
  padding: ${theme.spacing[4]};
`;

const PanelContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing[4]};
  background: ${theme.colors.bg.surface};
  border: 1px solid ${theme.colors.border.subtle};
  border-radius: ${theme.radii.xl};
`;

const FooterStyled = styled.footer`
  height: 40px;
  background: ${theme.colors.bg.base};
  border-top: 1px solid ${theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${theme.spacing[4]};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.text.muted};
`;

interface AppLayoutPropsType {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  footer?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutPropsType> = ({
  header,
  sidebar,
  leftPanel,
  rightPanel,
  footer,
}) => {
  return (
    <LayoutStyled>
      {header}
      <MainContent>
        {sidebar}
        <LeftPanel>
          <PanelContent>{leftPanel}</PanelContent>
        </LeftPanel>
        <RightPanel>
          <PanelContent>{rightPanel}</PanelContent>
        </RightPanel>
      </MainContent>
      {footer}
    </LayoutStyled>
  );
};

export default AppLayout;
