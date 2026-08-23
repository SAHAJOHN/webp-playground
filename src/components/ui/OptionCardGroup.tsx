"use client";

import React, { useId } from "react";
import styled from "styled-components";
import { theme } from "@/styles/theme";

export type OptionCardOptionType<ValueType extends string> = {
  value: ValueType;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type OptionCardGroupPropsType<ValueType extends string> = {
  label: string;
  name: string;
  value: ValueType;
  options: readonly OptionCardOptionType<ValueType>[];
  onValueChange: (value: ValueType) => void;
  variant: "compact" | "descriptive";
  disabled?: boolean;
  describedBy?: string;
  className?: string;
};

const OptionCardGroupStyled = styled.fieldset`
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;

  .option-group-label {
    display: block;
    margin: 0 0 ${theme.spacing[2]};
    padding: 0;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.medium};
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .option-grid {
    display: grid;
    grid-template-columns: repeat(var(--option-count), minmax(0, 1fr));
    gap: ${theme.spacing[2]};
  }

  .option-label {
    position: relative;
    min-width: 0;
  }

  .option-input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .option-card {
    min-height: 44px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    border: 1px solid ${theme.colors.control.border};
    border-radius: ${theme.radii.lg};
    background: ${theme.colors.control.surface};
    color: ${theme.colors.control.text};
    padding: ${theme.spacing[3]};
    cursor: pointer;
    transition: border-color ${theme.transitions.fast},
      background ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
  }

  &[data-variant="descriptive"] .option-card {
    min-height: 72px;
  }

  &[data-variant="compact"] .option-card {
    align-items: center;
    text-align: center;
    text-transform: uppercase;
  }

  .option-label:hover .option-card {
    border-color: ${theme.colors.control.borderStrong};
    background: ${theme.colors.control.surfaceHover};
  }

  .option-input:checked + .option-card {
    border-color: ${theme.colors.control.accent};
    background: ${theme.colors.control.surfaceSelected};
    box-shadow: inset 0 0 0 1px ${theme.colors.control.focusRing};
  }

  .option-input:focus-visible + .option-card {
    outline: 2px solid ${theme.colors.control.accent};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${theme.colors.control.focusRing};
  }

  .option-input:disabled + .option-card {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .option-label:has(.option-input:disabled):hover .option-card {
    border-color: ${theme.colors.control.border};
    background: ${theme.colors.control.surface};
  }

  .option-title {
    overflow: hidden;
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.semibold};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-description {
    color: ${theme.colors.control.textMuted};
    font-size: 11px;
    line-height: 1.35;
  }

  @media (max-width: 640px) {
    &[data-variant="compact"] .option-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .option-card {
      transition: none;
    }
  }
`;

export const OptionCardGroup = <ValueType extends string,>({
  label,
  name,
  value,
  options,
  onValueChange,
  variant,
  disabled = false,
  describedBy,
  className,
}: OptionCardGroupPropsType<ValueType>) => {
  const legendId = `option-group-${useId().replaceAll(":", "")}`;

  return (
    <OptionCardGroupStyled
      role="radiogroup"
      aria-labelledby={legendId}
      aria-describedby={describedBy}
      data-slot="option-card-group"
      data-variant={variant}
      className={className}
    >
      <legend className="option-group-label" id={legendId}>
        {label}
      </legend>
      <div
        className="option-grid"
        style={{ "--option-count": options.length } as React.CSSProperties}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          const isDisabled = disabled || option.disabled === true;

          return (
            <label className="option-label" key={option.value}>
              <input
                className="option-input"
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                aria-label={
                  option.description
                    ? `${option.label} ${option.description}`
                    : option.label
                }
                onChange={() => onValueChange(option.value)}
              />
              <span
                className="option-card"
                data-slot="option-card"
                data-selected={isSelected ? "true" : "false"}
              >
                <span className="option-title">{option.label}</span>
                {variant === "descriptive" && option.description ? (
                  <span
                    className="option-description"
                    data-slot="option-description"
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </OptionCardGroupStyled>
  );
};
