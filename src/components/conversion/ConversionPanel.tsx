"use client";

import React, { useCallback, useMemo, useRef } from "react";
import styled from "styled-components";
import { Settings, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { ConversionPanelPropsType } from "@/types/components";
import { SupportedFormatType } from "@/types/conversion";
import {
  useAccessibility,
  useKeyboardNavigation,
} from "@/hooks/ui/useAccessibility";

const ConversionPanelStyled = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isProcessing"].includes(prop),
})<{ isProcessing: boolean }>`
  .settings-panel {
    opacity: ${(props) => (props.isProcessing ? 0.6 : 1)};
    pointer-events: ${(props) => (props.isProcessing ? "none" : "auto")};
    transition: opacity 0.3s ease;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-weight: 600;
    font-size: 1.125rem;
    color: #1f2937;
  }

  .format-selection {
    margin-bottom: 1.5rem;
  }

  .format-label {
    display: block;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .format-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 0.5rem;
  }

  .format-button {
    padding: 0.5rem 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    color: #6b7280;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .format-button:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .format-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .format-button.active {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .format-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .format-button[data-accessibility-mode="high-contrast"] {
    border-width: 3px;
    background-color: #ffffff;
    color: #000000;
  }

  .format-button[data-accessibility-mode="high-contrast"].active {
    background-color: #000080;
    color: #ffffff;
    border-color: #ffffff;
  }

  .format-button[data-accessibility-mode="high-contrast"]:focus {
    outline: 3px solid #ffff00;
    outline-offset: 2px;
  }

  .settings-group {
    margin-bottom: 1.5rem;
  }

  .settings-group:last-child {
    margin-bottom: 0;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .setting-value {
    font-size: 0.75rem;
    color: #6b7280;
    font-family: monospace;
  }

  .slider-container {
    position: relative;
  }

  .quality-slider {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
    appearance: none;
    cursor: pointer;
  }

  .quality-slider:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 4px;
  }

  .quality-slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .quality-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .quality-slider[data-accessibility-mode="high-contrast"] {
    height: 8px;
    background: #000000;
    border: 2px solid #ffffff;
  }

  .quality-slider[data-accessibility-mode="high-contrast"]::-webkit-slider-thumb {
    background: #ffff00;
    border: 2px solid #000000;
    width: 24px;
    height: 24px;
  }

  .quality-slider[data-accessibility-mode="high-contrast"]::-moz-range-thumb {
    background: #ffff00;
    border: 2px solid #000000;
    width: 24px;
    height: 24px;
  }

  .slider-track {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(
      to right,
      #3b82f6 0%,
      #3b82f6 var(--progress, 0%),
      #e5e7eb var(--progress, 0%),
      #e5e7eb 100%
    );
    border-radius: 3px;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    color: #6b7280;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-button:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .toggle-button.active {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .compression-select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .compression-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .format-info {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
  }

  .sr-only {
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

  @media (max-width: 640px) {
    .settings-panel {
      padding: 1rem;
    }

    .format-grid {
      grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
      gap: 0.375rem;
    }

    .format-button {
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
    }
  }
`;

const ConversionPanel: React.FC<ConversionPanelPropsType> = ({
  settings,
  onSettingsChange,
  isProcessing,
  disabled = false,
  className = "",
}) => {
  const supportedFormats: SupportedFormatType[] = [
    "jpeg",
    "png",
    "webp",
    "avif",
    "gif",
    "ico",
  ];

  const {
    accessibilityMode,
    announce,
    isReducedMotion,
  } = useAccessibility({
    announceChanges: true,
  });

  const formatGridRef = useRef<HTMLDivElement>(null);

  // Get format button elements for keyboard navigation
  const getFormatButtonElements = (): HTMLElement[] => {
    if (!formatGridRef.current) return [];
    return Array.from(
      formatGridRef.current.querySelectorAll('button[role="radio"]')
    ) as HTMLElement[];
  };

  const { onKeyDown } = useKeyboardNavigation(
    getFormatButtonElements(),
    "horizontal"
  );

  const formatInfo = useMemo(() => {
    const info: Record<SupportedFormatType, string> = {
      jpeg: "Lossy compression, best for photos. Supports quality control and progressive encoding.",
      png: "Lossless compression, best for graphics with transparency. Supports compression levels 0-9.",
      webp: "Modern format with excellent compression. Supports both lossy and lossless modes.",
      avif: "Next-gen format with superior compression. Supports quality and speed settings.",
      gif: "Legacy format for simple animations. Limited to 256 colors with optional dithering.",
      ico: "Windows icon format. Supports multiple sizes in a single file.",
      svg: "Vector format, no conversion settings needed.",
    };
    return info[settings.format] || "";
  }, [settings.format]);

  const handleFormatChange = useCallback(
    (format: SupportedFormatType) => {
      const newSettings = { ...settings, format };

      // Reset format-specific settings when changing format
      if (format === "png") {
        newSettings.compressionLevel = newSettings.compressionLevel ?? 6;
        // Set format-specific quality for PNG
        newSettings.quality = 100; // PNG doesn't use quality
        newSettings.lossless = undefined;
      } else if (format === "webp") {
        newSettings.quality = newSettings.quality ?? 80;
        newSettings.lossless = newSettings.lossless ?? false;
        newSettings.compressionLevel = undefined;
      } else if (format === "jpeg") {
        newSettings.quality = newSettings.quality ?? 85;
        newSettings.progressive = newSettings.progressive ?? false;
        newSettings.compressionLevel = undefined;
        newSettings.lossless = undefined;
      } else if (format === "avif") {
        newSettings.quality = newSettings.quality ?? 75;
        newSettings.speed = newSettings.speed ?? 6;
        newSettings.compressionLevel = undefined;
        newSettings.lossless = undefined;
      } else if (format === "gif") {
        newSettings.colors = newSettings.colors ?? 256;
        newSettings.dithering = newSettings.dithering ?? false;
        newSettings.quality = 100; // GIF doesn't use quality
        newSettings.compressionLevel = undefined;
        newSettings.lossless = undefined;
      } else if (format === "ico") {
        newSettings.sizes = newSettings.sizes ?? [16, 32, 48];
        newSettings.quality = 100; // ICO doesn't use quality
        newSettings.compressionLevel = undefined;
        newSettings.lossless = undefined;
      }

      onSettingsChange(newSettings);

      // Announce format change
      announce({
        message: `Output format changed to ${format.toUpperCase()}`,
        priority: "polite",
      });
    },
    [settings, onSettingsChange, announce]
  );

  const handleQualityChange = useCallback(
    (quality: number) => {
      onSettingsChange({ ...settings, quality });

      // Announce quality change (debounced to avoid too many announcements)
      if (!isReducedMotion) {
        announce({
          message: `Quality set to ${quality}%`,
          priority: "polite",
          delay: 500,
        });
      }
    },
    [settings, onSettingsChange, announce, isReducedMotion]
  );

  const handleCompressionChange = useCallback(
    (compressionLevel: number) => {
      onSettingsChange({ ...settings, compressionLevel });
    },
    [settings, onSettingsChange]
  );

  const handleProgressiveToggle = useCallback(() => {
    onSettingsChange({ ...settings, progressive: !settings.progressive });
  }, [settings, onSettingsChange]);

  const renderQualitySlider = () => {
    if (!["jpeg", "webp", "avif"].includes(settings.format)) return null;

    const quality = settings.quality ?? 80;
    const progressPercent = quality;
    
    // Disable quality slider for WebP in lossless mode
    const isQualityDisabled = settings.format === "webp" && settings.lossless;

    return (
      <div className="setting-item">
        <div className="setting-label">
          <label htmlFor={`quality-slider-${settings.format}`}>
            Quality {isQualityDisabled && "(N/A in lossless mode)"}
          </label>
          <span className="setting-value" aria-live="polite">
            {isQualityDisabled ? "—" : `${quality}%`}
          </span>
        </div>
        <div className="slider-container">
          <input
            id={`quality-slider-${settings.format}`}
            type="range"
            min="1"
            max="100"
            value={quality}
            onChange={(e) => handleQualityChange(Number(e.target.value))}
            className="quality-slider"
            data-accessibility-mode={accessibilityMode}
            disabled={disabled || isProcessing || isQualityDisabled}
            aria-label={`Quality setting for ${settings.format.toUpperCase()} format${isQualityDisabled ? " (disabled in lossless mode)" : ""}`}
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={quality}
            aria-valuetext={isQualityDisabled ? "Not applicable in lossless mode" : `${quality} percent`}
            style={isQualityDisabled ? { opacity: 0.5 } : undefined}
          />
          <div
            className="slider-track"
            style={
              { 
                "--progress": `${progressPercent}%`,
                opacity: isQualityDisabled ? 0.5 : 1 
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    );
  };

  const renderCompressionLevel = () => {
    if (settings.format !== "png") return null;

    const compressionLevel = settings.compressionLevel ?? 6;

    return (
      <div className="setting-item">
        <div className="setting-label">
          <span>Compression Level</span>
          <span className="setting-value">{compressionLevel}</span>
        </div>
        <select
          value={compressionLevel}
          onChange={(e) => handleCompressionChange(Number(e.target.value))}
          className="compression-select"
          disabled={disabled || isProcessing}
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>
              Level {i}{" "}
              {i === 0
                ? "(No compression)"
                : i === 9
                ? "(Max compression)"
                : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderWebPOptions = () => {
    if (settings.format !== "webp") return null;

    return (
      <div className="setting-item">
        <div className="setting-label">
          <span>Compression Mode</span>
        </div>
        <div className="toggle-container">
          <button
            type="button"
            className={`toggle-button ${!settings.lossless ? "active" : ""}`}
            onClick={() => onSettingsChange({ ...settings, lossless: false })}
            disabled={disabled || isProcessing}
          >
            {!settings.lossless ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            Lossy
          </button>
          <button
            type="button"
            className={`toggle-button ${settings.lossless ? "active" : ""}`}
            onClick={() => onSettingsChange({ ...settings, lossless: true })}
            disabled={disabled || isProcessing}
          >
            {settings.lossless ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            Lossless
          </button>
        </div>
      </div>
    );
  };

  const renderJPEGOptions = () => {
    if (settings.format !== "jpeg") return null;

    return (
      <div className="setting-item">
        <div className="setting-label">
          <span>Progressive JPEG</span>
        </div>
        <button
          type="button"
          className={`toggle-button ${settings.progressive ? "active" : ""}`}
          onClick={handleProgressiveToggle}
          disabled={disabled || isProcessing}
        >
          {settings.progressive ? (
            <ToggleRight size={16} />
          ) : (
            <ToggleLeft size={16} />
          )}
          {settings.progressive ? "Enabled" : "Disabled"}
        </button>
      </div>
    );
  };

  return (
    <ConversionPanelStyled isProcessing={isProcessing} className={className}>
      <div className="settings-panel">
        <div className="panel-header">
          <Settings size={20} />
          Conversion Settings
        </div>

        <div className="format-selection">
          <label className="format-label" id="format-selection-label">
            Output Format
          </label>
          <div
            ref={formatGridRef}
            className="format-grid"
            role="radiogroup"
            aria-labelledby="format-selection-label"
            aria-describedby="format-description"
            onKeyDown={onKeyDown}
          >
            {supportedFormats.map((format) => (
              <button
                key={format}
                type="button"
                role="radio"
                className={`format-button ${
                  settings.format === format ? "active" : ""
                }`}
                data-accessibility-mode={accessibilityMode}
                aria-checked={settings.format === format}
                aria-label={`Select ${format.toUpperCase()} format`}
                tabIndex={settings.format === format ? 0 : -1}
                onClick={() => handleFormatChange(format)}
                disabled={disabled || isProcessing}
              >
                {format}
              </button>
            ))}
          </div>
          <div id="format-description" className="sr-only">
            Use arrow keys to navigate between format options. Press Enter or
            Space to select.
          </div>
        </div>

        <div className="settings-group">
          {renderQualitySlider()}
          {renderCompressionLevel()}
          {renderWebPOptions()}
          {renderJPEGOptions()}
        </div>

        {formatInfo && (
          <div className="format-info">
            <Sliders
              size={14}
              style={{ display: "inline", marginRight: "0.5rem" }}
            />
            {formatInfo}
          </div>
        )}
      </div>
    </ConversionPanelStyled>
  );
};

export default ConversionPanel;
