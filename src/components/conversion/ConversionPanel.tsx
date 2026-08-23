"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import styled from "styled-components";
import { Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { ConversionPanelPropsType } from "@/types/components";
import { SupportedFormatType } from "@/types/conversion";
import { useAccessibility } from "@/hooks/ui/useAccessibility";
import { Button } from "@/components/ui/Button";
import { ControlField } from "@/components/ui/ControlField";
import { OptionCardGroup } from "@/components/ui/OptionCardGroup";
import { RangeControl } from "@/components/ui/RangeControl";
import { ToggleControl } from "@/components/ui/ToggleControl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { theme } from "@/styles/theme";

const IMAGE_FORMAT_OPTIONS = [
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF" },
] as const;

const COMPRESSION_MODE_OPTIONS = [
  { value: "lossy", label: "Lossy" },
  { value: "lossless", label: "Lossless" },
] as const;

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

  .settings-group {
    display: grid;
    gap: ${theme.spacing[4]};
  }

  .setting-item {
    min-width: 0;
  }

  .near-lossless-presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${theme.spacing[2]};
    margin-top: ${theme.spacing[3]};

    button {
      min-width: 0;
      height: auto;
      padding-block: ${theme.spacing[2]};
      white-space: normal;
    }
  }

  .toggle-control {
    width: 100%;
  }

  .range-scale {
    display: flex;
    justify-content: space-between;
    margin-top: ${theme.spacing[2]};
    color: ${theme.colors.control.textMuted};
    font-size: 10px;
  }

  .format-info {
    margin-top: ${theme.spacing[4]};
    padding: ${theme.spacing[3]};
    background: ${theme.colors.bg.elevated};
    border-radius: ${theme.radii.lg};
    font-size: ${theme.fontSizes.xs};
    color: ${theme.colors.text.muted};
    line-height: 1.5;

    svg {
      display: inline;
      margin-right: ${theme.spacing[2]};
      vertical-align: text-bottom;
    }
  }

  @media (max-width: 640px) {
    .near-lossless-presets {
      grid-template-columns: 1fr;
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
  const { announce, isReducedMotion } = useAccessibility({
    announceChanges: true,
  });

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
        <RangeControl
          id={`quality-slider-${settings.format}`}
          label="Quality"
          valueText={isQualityDisabled ? "—" : `${quality}%`}
          helperText={
            isQualityDisabled
              ? "Quality setting is not applicable in lossless mode"
              : "Higher quality = larger file size"
          }
          min={1}
          max={100}
          value={quality}
          onChange={(e) => handleQualityChange(Number(e.target.value))}
          disabled={disabled || isProcessing || isQualityDisabled}
          aria-valuetext={isQualityDisabled ? "Unavailable" : `${quality}%`}
        />
      </div>
    );
  };

  const renderPNGOptions = () => {
    if (settings.format !== "png") return null;

    const compressionLevel = settings.compressionLevel ?? 6;

    return (
      <>
        <div className="setting-item">
          <ControlField
            id="png-compression-level"
            label="Compression level"
            value={compressionLevel}
            helperText="Higher levels create smaller files but take longer to encode."
          >
            {({ controlId, describedBy }) => (
              <Select
                value={compressionLevel.toString()}
                onValueChange={(value) =>
                  handleCompressionChange(Number(value))
                }
                disabled={disabled || isProcessing}
              >
                <SelectTrigger id={controlId} aria-describedby={describedBy}>
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
            )}
          </ControlField>
        </div>

        <div className="setting-item">
          <ControlField
            id="png-interlacing"
            label="Interlacing (Adam7)"
            value={settings.interlace ? "Progressive display" : "Sequential"}
            helperText={
              settings.interlace
                ? "Shows low-res preview first (larger file)"
                : "Standard top-to-bottom loading"
            }
          >
            {({ controlId, describedBy }) => (
              <ToggleControl
                id={controlId}
                className="toggle-control"
                pressed={settings.interlace === true}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    interlace: !settings.interlace,
                  })
                }
                disabled={disabled || isProcessing}
                aria-label="Interlacing (Adam7)"
                aria-describedby={describedBy}
              >
                {settings.interlace ? (
                  <ToggleRight aria-hidden="true" />
                ) : (
                  <ToggleLeft aria-hidden="true" />
                )}
                {settings.interlace ? "Enabled" : "Disabled"}
              </ToggleControl>
            )}
          </ControlField>
        </div>

        <div className="setting-item">
          <ControlField
            id="png-palette"
            label="Palette quantization"
            value={
              settings.palette ? `${settings.colors ?? 256} colors` : "Full color"
            }
            helperText="Reduces the color palette to create a smaller PNG."
          >
            {({ controlId, describedBy }) => (
              <ToggleControl
                id={controlId}
                className="toggle-control"
                pressed={settings.palette === true}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    palette: !settings.palette,
                  })
                }
                disabled={disabled || isProcessing}
                aria-label="Palette quantization"
                aria-describedby={describedBy}
              >
                {settings.palette ? (
                  <ToggleRight aria-hidden="true" />
                ) : (
                  <ToggleLeft aria-hidden="true" />
                )}
                {settings.palette ? "Enabled" : "Disabled"}
              </ToggleControl>
            )}
          </ControlField>
        </div>

        {settings.palette ? (
          <div className="setting-item">
            <RangeControl
              id="png-palette-colors"
              label="Palette colors"
              valueText={`${settings.colors ?? 256}`}
              helperText={`Colors: ${
                settings.colors ?? 256
              } (fewer colors = smaller file)`}
              min={2}
              max={256}
              value={settings.colors ?? 256}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  colors: Number(event.target.value),
                })
              }
              disabled={disabled || isProcessing}
              aria-valuetext={`${settings.colors ?? 256} colors`}
            />
          </div>
        ) : null}
      </>
    );
  };

  const nearLosslessValue = settings.nearLossless ?? 100;

  useEffect(() => {
    if (
      settings.format === "webp" &&
      settings.lossless &&
      settings.nearLossless === undefined
    ) {
      onSettingsChange({ ...settings, nearLossless: 100 });
    }
  }, [settings, onSettingsChange]);

  // Handle near-lossless change
  const handleNearLosslessChange = useCallback(
    (value: number) => {
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
          <OptionCardGroup
            label="Compression mode"
            name="webp-compression-mode"
            value={settings.lossless ? "lossless" : "lossy"}
            options={COMPRESSION_MODE_OPTIONS}
            variant="compact"
            disabled={disabled || isProcessing}
            onValueChange={(mode) =>
              onSettingsChange({
                ...settings,
                lossless: mode === "lossless",
                nearLossless:
                  mode === "lossless"
                    ? (settings.nearLossless ?? 100)
                    : settings.nearLossless,
              })
            }
          />
        </div>

        {!settings.lossless && (
          <div className="setting-item">
            <ControlField
              id="webp-optimization-preset"
              label="Optimization preset"
              value={settings.preset ?? "default"}
              helperText="Optimizes compression for specific content types"
            >
              {({ controlId, describedBy }) => (
                <Select
                  value={settings.preset ?? "default"}
                  onValueChange={(value) =>
                    onSettingsChange({
                      ...settings,
                      preset: value as
                        | "default"
                        | "photo"
                        | "picture"
                        | "drawing"
                        | "icon"
                        | "text",
                    })
                  }
                  disabled={disabled || isProcessing}
                >
                  <SelectTrigger id={controlId} aria-describedby={describedBy}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="photo">Photo (natural images)</SelectItem>
                    <SelectItem value="picture">Picture (portraits)</SelectItem>
                    <SelectItem value="drawing">
                      Drawing (high contrast)
                    </SelectItem>
                    <SelectItem value="icon">Icon (small colorful)</SelectItem>
                    <SelectItem value="text">Text (legibility)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </ControlField>
          </div>
        )}

        {!settings.lossless && (
          <div className="setting-item">
            <RangeControl
              id="webp-alpha-quality"
              label="Alpha channel quality"
              valueText={`${settings.alphaQuality ?? 100}%`}
              helperText="Quality of transparency channel (if present)"
              min={0}
              max={100}
              value={settings.alphaQuality ?? 100}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  alphaQuality: Number(event.target.value),
                })
              }
              disabled={disabled || isProcessing}
              aria-valuetext={`${settings.alphaQuality ?? 100}%`}
            />
          </div>
        )}

        {settings.lossless ? (
          <div className="setting-item">
            <RangeControl
              id="near-lossless-slider"
              label="Near-lossless quality"
              valueText={
                nearLosslessValue === 100
                  ? "True lossless"
                  : `${nearLosslessValue}%`
              }
              helperText={
                nearLosslessValue === 100
                  ? "Pixel-perfect quality, larger file size"
                  : nearLosslessValue >= 80
                    ? "Visually identical, 10-20% smaller file"
                    : "Minor quality loss, 20-40% smaller file"
              }
              min={0}
              max={100}
              step={5}
              value={nearLosslessValue}
              onChange={(event) =>
                handleNearLosslessChange(Number(event.target.value))
              }
              disabled={disabled || isProcessing}
              aria-valuetext={
                nearLosslessValue === 100
                  ? "True lossless"
                  : `${nearLosslessValue} percent quality`
              }
            />
            <div
              className="near-lossless-presets"
              aria-label="Near-lossless presets"
            >
              {[
                { value: 100, label: "True Lossless" },
                { value: 80, label: "Balanced (80%)" },
                { value: 60, label: "Max Compression (60%)" },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleNearLosslessChange(preset.value)}
                  disabled={disabled || isProcessing}
                  aria-pressed={nearLosslessValue === preset.value}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const renderJPEGOptions = () => {
    if (settings.format !== "jpeg") return null;

    return (
      <>
        <div className="setting-item">
          <ControlField
            id="jpeg-progressive"
            label="Progressive JPEG"
            value={settings.progressive ? "Better for web" : "Standard"}
            helperText={
              settings.progressive
                ? "Shows a low-quality preview first, then improves."
                : "Loads from top to bottom."
            }
          >
            {({ controlId, describedBy }) => (
              <ToggleControl
                id={controlId}
                className="toggle-control"
                pressed={settings.progressive === true}
                onClick={handleProgressiveToggle}
                disabled={disabled || isProcessing}
                aria-label="Progressive JPEG"
                aria-describedby={describedBy}
              >
                {settings.progressive ? (
                  <ToggleRight aria-hidden="true" />
                ) : (
                  <ToggleLeft aria-hidden="true" />
                )}
                {settings.progressive ? "Enabled" : "Disabled"}
              </ToggleControl>
            )}
          </ControlField>
        </div>

        <div className="setting-item">
          <ControlField
            id="jpeg-chroma-subsampling"
            label="Chroma Subsampling"
            value={settings.chromaSubsampling ?? "auto"}
            helperText={
              settings.chromaSubsampling === "4:4:4"
                ? "No color compression - best for graphics"
                : settings.chromaSubsampling === "4:2:0"
                  ? "Maximum compression - best for photos"
                  : "Automatic based on quality setting"
            }
          >
            {({ controlId, describedBy }) => (
              <Select
                value={settings.chromaSubsampling ?? "auto"}
                onValueChange={(value) =>
                  onSettingsChange({
                    ...settings,
                    chromaSubsampling: value as
                      | "4:4:4"
                      | "4:2:2"
                      | "4:2:0"
                      | "auto",
                  })
                }
                disabled={disabled || isProcessing}
              >
                <SelectTrigger id={controlId} aria-describedby={describedBy}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Quality based)</SelectItem>
                  <SelectItem value="4:4:4">4:4:4 (Best quality)</SelectItem>
                  <SelectItem value="4:2:2">4:2:2 (Balanced)</SelectItem>
                  <SelectItem value="4:2:0">4:2:0 (Smallest file)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </ControlField>
        </div>

        <div className="setting-item">
          <ControlField
            id="jpeg-mozjpeg"
            label="MozJPEG encoder"
            value="10-15% smaller files"
          >
            {({ controlId, describedBy }) => (
              <ToggleControl
                id={controlId}
                className="toggle-control"
                pressed={settings.mozjpeg !== false}
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    mozjpeg: settings.mozjpeg === false,
                  })
                }
                disabled={disabled || isProcessing}
                aria-label="MozJPEG encoder"
                aria-describedby={describedBy}
              >
                {settings.mozjpeg !== false ? (
                  <ToggleRight aria-hidden="true" />
                ) : (
                  <ToggleLeft aria-hidden="true" />
                )}
                {settings.mozjpeg !== false ? "Enabled" : "Disabled"}
              </ToggleControl>
            )}
          </ControlField>
        </div>
      </>
    );
  };

  const renderAVIFOptions = () => {
    if (settings.format !== "avif") return null;

    const effort = settings.effort ?? 4;

    return (
      <>
        <div className="setting-item">
          <OptionCardGroup
            label="Compression mode"
            name="avif-compression-mode"
            value={settings.lossless ? "lossless" : "lossy"}
            options={COMPRESSION_MODE_OPTIONS}
            variant="compact"
            disabled={disabled || isProcessing}
            onValueChange={(mode) =>
              onSettingsChange({
                ...settings,
                lossless: mode === "lossless",
              })
            }
          />
        </div>

        <div className="setting-item">
          <RangeControl
            id="avif-compression-effort"
            label="Compression effort"
            valueText={`${effort}/9`}
            helperText={
              effort <= 2
                ? "Fast encoding, larger file size"
                : effort >= 7
                  ? "Best compression, very slow encoding"
                  : "Balanced speed and compression"
            }
            min={0}
            max={9}
            value={effort}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                effort: Number(event.target.value),
              })
            }
            disabled={disabled || isProcessing}
            aria-valuetext={`${effort} out of 9`}
          />
          <div className="range-scale" aria-hidden="true">
            <span>Fast (0)</span>
            <span>Balanced (4)</span>
            <span>Best (9)</span>
          </div>
        </div>
      </>
    );
  };

  return (
    <ConversionPanelStyled isProcessing={isProcessing} className={className}>
      <div className="settings-panel">
        <div className="format-selection">
          <OptionCardGroup
            label="Output format"
            name="image-output-format"
            value={settings.format}
            options={IMAGE_FORMAT_OPTIONS}
            variant="compact"
            disabled={disabled || isProcessing}
            onValueChange={handleFormatChange}
          />
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
              aria-hidden="true"
            />
            {formatInfo}
          </div>
        )}
      </div>
    </ConversionPanelStyled>
  );
};

export default ConversionPanel;
