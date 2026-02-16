"use client";

import styled from "styled-components";
import { Upload, Settings, History, BarChart3 } from "lucide-react";
import { theme } from "@/styles/theme";

const SidebarStyled = styled.aside<{ $collapsed: boolean }>`
  width: 64px;
  background: ${theme.colors.bg.surface};
  border-right: 1px solid ${theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing[4]} ${theme.spacing[2]};
  gap: ${theme.spacing[2]};
`;

const SidebarButton = styled.button<{ $active?: boolean }>`
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.lg};
  border: none;
  background: ${(props) =>
    props.$active ? theme.colors.bg.elevated : "transparent"};
  color: ${(props) =>
    props.$active ? theme.colors.text.primary : theme.colors.text.muted};
  cursor: pointer;
  transition: all ${theme.transitions.fast};
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${(props) => (props.$active ? "24px" : "0")};
    background: ${theme.colors.accent.primary};
    border-radius: 0 2px 2px 0;
    transition: height ${theme.transitions.fast};
  }

  &:hover {
    background: ${theme.colors.bg.elevated};
    color: ${theme.colors.text.primary};
  }
`;

interface MiniSidebarPropsType {
  activeTab?: "upload" | "settings" | "history" | "stats";
  onTabChange?: (tab: "upload" | "settings" | "history" | "stats") => void;
  collapsed?: boolean;
}

export const MiniSidebar: React.FC<MiniSidebarPropsType> = ({
  activeTab = "upload",
  onTabChange,
  collapsed = false,
}) => {
  const tabs = [
    { id: "upload" as const, icon: Upload, label: "Upload" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
    { id: "history" as const, icon: History, label: "History" },
    { id: "stats" as const, icon: BarChart3, label: "Statistics" },
  ];

  return (
    <SidebarStyled $collapsed={collapsed}>
      {tabs.map((tab) => (
        <SidebarButton
          key={tab.id}
          $active={activeTab === tab.id}
          onClick={() => onTabChange?.(tab.id)}
          title={tab.label}
          aria-label={tab.label}
        >
          <tab.icon size={20} />
        </SidebarButton>
      ))}
    </SidebarStyled>
  );
};

export default MiniSidebar;
