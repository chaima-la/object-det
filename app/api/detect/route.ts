import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"

// ============================================
// Types & Schema
// ============================================
const DetectionSchema = z.object({
  objects: z
    .array(
      z.object({
        name: z.string().describe("The name/label of the detected object"),
        confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
        box: z
          .object({
            x: z.number().describe("X coordinate of the bounding box (percentage of image width, 0-100)"),
            y: z.number().describe("Y coordinate of the bounding box (percentage of image width, 0-100)"),
            width: z.number().describe("Width of the bounding box (percentage of image width, 0-100)"),
            height: z.number().describe("Height of the bounding box (percentage of image height, 0-100)"),
          })
          .describe("Bounding box coordinates as percentages of image dimensions"),
        description: z.string().optional().describe("Brief description of the object"),
      }),
    )
    .describe("List of detected objects in the image"),
  scene: z.string().optional().describe("Brief description of the overall scene"),
})

interface DetectionResponse {
  objects: Array<{
    name: string
    confidence: number
    box: {
      x: number
      y: number
      width: number
      height: number
    }
    description?: string
  }>
  scene?: string
  modelInfo: {
    model: string
    provider: string
  }
}

interface ErrorResponse {
  error: string
  details?: string
}

// ============================================
// Image Processing Utilities
// ============================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BASE64_SIZE = 15 * 1024 * 1024 // 15MB for base64

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    }
  }

  return { valid: true }
}

function validateBase64(
  base64String: string,
  mimeType?: string,
): { valid: boolean; error?: string; dataUrl?: string; detectedMimeType?: string } {
  try {
    let cleanBase64 = base64String
    let detectedMimeType = mimeType || "image/jpeg"

    if (base64String.startsWith("data:")) {
      const matches = base64String.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return { valid: false, error: "Invalid data URI format" }
      }
      detectedMimeType = matches[1]
      cleanBase64 = matches[2]
    }

    if (!ALLOWED_TYPES.includes(detectedMimeType)) {
      return {
        valid: false,
        error: `Invalid image type. Allowed types: ${ALLOWED_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
      }
    }

    if (cleanBase64.length > MAX_BASE64_SIZE) {
      return {
        valid: false,
        error: `Image too large. Maximum size: ${MAX_BASE64_SIZE / (1024 * 1024)}MB`,
      }
    }

    // Construct proper data URL for the AI model
    const dataUrl = `data:${detectedMimeType};base64,${cleanBase64}`

    return { valid: true, dataUrl, detectedMimeType }
  } catch {
    return { valid: false, error: "Invalid base64 encoding" }
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString("base64")
  return `data:${file.type};base64,${base64}`
}

// ============================================
// AI Detection
// ============================================
async function runDetection(imageDataUrl: string): Promise<{
  objects: DetectionResponse["objects"]
  scene?: string
}> {
  const { object } = await generateObject({
    model: "openai/gpt-4o",
    schema: DetectionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this image and detect all objects. For each object:
1. Provide the object name/label
2. Estimate a confidence score (0-1) based on how certain you are
3. Provide bounding box coordinates as PERCENTAGES of the image dimensions (0-100 for x, y, width, height)
4. Optionally add a brief description

Also provide a brief scene description.

Be thorough and detect all visible objects including:
- People and their attributes
- Animals
- Vehicles
- Furniture
- Electronics
- Food items
- Text/signs
- Clothing
- Nature elements
- Any other identifiable objects

Provide accurate bounding boxes that tightly fit each object.`,
          },
          {
            type: "image",
            image: imageDataUrl,
          },
        ],
      },
    ],
    maxOutputTokens: 4000,
  })

  return {
    objects: object.objects,
    scene: object.scene,
  }
}

// ============================================
// Main API Handler
// ============================================
export async function POST(request: NextRequest): Promise<NextResponse<DetectionResponse | ErrorResponse>> {
  try {
    const contentType = request.headers.get("content-type") || ""

    let imageDataUrl: string

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("image") as File | null

      if (!file) {
        return NextResponse.json(
          {
            error: "No image file provided",
            details: "Please include an 'image' field in your form data",
          },
          { status: 400 },
        )
      }

      const validation = validateFile(file)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: "Invalid file",
            details: validation.error,
          },
          { status: 400 },
        )
      }

      imageDataUrl = await fileToDataUrl(file)
    } else if (contentType.includes("application/json")) {
      let body: { image: string; mimeType?: string }
      try {
        body = await request.json()
      } catch {
        return NextResponse.json(
          {
            error: "Invalid JSON",
            details: "Request body must be valid JSON",
          },
          { status: 400 },
        )
      }

      if (!body.image) {
        return NextResponse.json(
          {
            error: "No image provided",
            details: "Please include an 'image' field with base64-encoded image data",
          },
          { status: 400 },
        )
      }

      const validation = validateBase64(body.image, body.mimeType)
      if (!validation.valid || !validation.dataUrl) {
        return NextResponse.json(
          {
            error: "Invalid image data",
            details: validation.error,
          },
          { status: 400 },
        )
      }

      imageDataUrl = validation.dataUrl
    } else {
      return NextResponse.json(
        {
          error: "Unsupported content type",
          details: "Use multipart/form-data or application/json",
        },
        { status: 400 },
      )
    }

    const { objects, scene } = await runDetection(imageDataUrl)

    return NextResponse.json({
      objects,
      scene,
      modelInfo: {
        model: "gpt-4o",
        provider: "OpenAI",
      },
    })
  } catch (error) {
    console.error("[API] Detection error:", error)

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Detection failed",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        details: "Please try again later",
      },
      { status: 500 },
    )
  }
}

// ============================================
// GET handler for health check
// ============================================
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    model: {
      name: "GPT-4o",
      provider: "OpenAI (via Vercel AI Gateway)",
      capabilities: [
        "High-accuracy object detection",
        "Scene understanding",
        "Object relationships",
        "Text recognition",
        "Detailed descriptions",
      ],
    },
    supportedFormats: ALLOWED_TYPES.map((t) => t.split("/")[1]),
    maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    supportedContentTypes: ["multipart/form-data (file upload)", "application/json (base64 image)"],
  })
}
