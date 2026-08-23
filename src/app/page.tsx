"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import styled from "styled-components";
import {
  AppHeader,
  AppLayout,
  ScrollProgress,
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
import {ScrollShadow} from "@/components/layout/ScrollShadow";

const LeftPanelContentStyled = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const ScrollSectionStyled = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 16px;

  /* Hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const SectionTitleStyled = styled.h3`
  font-size: 11px;
  font-weight: 600;
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px 0;
`;

const SectionCardStyled = styled.div`
  background: #18181b;
`;

const RightPanelContentStyled = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const PreviewSectionStyled = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;

  /* Hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const EmptyStateStyled = styled.div`
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

const EmptyIconStyled = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const EmptyTextStyled = styled.p`
  font-size: 16px;
  color: #52525b;
  margin: 0;
`;

const FooterStyled = styled.footer`
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #09090b;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 11px;
  color: #52525b;
`;

type ServerProcessingStatusType = {
  queueTotal: number;
  processing: number;
  maxQueue: number;
  maxProcessing: number;
  memoryBytes: number;
  memoryLimitBytes: number;
};

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [serverProcessing, setServerProcessing] =
    useState<ServerProcessingStatusType>({
      queueTotal: 0,
      processing: 0,
      maxQueue: 100,
      maxProcessing: 5,
      memoryBytes: 0,
      memoryLimitBytes: 100 * 1024 * 1024,
    });
  const [conversionSettings, setConversionSettings] =
    useState<ConversionSettingsType>({
      format: "webp" as SupportedFormatType,
      quality: 80,
      lossless: false,
      progressive: true,
      interlace: true,
    });
  const queueThumbnailUrlsRef = useRef<Map<string, string>>(new Map());
  const previewConvertedUrlsRef = useRef<
    Map<string, { url: string; fingerprint: string }>
  >(new Map());

  const getQueueThumbnailUrl = useCallback((file: File) => {
    const key = `${file.name}-${file.lastModified}-${file.size}`;
    const cachedUrl = queueThumbnailUrlsRef.current.get(key);

    if (cachedUrl) {
      return cachedUrl;
    }

    const createdUrl = URL.createObjectURL(file);
    queueThumbnailUrlsRef.current.set(key, createdUrl);
    return createdUrl;
  }, []);

  const {
    jobs: simpleJobs,
    isProcessing,
    results: simpleResults,
    convertFiles,
    clearJobs,
    resetQueue,
    cancelJob,
  } = useSimpleImageConversion();

  const getSelectedFileKey = useCallback(
    (file: File) => `${file.name}-${file.lastModified}-${file.size}`,
    []
  );

  // Convert jobs to queue items
  const queueItems: FileQueueItemType[] = useMemo(() => {
    if (simpleJobs.length === 0 && selectedFiles.length > 0) {
      return selectedFiles.map((file) => ({
        id: `selected-${getSelectedFileKey(file)}`,
        name: file.name,
        size: formatFileSize(file.size),
        thumbnail: getQueueThumbnailUrl(file),
        status: "pending" as const,
        progress: 0,
      }));
    }

    return simpleJobs
      .filter((job) => job.status !== "cancelled")
      .map((job) => ({
        id: job.id,
        name: job.file.name,
        size: formatFileSize(job.file.size),
        thumbnail: getQueueThumbnailUrl(job.file),
        status: mapJobStatus(job.status),
        progress: job.progress,
      }));
  }, [getQueueThumbnailUrl, getSelectedFileKey, simpleJobs, selectedFiles]);

  const activeQueueThumbnailKeys = useMemo(() => {
    if (simpleJobs.length === 0 && selectedFiles.length > 0) {
      return selectedFiles.map(
        (file) => `${file.name}-${file.lastModified}-${file.size}`
      );
    }

    return simpleJobs
      .filter((job) => job.status !== "cancelled")
      .map((job) => `${job.file.name}-${job.file.lastModified}-${job.file.size}`);
  }, [selectedFiles, simpleJobs]);

  useEffect(() => {
    const activeKeys = new Set(activeQueueThumbnailKeys);

    queueThumbnailUrlsRef.current.forEach((url, key) => {
      if (!activeKeys.has(key)) {
        URL.revokeObjectURL(url);
        queueThumbnailUrlsRef.current.delete(key);
      }
    });
  }, [activeQueueThumbnailKeys]);

  const previewResultKeys = useMemo(
    () => simpleResults.map((result) => result.originalFile.name),
    [simpleResults]
  );

  // Convert results to preview grid items with stable blob URLs
  const previewItems: PreviewGridItemType[] = useMemo(() => {
    return simpleResults.map((result, idx) => {
      const key = previewResultKeys[idx];

      let convertedUrl: string | undefined;
      if (result.convertedBlob) {
        const fingerprint = `${result.originalFile.lastModified}-${result.originalFile.size}-${result.convertedBlob.size}`;
        const cachedPreview = previewConvertedUrlsRef.current.get(key);

        if (!cachedPreview || cachedPreview.fingerprint !== fingerprint) {
          if (cachedPreview) {
            URL.revokeObjectURL(cachedPreview.url);
          }

          convertedUrl = URL.createObjectURL(result.convertedBlob);
          previewConvertedUrlsRef.current.set(key, {
            url: convertedUrl,
            fingerprint,
          });
        } else {
          convertedUrl = cachedPreview.url;
        }
      }

      return {
        id: `result-${idx}`,
        name: result.originalFile.name,
        originalUrl: "",
        convertedUrl,
        originalSize: formatFileSize(result.originalFile.size),
        convertedSize: result.convertedBlob
          ? formatFileSize(result.convertedBlob.size)
          : undefined,
        compressionRatio: getCompressionRatio(
          result.originalFile.size,
          result.convertedBlob?.size || 0
        ),
        status: "done" as const,
      };
    });
  }, [previewResultKeys, simpleResults]);

  useEffect(() => {
    const activeKeys = new Set(previewResultKeys);

    previewConvertedUrlsRef.current.forEach((url, key) => {
      if (!activeKeys.has(key)) {
        URL.revokeObjectURL(url.url);
        previewConvertedUrlsRef.current.delete(key);
      }
    });
  }, [previewResultKeys]);

  useEffect(() => {
    return () => {
      queueThumbnailUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      queueThumbnailUrlsRef.current.clear();

      previewConvertedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url.url));
      previewConvertedUrlsRef.current.clear();
    };
  }, []);

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
    if (files.length > 0) {
      resetQueue();
    }

    setSelectedFiles(files);
    if (files.length === 0) {
      clearJobs();
    }
  }, [clearJobs, resetQueue]);

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
      if (id.startsWith("selected-")) {
        const selectedFileKey = id.replace("selected-", "");

        setSelectedFiles((prev) => {
          const nextFiles = prev.filter(
            (file) => getSelectedFileKey(file) !== selectedFileKey
          );

          if (nextFiles.length === 0) {
            setFileUploadKey((prevKey) => prevKey + 1);
          }

          return nextFiles;
        });

        return;
      }

      cancelJob(id);
    },
    [cancelJob, getSelectedFileKey]
  );

  const handleClearAll = useCallback(() => {
    clearJobs();
    setSelectedFiles([]);
    setFileUploadKey((prev) => prev + 1);
  }, [clearJobs]);

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

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let reconnectTimeoutId: number | null = null;
    let reconnectDelay = 1000;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
    };

    const connect = () => {
      if (!isMounted) {
        return;
      }

      eventSource = new EventSource("/api/convert");

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Partial<ServerProcessingStatusType>;

          if (!isMounted) {
            return;
          }

          setServerProcessing({
            queueTotal:
              typeof data.queueTotal === "number" ? data.queueTotal : 0,
            processing:
              typeof data.processing === "number" ? data.processing : 0,
            maxQueue:
              typeof data.maxQueue === "number" ? data.maxQueue : 100,
            maxProcessing:
              typeof data.maxProcessing === "number" ? data.maxProcessing : 5,
            memoryBytes:
              typeof data.memoryBytes === "number" ? data.memoryBytes : 0,
            memoryLimitBytes:
              typeof data.memoryLimitBytes === "number"
                ? data.memoryLimitBytes
                : 100 * 1024 * 1024,
          });

          reconnectDelay = 1000;
        } catch {
          // Ignore malformed SSE payloads
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        if (!isMounted) {
          return;
        }

        clearReconnectTimeout();
        reconnectTimeoutId = window.setTimeout(() => {
          connect();
        }, reconnectDelay);

        reconnectDelay = Math.min(reconnectDelay * 2, 5000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearReconnectTimeout();

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  return (
    <AppLayout
      header={
        <AppHeader
          mode="image"
          filesProcessed={simpleResults.length}
          totalSaved={totalSaved}
        />
      }
      leftPanel={
        <LeftPanelContentStyled>
          <ScrollProgress selectors={["scroll-section"]}>
            <ScrollShadow selectors={["scroll-section"]} color="#18181b">
              <ScrollSectionStyled className="scroll-section">
              {/* Upload Section */}
              <SectionCardStyled>
                <SectionTitleStyled>Upload</SectionTitleStyled>
                <FileUpload
                    key={fileUploadKey}
                    onFilesSelected={handleFilesSelected}
                    acceptedFormats={["jpeg", "jpg", "png", "webp", "avif"]}
                    maxFileSize={15 * 1024 * 1024}
                    maxFiles={50}
                    disabled={isProcessing}
                />
              </SectionCardStyled>

              {/* Settings Section */}
              {selectedFiles.length > 0 && (
                  <SectionCardStyled>
                    <SectionTitleStyled>Settings</SectionTitleStyled>
                    <ConversionPanel
                        settings={conversionSettings}
                        onSettingsChange={handleSettingsChange}
                        isProcessing={isProcessing}
                    />
                  </SectionCardStyled>
              )}

              {/* Queue Section */}
              {(queueItems.length > 0 || serverProcessing.queueTotal > 0) && (
                  <SectionCardStyled>
                    <FileQueue
                        files={queueItems}
                        onRemove={handleRemoveFromQueue}
                    />
                  </SectionCardStyled>
              )}
            </ScrollSectionStyled>
            </ScrollShadow>
          </ScrollProgress>

          {/* Clear All Area */}
          {queueItems.length > 0 && (
            <ClearAllArea
              filesInQueue={queueItems.length}
              onClearAll={handleClearAll}
              onConvertAll={handleStartConversion}
              canConvert={selectedFiles.length > 0}
              isProcessing={isProcessing}
              statusText={`Server Queue: ${serverProcessing.queueTotal}/${serverProcessing.maxQueue} • Processing: ${serverProcessing.processing}/${serverProcessing.maxProcessing} • Memory: ${Math.round(serverProcessing.memoryBytes / 1024 / 1024)}/${Math.round(serverProcessing.memoryLimitBytes / 1024 / 1024)}MB`}
            />
          )}
        </LeftPanelContentStyled>
      }
      rightPanel={
        <RightPanelContentStyled>
          <ScrollProgress selectors={["preview-section"]}>
            <ScrollShadow selectors={["preview-section"]} color="#18181b">
              <PreviewSectionStyled className="preview-section">
              {previewItems.length > 0 ? (
                <PreviewGrid items={previewItems} onDownload={handleDownloadSingle} />
              ) : (
                <EmptyStateStyled>
                  <EmptyIconStyled></EmptyIconStyled>
                  <EmptyTextStyled>Drop files to start converting</EmptyTextStyled>
                </EmptyStateStyled>
              )}
            </PreviewSectionStyled>
            </ScrollShadow>
          </ScrollProgress>
          {simpleResults.length > 0 && (
            <DownloadArea
              filesReady={simpleResults.length}
              totalSaved={totalSaved}
              onDownloadAll={handleDownloadAll}
              isDownloading={isDownloading}
            />
          )}
        </RightPanelContentStyled>
      }
      footer={
        <FooterStyled>
          <span>⌘+V to paste images</span>
          <span>WebP Converter Pro</span>
        </FooterStyled>
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
