import { createVideoJobCollectionHandlers } from "@/lib/video-conversion/route-handlers";
import { videoConversionStore } from "@/lib/video-conversion/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createVideoJobCollectionHandlers(videoConversionStore);

export async function POST(request: Request) {
  return handlers.POST(request);
}
