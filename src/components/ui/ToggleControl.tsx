"use client";

import React from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { theme } from "@/styles/theme";

export type ToggleControlPropsType = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-pressed"
> & {
  pressed: boolean;
};

const ToggleButtonStyled = styled(Button)<{ $pressed: boolean }>`
  ${({ $pressed }) =>
    $pressed
      ? `
    border-color: ${theme.colors.control.accent};
    background: ${theme.colors.control.surfaceSelected};
    color: ${theme.colors.control.text};
    box-shadow: inset 0 0 0 1px ${theme.colors.control.focusRing};
  `
      : ""}
`;

export const ToggleControl = ({
  pressed,
  ...props
}: ToggleControlPropsType) => (
  <ToggleButtonStyled
    variant="secondary"
    $pressed={pressed}
    aria-pressed={pressed}
    data-pressed={pressed ? "true" : "false"}
    {...props}
  />
);
