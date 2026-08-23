"use client";

import React, { useId } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";

export type ControlFieldRenderPropsType = {
  controlId: string;
  describedBy: string | undefined;
};

export type ControlFieldPropsType = {
  id?: string;
  label: React.ReactNode;
  value?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  children: (props: ControlFieldRenderPropsType) => React.ReactNode;
  className?: string;
};

const ControlFieldStyled = styled.div`
  display: grid;
  gap: ${theme.spacing[2]};

  .control-field-header {
    min-width: 0;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${theme.spacing[3]};
  }

  .control-field-label {
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.medium};
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .control-field-value {
    min-width: 0;
    overflow: hidden;
    color: ${theme.colors.control.text};
    font: ${theme.fontSizes.xs} ${theme.fonts.mono};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .control-field-helper,
  .control-field-error {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
  }

  .control-field-helper {
    color: ${theme.colors.control.textMuted};
  }

  .control-field-error {
    color: #fca5a5;
  }
`;

export const ControlField = ({
  id,
  label,
  value,
  helperText,
  error,
  children,
  className,
}: ControlFieldPropsType) => {
  const reactId = useId().replaceAll(":", "");
  const controlId = id ?? `control-${reactId}`;
  const helperId = helperText ? `${controlId}-helper` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <ControlFieldStyled className={className}>
      <div className="control-field-header">
        <label className="control-field-label" htmlFor={controlId}>
          {label}
        </label>
        {value !== undefined ? (
          <span className="control-field-value">{value}</span>
        ) : null}
      </div>
      {children({ controlId, describedBy })}
      {helperText ? (
        <p className="control-field-helper" id={helperId}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p className="control-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </ControlFieldStyled>
  );
};
