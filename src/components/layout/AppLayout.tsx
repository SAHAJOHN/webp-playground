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

const MainContentStyled = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const LeftPanelStyled = styled.div`
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

const RightPanelStyled = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.bg.base};
  overflow: hidden;
  padding: ${theme.spacing[4]};
`;

const PanelContentStyled = styled.div`
  position: relative;
  flex: 1;
  overflow-y: hidden;
  padding: ${theme.spacing[4]};
  background: ${theme.colors.bg.surface};
  border: 1px solid ${theme.colors.border.subtle};
  border-radius: ${theme.radii.xl};
`;

const ResponsiveLayoutStyled = styled.div`
  display: contents;

  @media (max-width: 900px) {
    ${MainContentStyled} {
      overflow-y: auto;
      flex-direction: column;
    }

    ${LeftPanelStyled},
    ${RightPanelStyled} {
      width: 100%;
      max-width: none;
      min-width: 0;
      overflow: visible;
    }

    ${LeftPanelStyled} {
      border-right: 0;
      border-bottom: 1px solid ${theme.colors.border.subtle};
    }

    ${PanelContentStyled} {
      min-height: 520px;
    }
  }
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
      <ResponsiveLayoutStyled>
        {header}
        <MainContentStyled>
          {sidebar}
          <LeftPanelStyled>
            <PanelContentStyled data-scroll-render-target="true">{leftPanel}</PanelContentStyled>
          </LeftPanelStyled>
          <RightPanelStyled>
            <PanelContentStyled data-scroll-render-target="true">{rightPanel}</PanelContentStyled>
          </RightPanelStyled>
        </MainContentStyled>
        {footer}
      </ResponsiveLayoutStyled>
    </LayoutStyled>
  );
};

export default AppLayout;
