import type { Metadata } from "next";
import { VideoToAudioWorkspace } from "@/components/video/VideoToAudioWorkspace";

export const metadata: Metadata = {
  title: "Video to MP3 or M4A",
  description:
    "Extract lightweight MP3 or M4A audio from videos with selectable bitrate.",
};

export default function VideoToAudioPage() {
  return <VideoToAudioWorkspace />;
}
