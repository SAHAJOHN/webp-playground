import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Supported input formats
const SUPPORTED_FORMATS = ["jpeg", "jpg", "png", "gif", "webp", "avif", "tiff", "svg"];

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const format = formData.get("format") as string;
    const quality = parseInt(formData.get("quality") as string) || 80;
    const lossless = formData.get("lossless") === "true";
    const nearLossless = formData.get("nearLossless") === "true";
    const effort = parseInt(formData.get("effort") as string) || 6;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate format
    if (!format || !["jpeg", "png", "webp", "avif"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid output format" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Initialize sharp instance
    const sharpInstance = sharp(buffer);

    // Get image metadata
    const metadata = await sharpInstance.metadata();

    // Configure output based on format
    let outputBuffer: Buffer;

    switch (format) {
      case "webp":
        if (lossless) {
          // WebP lossless with maximum compression
          outputBuffer = await sharpInstance
            .webp({
              lossless: true,
              nearLossless: nearLossless,
              effort: effort, // 0-6, where 6 is slowest/best compression
              quality: 100, // For lossless, this doesn't affect quality but can affect compression
            })
            .toBuffer();
        } else {
          // WebP lossy
          outputBuffer = await sharpInstance
            .webp({
              quality: quality,
              effort: effort,
              smartSubsample: true, // Better color subsampling
              reductionEffort: 6, // Maximum reduction effort
            })
            .toBuffer();
        }
        break;

      case "avif":
        outputBuffer = await sharpInstance
          .avif({
            quality: quality,
            lossless: lossless,
            effort: effort,
            chromaSubsampling: lossless ? "4:4:4" : "4:2:0",
          })
          .toBuffer();
        break;

      case "png":
        outputBuffer = await sharpInstance
          .png({
            compressionLevel: 9, // Maximum compression
            quality: 100,
            effort: 10, // Maximum effort for PNG
            palette: true, // Use palette when possible for smaller files
          })
          .toBuffer();
        break;

      case "jpeg":
        outputBuffer = await sharpInstance
          .jpeg({
            quality: quality,
            mozjpeg: true, // Use mozjpeg encoder for better compression
            chromaSubsampling: quality >= 90 ? "4:4:4" : "4:2:0",
            optimizeCoding: true,
            trellisQuantisation: true,
          })
          .toBuffer();
        break;

      default:
        return NextResponse.json(
          { error: "Unsupported format" },
          { status: 400 }
        );
    }

    // Get output info
    const outputInfo = await sharp(outputBuffer).metadata();

    // Return the converted image
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": `image/${format}`,
        "Content-Length": outputBuffer.length.toString(),
        "X-Original-Size": file.size.toString(),
        "X-Converted-Size": outputBuffer.length.toString(),
        "X-Compression-Ratio": (file.size / outputBuffer.length).toFixed(2),
        "X-Original-Format": metadata.format || "unknown",
        "X-Image-Width": (outputInfo.width || 0).toString(),
        "X-Image-Height": (outputInfo.height || 0).toString(),
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      {
        error: "Conversion failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
