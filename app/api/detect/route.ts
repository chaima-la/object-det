import { type NextRequest, NextResponse } from "next/server"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import sharp from "sharp"

// ============================================
// Types
// ============================================
interface DetectedObject {
  name: string
  confidence: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface DetectionResponse {
  objects: DetectedObject[]
}

interface ErrorResponse {
  error: string
  details?: string
}

// ============================================
// Model Cache (prevents reloading on every request)
// ============================================
let cachedModel: cocoSsd.ObjectDetection | null = null
let modelLoadingPromise: Promise<cocoSsd.ObjectDetection> | null = null

async function getModel(): Promise<cocoSsd.ObjectDetection> {
  // Return cached model if available
  if (cachedModel) {
    return cachedModel
  }

  // If model is currently loading, wait for it
  if (modelLoadingPromise) {
    return modelLoadingPromise
  }

  // Load the model
  modelLoadingPromise = (async () => {
    try {
      await tf.ready()
      // Use lite_mobilenet_v2 for faster inference
      const model = await cocoSsd.load({
        base: "lite_mobilenet_v2",
      })
      cachedModel = model
      return model
    } catch (error) {
      modelLoadingPromise = null
      throw error
    }
  })()

  return modelLoadingPromise
}

// ============================================
// Image Processing Utilities
// ============================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.map((t) => t.split("/")[1]).join(", ")}`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  // Check if file has content
  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty",
    }
  }

  return { valid: true }
}

async function processImageWithSharp(file: File): Promise<{ tensor: tf.Tensor3D; width: number; height: number }> {
  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Use sharp to decode and get raw pixel data
  const image = sharp(buffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions")
  }

  // Convert to raw RGB pixels
  const { data, info } = await image
    .removeAlpha() // Remove alpha channel, keep RGB only
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Create tensor from raw pixel data [height, width, 3]
  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32")

  return {
    tensor: tensor as tf.Tensor3D,
    width: info.width,
    height: info.height,
  }
}

// ============================================
// Main API Handler
// ============================================
export async function POST(request: NextRequest): Promise<NextResponse<DetectionResponse | ErrorResponse>> {
  let imageTensor: tf.Tensor3D | null = null

  try {
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get("image") as File | null

    // Validate file presence
    if (!file) {
      return NextResponse.json(
        {
          error: "No image file provided",
          details: "Please include an 'image' field in your form data",
        },
        { status: 400 },
      )
    }

    // Validate file type and size
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

    // Load model (cached after first load)
    const model = await getModel()

    // Process image using sharp
    const { tensor } = await processImageWithSharp(file)
    imageTensor = tensor

    // Run object detection
    const predictions = await model.detect(imageTensor)

    // Format results to match required schema
    const objects: DetectedObject[] = predictions.map((prediction) => ({
      name: prediction.class,
      confidence: Math.round(prediction.score * 100) / 100, // Round to 2 decimal places
      box: {
        x: Math.round(prediction.bbox[0]),
        y: Math.round(prediction.bbox[1]),
        width: Math.round(prediction.bbox[2]),
        height: Math.round(prediction.bbox[3]),
      },
    }))

    // Clean up tensor memory
    imageTensor.dispose()

    return NextResponse.json({ objects })
  } catch (error) {
    // Clean up tensor if it exists
    if (imageTensor) {
      imageTensor.dispose()
    }

    // Handle specific error types
    if (error instanceof Error) {
      // Image processing errors
      if (error.message.includes("decode") || error.message.includes("sharp")) {
        return NextResponse.json(
          {
            error: "Failed to decode image",
            details: "The image file may be corrupted or in an unsupported format",
          },
          { status: 400 },
        )
      }

      // Model loading errors
      if (error.message.includes("model") || error.message.includes("load")) {
        return NextResponse.json(
          {
            error: "Failed to load AI model",
            details: "Please try again in a few moments",
          },
          { status: 503 },
        )
      }

      // Generic error with message
      return NextResponse.json(
        {
          error: "Detection failed",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Unknown error
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
  try {
    const model = await getModel()
    return NextResponse.json({
      status: "healthy",
      modelLoaded: !!model,
      supportedFormats: ALLOWED_TYPES.map((t) => t.split("/")[1]),
      maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    })
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        modelLoaded: false,
      },
      { status: 503 },
    )
  }
}
