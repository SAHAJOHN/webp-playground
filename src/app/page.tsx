"use client";

import { useState, useCallback, useMemo } from "react";
import styled from "styled-components";
import {
  AppHeader,
  AppLayout,
  MiniSidebar,
} from "@/components/layout";
import {
  FileUpload,
  ConversionPanel,
  FileQueue,
  PreviewGrid,
  DownloadArea,
  ClearAllArea,
} from "@/components";
import { useSimpleImageConversion } from "@/hooks/conversion/useSimpleImageConversion";
import { DownloadService } from "@/lib/services";
import type {
  ConversionSettingsType,
  SupportedFormatType,
} from "@/types";
import type { FileQueueItemType, PreviewGridItemType } from "@/components/conversion";

const LeftPanelContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ScrollSection = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;
`;

const SectionTitle = styled.h3`
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 0;
`;

const SectionCard = styled.div`
  background: #18181b;
`;

const RightPanelContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const PreviewSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  color: #71717a;
  text-align: center;
  gap: 16px;
`;

const EmptyIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: #52525b;
  margin: 0;
`;

const ConvertButton = styled.button<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  margin-top: 16px;
  background: ${(props) =>
    props.$disabled ? "#27272a" : "#6366f1"};
  color: ${(props) =>
    props.$disabled ? "#71717a" : "white"};
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.15s ease;

  &:hover {
    background: ${(props) =>
      props.$disabled ? "#27272a" : "#818cf8"};
  }
`;

const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #09090b;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 11px;
  color: #52525b;
`;

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "settings" | "history" | "stats">("upload");
  const [isDownloading, setIsDownloading] = useState(false);
  const [conversionSettings, setConversionSettings] =
    useState<ConversionSettingsType>({
      format: "webp" as SupportedFormatType,
      quality: 80,
      lossless: false,
      progressive: true,
      interlace: true,
    });

  const {
    jobs: simpleJobs,
    isProcessing,
    results: simpleResults,
    convertFiles,
    clearJobs,
    cancelJob,
  } = useSimpleImageConversion();

  // Convert jobs to queue items
  const queueItems: FileQueueItemType[] = useMemo(() => {
    return simpleJobs
      .filter((job) => job.status !== "cancelled")
      .map((job) => ({
        id: job.id,
        name: job.file.name,
        size: formatFileSize(job.file.size),
        thumbnail: URL.createObjectURL(job.file),
        status: mapJobStatus(job.status),
        progress: job.progress,
      }));
  }, [simpleJobs]);

  // Convert results to preview grid items
  const previewItems: PreviewGridItemType[] = useMemo(() => {
    return simpleResults.map((result, idx) => ({
      id: `result-${idx}`,
      name: result.originalFile.name,
      originalUrl: URL.createObjectURL(result.originalFile),
      convertedUrl: result.convertedBlob
        ? URL.createObjectURL(result.convertedBlob)
        : undefined,
      originalSize: formatFileSize(result.originalFile.size),
      convertedSize: result.convertedBlob
        ? formatFileSize(result.convertedBlob.size)
        : undefined,
      compressionRatio: getCompressionRatio(
        result.originalFile.size,
        result.convertedBlob?.size || 0
      ),
      status: "done" as const,
    }));
  }, [simpleResults]);

  // Calculate stats
  const totalSaved = useMemo(() => {
    const saved = simpleResults.reduce((acc, result) => {
      if (result.convertedBlob) {
        return acc + (result.originalFile.size - result.convertedBlob.size);
      }
      return acc;
    }, 0);
    return formatFileSize(Math.abs(saved));
  }, [simpleResults]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    if (files.length === 0) {
      clearJobs();
    }
  }, [clearJobs]);

  const handleStartConversion = useCallback(() => {
    if (selectedFiles.length > 0) {
      convertFiles(selectedFiles, conversionSettings);
      setSelectedFiles([]);
      setFileUploadKey((prev) => prev + 1);
    }
  }, [selectedFiles, conversionSettings, convertFiles]);

  const handleSettingsChange = useCallback(
    (newSettings: ConversionSettingsType) => {
      setConversionSettings(newSettings);
    },
    []
  );

  const handleRemoveFromQueue = useCallback(
    (id: string) => {
      cancelJob(id);
    },
    [cancelJob]
  );

  const handleDownloadAll = useCallback(async () => {
    if (simpleResults.length === 0) return;

    setIsDownloading(true);
    try {
      await DownloadService.downloadAsZip(simpleResults, {
        customPrefix: "converted_images",
        addTimestamp: true,
      });
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [simpleResults]);

  const handleDownloadSingle = useCallback((id: string) => {
    const index = parseInt(id.replace("result-", ""));
    const result = simpleResults[index];
    if (result) {
      DownloadService.downloadSingleFile(result);
    }
  }, [simpleResults]);

  return (
    <AppLayout
      header={
        <AppHeader
          filesProcessed={simpleResults.length}
          totalSaved={totalSaved}
        />
      }
      sidebar={<MiniSidebar activeTab={activeTab} onTabChange={setActiveTab} />}
      leftPanel={
        <LeftPanelContent>
          <ScrollSection>
            {/* Upload Section */}
            <SectionCard>
              <SectionTitle>Upload</SectionTitle>
              <FileUpload
                key={fileUploadKey}
                onFilesSelected={handleFilesSelected}
                acceptedFormats={["jpeg", "jpg", "png", "webp", "avif"]}
                maxFileSize={50 * 1024 * 1024}
                maxFiles={10}
                disabled={isProcessing}
              />
            </SectionCard>

            {/* Settings Section */}
            {selectedFiles.length > 0 && (
              <SectionCard>
                <SectionTitle>Settings</SectionTitle>
                <ConversionPanel
                  settings={conversionSettings}
                  onSettingsChange={handleSettingsChange}
                  isProcessing={isProcessing}
                />
                <ConvertButton
                  $disabled={isProcessing || selectedFiles.length === 0}
                  onClick={handleStartConversion}
                  disabled={isProcessing || selectedFiles.length === 0}
                >
                  {isProcessing ? "Converting..." : "Convert All"}
                </ConvertButton>
              </SectionCard>
            )}

            {/* Queue Section */}
            {queueItems.length > 0 && (
              <SectionCard>
                <FileQueue
                  files={queueItems}
                  onRemove={handleRemoveFromQueue}
                />
              </SectionCard>
            )}
          </ScrollSection>

          {/* Clear All Area */}
          {queueItems.length > 0 && (
            <ClearAllArea
              filesInQueue={queueItems.length}
              onClearAll={clearJobs}
            />
          )}
        </LeftPanelContent>
      }
      rightPanel={
        <RightPanelContent>
          <PreviewSection>
            {previewItems.length > 0 ? (
              <PreviewGrid items={previewItems} onDownload={handleDownloadSingle} />
            ) : (
              <EmptyState>
                <EmptyIcon></EmptyIcon>
                <EmptyText>Drop files to start converting</EmptyText>
              </EmptyState>
            )}
          </PreviewSection>
          {simpleResults.length > 0 && (
            <DownloadArea
              filesReady={simpleResults.length}
              totalSaved={totalSaved}
              onDownloadAll={handleDownloadAll}
              isDownloading={isDownloading}
            />
          )}
        </RightPanelContent>
      }
      footer={
        <Footer>
          <span>⌘+V to paste images</span>
          <span>WebP Converter Pro</span>
        </Footer>
      }
    />
  );
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function mapJobStatus(
  status: string
): "pending" | "processing" | "done" | "error" {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "processing";
    case "completed":
      return "done";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

function getCompressionRatio(original: number, converted: number): number {
  if (original === 0) return 0;
  return ((original - converted) / original) * 100;
}
