"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import styled from "styled-components";
import { Settings, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { ConversionPanelPropsType } from "@/types/components";
import { SupportedFormatType } from "@/types/conversion";
import {
  useAccessibility,
  useKeyboardNavigation,
} from "@/hooks/ui/useAccessibility";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { theme } from "@/styles/theme";

const ConversionPanelStyled = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isProcessing"].includes(prop),
})<{ isProcessing: boolean }>`
  .settings-panel {
    opacity: ${(props) => (props.isProcessing ? 0.5 : 1)};
    pointer-events: ${(props) => (props.isProcessing ? "none" : "auto")};
    transition: all ${theme.transitions.normal};
  }

  .format-selection {
    margin-bottom: ${theme.spacing[4]};
  }

  .format-label {
    display: block;
    font-weight: ${theme.fontWeights.medium};
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.text.secondary};
    margin-bottom: ${theme.spacing[3]};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .format-grid {
    display: flex;
    gap: ${theme.spacing[2]};
  }

  .format-button {
    flex: 1;
    padding: ${theme.spacing[3]} ${theme.spacing[2]};
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.lg};
    background: ${theme.colors.bg.surface};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    text-transform: uppercase;
    cursor: pointer;
    transition: all ${theme.transitions.fast};

    &:hover {
      border-color: ${theme.colors.border.strong};
      color: ${theme.colors.text.primary};
    }

    &.active {
      border-color: ${theme.colors.accent.primary};
      background: ${theme.colors.accent.primary};
      color: white;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .settings-group {
    margin-bottom: ${theme.spacing[4]};
  }

  .setting-item {
    margin-bottom: ${theme.spacing[4]};
  }

  .setting-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: ${theme.fontWeights.medium};
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.text.primary};
    margin-bottom: ${theme.spacing[2]};
  }

  .setting-value {
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.accent.primary};
    font-family: ${theme.fonts.mono};
  }

  .quality-slider {
    width: 100%;
    height: 6px;
    border-radius: ${theme.radii.full};
    background: ${theme.colors.bg.elevated};
    appearance: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: 2px solid ${theme.colors.accent.primary};
      box-shadow: ${theme.shadows.md};
    }

    &::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: 2px solid ${theme.colors.accent.primary};
      box-shadow: ${theme.shadows.md};
    }
  }

  .preset-buttons {
    display: flex;
    gap: ${theme.spacing[2]};
    margin-top: ${theme.spacing[3]};
  }

  .preset-button {
    flex: 1;
    padding: ${theme.spacing[3]} ${theme.spacing[4]};
    font-size: ${theme.fontSizes.xs};
    font-weight: ${theme.fontWeights.medium};
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.md};
    background: ${theme.colors.bg.surface};
    color: ${theme.colors.text.secondary};
    cursor: pointer;
    transition: all ${theme.transitions.fast};

    &:hover:not(:disabled) {
      border-color: ${theme.colors.border.strong};
      color: ${theme.colors.text.primary};
    }

    &.active {
      border-color: ${theme.colors.accent.primary};
      background: ${theme.colors.bg.elevated};
      color: ${theme.colors.text.primary};
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .toggle-container {
    display: flex;
    gap: ${theme.spacing[2]};
  }

  .toggle-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${theme.spacing[2]};
    padding: ${theme.spacing[3]} ${theme.spacing[4]};
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.lg};
    background: ${theme.colors.bg.surface};
    color: ${theme.colors.text.secondary};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${theme.transitions.fast};

    &:hover {
      border-color: ${theme.colors.border.strong};
      color: ${theme.colors.text.primary};
    }

    &.active {
      border-color: ${theme.colors.accent.primary};
      background: ${theme.colors.bg.elevated};
      color: ${theme.colors.text.primary};
    }
  }

  .compression-select {
    width: 100%;
    padding: ${theme.spacing[3]} ${theme.spacing[4]};
    border: 1px solid ${theme.colors.border.default};
    border-radius: ${theme.radii.lg};
    background: ${theme.colors.bg.surface};
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.sm};
    font-weight: ${theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${theme.transitions.fast};

    &:hover {
      border-color: ${theme.colors.border.strong};
    }

    &:focus {
      border-color: ${theme.colors.accent.primary};
      outline: none;
    }
  }

  .format-info {
    margin-top: ${theme.spacing[4]};
    padding: ${theme.spacing[3]};
    background: ${theme.colors.bg.elevated};
    border-radius: ${theme.radii.lg};
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.text.muted};
    line-height: 1.5;
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
        newSettings.interlace = newSettings.interlace ?? true;
      } else if (format === "webp") {
        newSettings.quality = newSettings.quality ?? 80;
        newSettings.lossless = newSettings.lossless ?? false;
        newSettings.compressionLevel = undefined;
      } else if (format === "jpeg") {
        newSettings.quality = newSettings.quality ?? 85;
        newSettings.progressive = newSettings.progressive ?? true;
        newSettings.compressionLevel = undefined;
        newSettings.lossless = undefined;
      } else if (format === "avif") {
        newSettings.quality = newSettings.quality ?? 75;
        newSettings.speed = newSettings.speed ?? 6;
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

    // Disable quality slider for lossless modes
    const isQualityDisabled =
      (settings.format === "webp" && settings.lossless) ||
      (settings.format === "avif" && settings.lossless);

    return (
      <div className="setting-item">
        <div className="setting-label">
          <span>Quality {isQualityDisabled && "(N/A in lossless mode)"}</span>
          <span className="setting-value">
            {isQualityDisabled ? "—" : `${quality}%`}
          </span>
        </div>
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
        />
        <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
          {isQualityDisabled
            ? "Quality setting is not applicable in lossless mode"
            : "Higher quality = larger file size"}
        </p>
      </div>
    );
  };

  const renderPNGOptions = () => {
    if (settings.format !== "png") return null;

    const compressionLevel = settings.compressionLevel ?? 6;

    return (
      <>
        <div className="setting-item">
          <div className="setting-label">
            <span>Compression Level</span>
            <span className="setting-value">{compressionLevel}</span>
          </div>
          <Select
            value={compressionLevel.toString()}
            onValueChange={(value) => handleCompressionChange(Number(value))}
            disabled={disabled || isProcessing}
          >
            <SelectTrigger className="compression-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  Level {i}{" "}
                  {i === 0
                    ? "(Fastest)"
                    : i === 9
                    ? "(Best compression)"
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span>Interlacing (Adam7)</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              {settings.interlace ? "Progressive display" : "Sequential"}
            </span>
          </div>
          <button
            type="button"
            className={`toggle-button ${settings.interlace ? "active" : ""}`}
            onClick={() => onSettingsChange({ ...settings, interlace: !settings.interlace })}
            disabled={disabled || isProcessing}
          >
            {settings.interlace ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            {settings.interlace ? "Enabled" : "Disabled"}
          </button>
          <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
            {settings.interlace
              ? "Shows low-res preview first (larger file)"
              : "Standard top-to-bottom loading"}
          </p>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span>Palette Quantization</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              {settings.palette ? `${settings.colors || 256} colors` : "Full color"}
            </span>
          </div>
          <button
            type="button"
            className={`toggle-button ${settings.palette ? "active" : ""}`}
            onClick={() => onSettingsChange({ ...settings, palette: !settings.palette })}
            disabled={disabled || isProcessing}
          >
            {settings.palette ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            {settings.palette ? "Enabled" : "Disabled"}
          </button>
          {settings.palette && (
            <>
              <input
                type="range"
                min="2"
                max="256"
                value={settings.colors || 256}
                onChange={(e) => onSettingsChange({ ...settings, colors: Number(e.target.value) })}
                className="quality-slider"
                disabled={disabled || isProcessing}
                style={{ marginTop: '8px' }}
              />
              <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '4px' }}>
                Colors: {settings.colors || 256} (fewer colors = smaller file)
              </p>
            </>
          )}
        </div>
      </>
    );
  };

  const [nearLosslessValue, setNearLosslessValue] = useState(settings.nearLossless || 100); // 100 = true lossless

  // Initialize near-lossless value when settings change
  useEffect(() => {
    if (settings.format === "webp" && settings.lossless) {
      // Initialize near-lossless to 100 if not set
      if (settings.nearLossless === undefined) {
        onSettingsChange({ ...settings, nearLossless: 100 });
      }
    }
  }, [settings.format, settings.lossless]);

  // Handle near-lossless change
  const handleNearLosslessChange = useCallback(
    (value: number) => {
      setNearLosslessValue(value);
      onSettingsChange({ ...settings, nearLossless: value });

      announce({
        message: value === 100
          ? "True lossless mode"
          : `Near-lossless quality: ${value}%`,
        priority: "polite",
        delay: 500,
      });
    },
    [settings, onSettingsChange, announce]
  );

  const renderWebPOptions = () => {
    if (settings.format !== "webp") return null;

    return (
      <>
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

        {/* WebP Preset for lossy mode */}
        {!settings.lossless && (
          <div className="setting-item">
            <div className="setting-label">
              <span>Optimization Preset</span>
              <span className="setting-value" style={{ fontSize: '11px' }}>
                {settings.preset || "default"}
              </span>
            </div>
            <Select
              value={settings.preset || "default"}
              onValueChange={(value) => onSettingsChange({ ...settings, preset: value as "default" | "photo" | "picture" | "drawing" | "icon" | "text" })}
              disabled={disabled || isProcessing}
            >
              <SelectTrigger className="compression-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="photo">Photo (natural images)</SelectItem>
                <SelectItem value="picture">Picture (portraits)</SelectItem>
                <SelectItem value="drawing">Drawing (high contrast)</SelectItem>
                <SelectItem value="icon">Icon (small colorful)</SelectItem>
                <SelectItem value="text">Text (legibility)</SelectItem>
              </SelectContent>
            </Select>
            <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
              Optimizes compression for specific content types
            </p>
          </div>
        )}

        {/* Alpha Quality for images with transparency */}
        {!settings.lossless && (
          <div className="setting-item">
            <div className="setting-label">
              <span>Alpha Channel Quality</span>
              <span className="setting-value" style={{ fontSize: '11px' }}>
                {settings.alphaQuality || 100}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.alphaQuality || 100}
              onChange={(e) => onSettingsChange({ ...settings, alphaQuality: Number(e.target.value) })}
              className="quality-slider"
              disabled={disabled || isProcessing}
            />
            <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
              Quality of transparency channel (if present)
            </p>
          </div>
        )}

        {/* Near-lossless slider for WebP lossless only */}
        {settings.format === "webp" && settings.lossless && (
              <div className="setting-item">
                <div className="setting-label">
                  <label htmlFor="near-lossless-slider">
                    Near-Lossless Quality
                    {nearLosslessValue < 100 && (
                      <span style={{ fontSize: '11px', marginLeft: '8px', color: '#10b981' }}>
                        (Smaller file)
                      </span>
                    )}
                  </label>
                  <span className="setting-value" aria-live="polite">
                    {nearLosslessValue === 100 ? "True Lossless" : `${nearLosslessValue}%`}
                  </span>
                </div>
                <input
                  id="near-lossless-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={nearLosslessValue}
                  onChange={(e) => handleNearLosslessChange(Number(e.target.value))}
                  className="quality-slider"
                  disabled={disabled || isProcessing}
                  aria-label="Near-lossless quality setting"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={nearLosslessValue}
                  aria-valuetext={nearLosslessValue === 100 ? "True lossless" : `${nearLosslessValue} percent quality`}
                />
                <div className="preset-buttons">
                  <button
                    type="button"
                    onClick={() => handleNearLosslessChange(100)}
                    disabled={disabled || isProcessing}
                    className={`preset-button ${nearLosslessValue === 100 ? 'active' : ''}`}
                  >
                    True Lossless
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNearLosslessChange(80)}
                    disabled={disabled || isProcessing}
                    className={`preset-button ${nearLosslessValue === 80 ? 'active' : ''}`}
                  >
                    Balanced (80%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNearLosslessChange(60)}
                    disabled={disabled || isProcessing}
                    className={`preset-button ${nearLosslessValue === 60 ? 'active' : ''}`}
                  >
                    Max Compression (60%)
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
                  {nearLosslessValue === 100
                    ? "Pixel-perfect quality, larger file size"
                    : nearLosslessValue >= 80
                    ? "Visually identical, 10-20% smaller file"
                    : "Minor quality loss, 20-40% smaller file"}
                </p>
              </div>
            )}
      </>
    );
  };

  const renderJPEGOptions = () => {
    if (settings.format !== "jpeg") return null;

    return (
      <>
        <div className="setting-item">
          <div className="setting-label">
            <span>Progressive JPEG</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              {settings.progressive ? "Better for web" : "Standard"}
            </span>
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
          <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
            {settings.progressive
              ? "Shows low-quality preview first, then improves."
              : "Loads from top to bottom."}
          </p>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span>Chroma Subsampling</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              {settings.chromaSubsampling || "auto"}
            </span>
          </div>
          <Select
            value={settings.chromaSubsampling || "auto"}
            onValueChange={(value) => onSettingsChange({ ...settings, chromaSubsampling: value as "4:4:4" | "4:2:2" | "4:2:0" | "auto" })}
            disabled={disabled || isProcessing}
          >
            <SelectTrigger className="compression-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Quality based)</SelectItem>
              <SelectItem value="4:4:4">4:4:4 (Best quality)</SelectItem>
              <SelectItem value="4:2:2">4:2:2 (Balanced)</SelectItem>
              <SelectItem value="4:2:0">4:2:0 (Smallest file)</SelectItem>
            </SelectContent>
          </Select>
          <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
            {settings.chromaSubsampling === "4:4:4"
              ? "No color compression - best for graphics"
              : settings.chromaSubsampling === "4:2:0"
              ? "Maximum compression - best for photos"
              : "Automatic based on quality setting"}
          </p>
        </div>

        <div className="setting-item">
          <div className="setting-label">
            <span>MozJPEG Encoder</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              10-15% smaller files
            </span>
          </div>
          <button
            type="button"
            className={`toggle-button ${settings.mozjpeg !== false ? "active" : ""}`}
            onClick={() => onSettingsChange({ ...settings, mozjpeg: settings.mozjpeg === false })}
            disabled={disabled || isProcessing}
          >
            {settings.mozjpeg !== false ? (
              <ToggleRight size={16} />
            ) : (
              <ToggleLeft size={16} />
            )}
            {settings.mozjpeg !== false ? "Enabled" : "Disabled"}
          </button>
        </div>
      </>
    );
  };

  const renderAVIFOptions = () => {
    if (settings.format !== "avif") return null;

    return (
      <>
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

        {/* AVIF Effort level (controls compression quality and speed) */}
        <div className="setting-item">
          <div className="setting-label">
            <span>Compression Effort</span>
            <span className="setting-value" style={{ fontSize: '11px' }}>
              {settings.effort ?? 4}/9
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="9"
            value={settings.effort ?? 4}
            onChange={(e) => onSettingsChange({ ...settings, effort: Number(e.target.value) })}
            className="quality-slider"
            disabled={disabled || isProcessing}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(187, 225, 250, 0.5)' }}>Fast (0)</span>
            <span style={{ fontSize: '10px', color: 'rgba(187, 225, 250, 0.5)' }}>Balanced (4)</span>
            <span style={{ fontSize: '10px', color: 'rgba(187, 225, 250, 0.5)' }}>Best (9)</span>
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(187, 225, 250, 0.6)', marginTop: '8px' }}>
            {(settings.effort ?? 4) <= 2
              ? "Fast encoding, larger file size"
              : (settings.effort ?? 4) >= 7
              ? "Best compression, very slow encoding"
              : "Balanced speed and compression"}
          </p>
        </div>
      </>
    );
  };

  return (
    <ConversionPanelStyled isProcessing={isProcessing} className={className}>
      <div className="settings-panel">
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
          {renderPNGOptions()}
          {renderWebPOptions()}
          {renderJPEGOptions()}
          {renderAVIFOptions()}
        </div>

        {formatInfo && (
          <div className="format-info">
            <Sliders
              size={14}
              style={{ display: "inline", marginRight: "8px" }}
            />
            {formatInfo}
          </div>
        )}
      </div>
    </ConversionPanelStyled>
  );
};

export default ConversionPanel;
