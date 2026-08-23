"use client";

import styled from "styled-components";
import { ControlField } from "@/components/ui/ControlField";
import { OptionCardGroup } from "@/components/ui/OptionCardGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUDIO_BITRATES_KBPS } from "@/types/video-conversion";
import type {
  AudioBitrateKbpsType,
  AudioOutputFormatType,
  VideoConversionSettingsType,
} from "@/types/video-conversion";
import { theme } from "@/styles/theme";

type VideoConversionPanelPropsType = {
  settings: VideoConversionSettingsType;
  onSettingsChange: (settings: VideoConversionSettingsType) => void;
  disabled: boolean;
};

const VideoConversionPanelStyled = styled.fieldset`
  min-width: 0;
  display: grid;
  gap: ${theme.spacing[5]};
  margin: 0;
  padding: 0;
  border: 0;

  > legend {
    width: 100%;
    margin-bottom: ${theme.spacing[4]};
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.base};
    font-weight: ${theme.fontWeights.semibold};
  }
`;

const OUTPUT_FORMATS: ReadonlyArray<{
  value: AudioOutputFormatType;
  label: string;
  description: string;
}> = [
  { value: "m4a", label: "M4A", description: "Smaller AAC audio" },
  { value: "mp3", label: "MP3", description: "Widest compatibility" },
];

const isAudioBitrate = (value: number): value is AudioBitrateKbpsType =>
  (AUDIO_BITRATES_KBPS as readonly number[]).includes(value);

const bitrateLabel = (bitrate: AudioBitrateKbpsType) => {
  if (bitrate === 64) return `${bitrate} kbps — compact speech`;
  if (bitrate === 128) return `${bitrate} kbps — balanced music`;
  if (bitrate === 320) return `${bitrate} kbps — maximum quality`;
  return `${bitrate} kbps`;
};

export const VideoConversionPanel = ({
  settings,
  onSettingsChange,
  disabled,
}: VideoConversionPanelPropsType) => {
  const estimatedMegabytesPerHour =
    (settings.bitrateKbps * 1_000 * 3_600) / 8 / 1_000_000;

  return (
    <VideoConversionPanelStyled disabled={disabled}>
      <legend>Audio settings</legend>
      <OptionCardGroup
        label="Output format"
        name="audio-output-format"
        value={settings.outputFormat}
        options={OUTPUT_FORMATS}
        variant="descriptive"
        disabled={disabled}
        onValueChange={(outputFormat) =>
          onSettingsChange({ ...settings, outputFormat })
        }
      />

      <ControlField
        id="audio-bitrate"
        label="Audio bitrate"
        value={`≈ ${estimatedMegabytesPerHour.toFixed(1)} MB/hour`}
        helperText="Lower bitrate creates a lighter file."
      >
        {({ controlId, describedBy }) => (
          <Select
            value={settings.bitrateKbps.toString()}
            disabled={disabled}
            onValueChange={(value) => {
              const bitrateKbps = Number(value);
              if (isAudioBitrate(bitrateKbps)) {
                onSettingsChange({ ...settings, bitrateKbps });
              }
            }}
          >
            <SelectTrigger id={controlId} aria-describedby={describedBy}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIO_BITRATES_KBPS.map((bitrate) => (
                <SelectItem key={bitrate} value={bitrate.toString()}>
                  {bitrateLabel(bitrate)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </ControlField>
    </VideoConversionPanelStyled>
  );
};
