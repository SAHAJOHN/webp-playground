import { createVideoJobHandlers } from "@/lib/video-conversion/route-handlers";
import { videoConversionStore } from "@/lib/video-conversion/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createVideoJobHandlers(videoConversionStore);

type RouteContextType = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, context: RouteContextType) {
  return handlers.GET(request, context);
}

export async function PATCH(request: Request, context: RouteContextType) {
  return handlers.PATCH(request, context);
}

export async function POST(request: Request, context: RouteContextType) {
  return handlers.POST(request, context);
}

export async function DELETE(request: Request, context: RouteContextType) {
  return handlers.DELETE(request, context);
}
