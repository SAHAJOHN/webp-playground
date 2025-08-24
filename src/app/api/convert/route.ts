import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;


export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const format = formData.get("format") as string;
    const quality = parseInt(formData.get("quality") as string) || 80;
    const lossless = formData.get("lossless") === "true";
    const nearLosslessEnabled = formData.get("nearLossless") === "true";
    const nearLosslessValue = parseInt(formData.get("nearLosslessValue") as string) || 100;
    const effort = parseInt(formData.get("effort") as string) || 6;
    const progressive = formData.get("progressive") === "true";
    const interlace = formData.get("interlace") === "true";
    const chromaSubsampling = formData.get("chromaSubsampling") as string;
    const mozjpeg = formData.get("mozjpeg") !== "false";
    const alphaQuality = parseInt(formData.get("alphaQuality") as string) || 100;
    const preset = formData.get("preset") as string || "default";
    const palette = formData.get("palette") === "true";
    const colors = parseInt(formData.get("colors") as string) || 256;
    const dithering = parseFloat(formData.get("dithering") as string) || 1.0;

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
          const webpOptions: {
            lossless: boolean;
            effort: number;
            quality: number;
            nearLossless?: boolean;
          } = {
            lossless: true,
            effort: Math.min(effort, 6), // WebP only supports 0-6, clamp to max 6
            quality: 100, // For lossless, this doesn't affect quality but can affect compression
          };
          
          // Apply near-lossless if enabled
          if (nearLosslessEnabled && nearLosslessValue < 100) {
            webpOptions.nearLossless = true;
            // Sharp uses quality parameter for near-lossless preprocessing
            // Lower values = more preprocessing = smaller file but slightly lower quality
            webpOptions.quality = nearLosslessValue;
          }
          
          outputBuffer = await sharpInstance
            .webp(webpOptions)
            .toBuffer();
        } else {
          // WebP lossy with advanced options
          const webpLossyOptions: {
            quality: number;
            effort: number;
            smartSubsample: boolean;
            reductionEffort: number;
            alphaQuality: number;
            preset?: "default" | "photo" | "picture" | "drawing" | "icon" | "text";
          } = {
            quality: quality,
            effort: Math.min(effort, 6), // WebP only supports 0-6, clamp to max 6
            smartSubsample: true, // Better color subsampling
            reductionEffort: 6, // Maximum reduction effort
            alphaQuality: alphaQuality, // Alpha channel quality
          };
          
          // Apply preset if not default
          if (preset !== "default") {
            webpLossyOptions.preset = preset as "photo" | "picture" | "drawing" | "icon" | "text";
          }
          
          outputBuffer = await sharpInstance
            .webp(webpLossyOptions)
            .toBuffer();
        }
        break;

      case "avif":
        outputBuffer = await sharpInstance
          .avif({
            quality: lossless ? 100 : quality,
            lossless: lossless,
            effort: effort || 4,
            chromaSubsampling: lossless ? "4:4:4" : "4:2:0",
          })
          .toBuffer();
        break;

      case "png":
        const pngOptions: {
          compressionLevel: number;
          quality: number;
          effort: number;
          progressive: boolean;
          palette?: boolean;
          colors?: number;
          dither?: number;
        } = {
          compressionLevel: 9, // Maximum compression
          quality: 100,
          effort: 10, // Maximum effort for PNG
          progressive: interlace, // Adam7 interlacing
        };
        
        // Apply palette quantization if enabled
        if (palette) {
          pngOptions.palette = true;
          pngOptions.colors = colors; // Number of colors in palette
          pngOptions.dither = dithering; // Dithering amount
        }
        
        outputBuffer = await sharpInstance
          .png(pngOptions)
          .toBuffer();
        break;

      case "jpeg":
        const jpegOptions: {
          quality: number;
          mozjpeg: boolean;
          progressive: boolean;
          optimizeCoding: boolean;
          optimizeScans: boolean;
          trellisQuantisation: boolean;
          chromaSubsampling?: string;
        } = {
          quality: quality,
          mozjpeg: mozjpeg, // Use mozjpeg encoder for better compression
          progressive: progressive, // Enable progressive encoding
          optimizeCoding: true,
          optimizeScans: progressive, // Optimize scan layers for progressive
          trellisQuantisation: true,
        };
        
        // Handle chroma subsampling
        if (chromaSubsampling && chromaSubsampling !== "auto") {
          jpegOptions.chromaSubsampling = chromaSubsampling;
        } else {
          // Auto mode based on quality
          jpegOptions.chromaSubsampling = quality >= 90 ? "4:4:4" : "4:2:0";
        }
        
        outputBuffer = await sharpInstance
          .jpeg(jpegOptions)
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
    return new NextResponse(outputBuffer as unknown as BodyInit, {
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
        "X-Progressive": (format === "jpeg" && progressive).toString(),
        "X-Encoding-Info": format === "jpeg" 
          ? (progressive ? "Progressive JPEG with optimized scans" : "Baseline JPEG")
          : format === "webp" && lossless && nearLosslessEnabled
          ? `Near-lossless WebP (${nearLosslessValue}%)`
          : format === "webp" && lossless
          ? "Lossless WebP"
          : `${format.toUpperCase()} encoded`,
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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
