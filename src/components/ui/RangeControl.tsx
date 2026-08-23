"use client";

import React from "react";
import styled from "styled-components";
import { ControlField } from "@/components/ui/ControlField";
import { theme } from "@/styles/theme";

export type RangeControlPropsType = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: React.ReactNode;
  valueText?: React.ReactNode;
  helperText?: React.ReactNode;
};

const RangeInputStyled = styled.input`
  --range-progress: 0%;
  width: 100%;
  height: 6px;
  border-radius: ${theme.radii.full};
  appearance: none;
  background: linear-gradient(
    to right,
    ${theme.colors.control.accent} 0%,
    ${theme.colors.control.accent} var(--range-progress),
    ${theme.colors.bg.elevated} var(--range-progress),
    ${theme.colors.bg.elevated} 100%
  );
  cursor: pointer;
  outline: none;

  &::-webkit-slider-thumb {
    width: 18px;
    height: 18px;
    border: 2px solid ${theme.colors.control.accent};
    border-radius: ${theme.radii.full};
    appearance: none;
    background: ${theme.colors.control.text};
    box-shadow: ${theme.shadows.md};
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border: 2px solid ${theme.colors.control.accent};
    border-radius: ${theme.radii.full};
    background: ${theme.colors.control.text};
    box-shadow: ${theme.shadows.md};
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.control.accent};
    outline-offset: 4px;
    box-shadow: 0 0 0 6px ${theme.colors.control.focusRing};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

const percentageFor = (
  value: React.InputHTMLAttributes<HTMLInputElement>["value"],
  min: React.InputHTMLAttributes<HTMLInputElement>["min"],
  max: React.InputHTMLAttributes<HTMLInputElement>["max"]
) => {
  const numericValue = Number(value ?? min ?? 0);
  const numericMin = Number(min ?? 0);
  const numericMax = Number(max ?? 100);
  if (!Number.isFinite(numericValue) || numericMax <= numericMin) return 0;
  return Math.min(
    100,
    Math.max(0, ((numericValue - numericMin) / (numericMax - numericMin)) * 100)
  );
};

export const RangeControl = ({
  label,
  valueText,
  helperText,
  id,
  className,
  style,
  value,
  min,
  max,
  "aria-describedby": ariaDescribedBy,
  "aria-valuetext": ariaValueText,
  ...props
}: RangeControlPropsType) => {
  const percentage = percentageFor(value, min, max);

  return (
    <ControlField
      id={id}
      label={label}
      value={valueText}
      helperText={helperText}
      className={className}
    >
      {({ controlId, describedBy }) => (
        <RangeInputStyled
          {...props}
          id={controlId}
          type="range"
          value={value}
          min={min}
          max={max}
          aria-describedby={
            [describedBy, ariaDescribedBy].filter(Boolean).join(" ") || undefined
          }
          aria-valuetext={
            ariaValueText ??
            (typeof valueText === "string" ? valueText : undefined)
          }
          style={
            {
              ...style,
              "--range-progress": `${percentage}%`,
            } as React.CSSProperties
          }
        />
      )}
    </ControlField>
  );
};
