"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, HardDrive } from "lucide-react";
import styled from "styled-components";
import {
  AppHeader,
  AppLayout,
  ScrollProgress,
  ScrollShadow,
} from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { VideoFileUpload } from "@/components/video/VideoFileUpload";
import { VideoConversionPanel } from "@/components/video/VideoConversionPanel";
import { VideoConversionResult } from "@/components/video/VideoConversionResult";
import { useVideoToAudioConversion } from "@/hooks/conversion/useVideoToAudioConversion";
import type { VideoConversionSettingsType } from "@/types/video-conversion";
import { theme } from "@/styles/theme";

const LeftWorkspaceStyled = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  .workspace-heading {
    display: grid;
    gap: ${theme.spacing[2]};
  }

  .workspace-heading h1 {
    color: ${theme.colors.text.primary};
    font-size: ${theme.fontSizes.xl};
    letter-spacing: -0.025em;
    margin: 0;
  }

  .workspace-heading p {
    color: ${theme.colors.text.muted};
    font-size: ${theme.fontSizes.xs};
    line-height: 1.5;
    margin: 0;
  }

  .section {
    border-top: 1px solid ${theme.colors.border.subtle};
    padding-top: ${theme.spacing[5]};
  }

`;

const WorkspaceScrollStyled = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[5]};
  padding-right: ${theme.spacing[2]};
  padding-bottom: ${theme.spacing[5]};
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.accent.primaryHover};
    outline-offset: -2px;
  }
`;

const ActionAreaStyled = styled.div`
  flex: 0 0 auto;
  display: grid;
  gap: ${theme.spacing[2]};
  padding-top: ${theme.spacing[4]};
  border-top: 1px solid ${theme.colors.border.subtle};

  .action-status {
    overflow: hidden;
    color: ${theme.colors.text.muted};
    font: 10px ${theme.fonts.mono};
    text-overflow: ellipsis;
    white-space: nowrap;
  }

`;

const ConvertButtonStyled = styled(Button)`
  width: 100%;
`;

const RightWorkspaceStyled = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const FooterStyled = styled.footer`
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing[3]};
  padding: 8px ${theme.spacing[5]};
  border-top: 1px solid ${theme.colors.border.subtle};
  background: ${theme.colors.bg.base};
  color: ${theme.colors.text.muted};
  font-size: 11px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const DEFAULT_SETTINGS: VideoConversionSettingsType = {
  outputFormat: "m4a",
  bitrateKbps: 64,
};

export const VideoToAudioWorkspace = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [settings, setSettings] =
    useState<VideoConversionSettingsType>(DEFAULT_SETTINGS);
  const { job, error, isBusy, startConversion, cancel, reset } =
    useVideoToAudioConversion();

  const handleFileSelected = (nextFile: File) => {
    reset();
    const nextPreviewUrl = URL.createObjectURL(nextFile);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setFile(nextFile);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  return (
    <AppLayout
      header={
        <AppHeader
          mode="video-audio"
          statusLabel="8 GiB max • disk streamed"
        />
      }
      leftPanel={
        <LeftWorkspaceStyled
          role="region"
          aria-label="Video settings and actions"
        >
          <ScrollProgress
            selectors={["video-settings-scroll"]}
            color={theme.colors.accent.primary}
          >
            <ScrollShadow
              selectors={["video-settings-scroll"]}
              color={theme.colors.bg.surface}
            >
              <WorkspaceScrollStyled
                className="video-settings-scroll"
                data-video-scroll-region="settings"
                role="region"
                aria-label="Video upload and settings"
                tabIndex={0}
              >
                <div className="workspace-heading">
                  <h1>Video to audio</h1>
                  <p>
                    Choose the container, then tune bitrate for the size you
                    need.
                  </p>
                </div>
                <VideoFileUpload
                  file={file}
                  onFileSelected={handleFileSelected}
                  disabled={isBusy}
                />
                <div className="section">
                  <VideoConversionPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    disabled={isBusy}
                  />
                </div>
              </WorkspaceScrollStyled>
            </ScrollShadow>
          </ScrollProgress>
          <ActionAreaStyled>
            <span className="action-status" aria-live="polite">
              {isBusy
                ? "Streaming and processing on the server"
                : file
                  ? `${file.name} is ready`
                  : "Choose one video to continue"}
            </span>
            <ConvertButtonStyled
              variant="primary"
              disabled={!file || isBusy}
              isLoading={isBusy}
              onClick={() => {
                if (file) void startConversion(file, settings);
              }}
            >
              {isBusy ? "Conversion running" : "Convert video"}
              <ArrowRight size={17} aria-hidden="true" />
            </ConvertButtonStyled>
          </ActionAreaStyled>
        </LeftWorkspaceStyled>
      }
      rightPanel={
        <RightWorkspaceStyled>
          <ScrollProgress
            selectors={["video-result-scroll"]}
            color={theme.colors.accent.primary}
          >
            <ScrollShadow
              selectors={["video-result-scroll"]}
              color={theme.colors.bg.surface}
            >
              <VideoConversionResult
                file={file}
                previewUrl={previewUrl}
                job={job}
                error={error}
                isBusy={isBusy}
                onCancel={() => void cancel()}
                onReset={reset}
              />
            </ScrollShadow>
          </ScrollProgress>
        </RightWorkspaceStyled>
      }
      footer={
        <FooterStyled>
          <span>
            <HardDrive size={13} aria-hidden="true" /> Temporary files expire
            automatically
          </span>
          <span>FFmpeg server processing</span>
        </FooterStyled>
      }
    />
  );
};
