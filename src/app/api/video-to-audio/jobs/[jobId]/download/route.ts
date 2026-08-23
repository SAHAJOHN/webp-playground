import { createVideoDownloadHandler } from "@/lib/video-conversion/route-handlers";
import { videoConversionStore } from "@/lib/video-conversion/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const download = createVideoDownloadHandler(videoConversionStore);

type RouteContextType = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, context: RouteContextType) {
  return download(request, context);
}
