import { type NextRequest, NextResponse } from "next/server"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import sharp from "sharp"
import { applyNMS, validateIoUThreshold, type DetectionWithBox } from "@/lib/nms"

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
  modelInfo?: {
    base: string
    loadTime?: number
  }
  filterInfo?: {
    minConfidence: number
    totalDetections: number
    filteredCount: number
  }
  nmsInfo?: {
    iouThreshold: number
    suppressedCount: number
  }
}

interface ErrorResponse {
  error: string
  details?: string
}

interface Base64RequestBody {
  image: string
  mimeType?: string
}

type ModelBase = "lite_mobilenet_v2" | "mobilenet_v1" | "mobilenet_v2"

interface ModelConfig {
  base: ModelBase
  description: string
  accuracy: "fast" | "balanced" | "high"
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  lite_mobilenet_v2: {
    base: "lite_mobilenet_v2",
    description: "Fastest, lower accuracy - ideal for real-time detection",
    accuracy: "fast",
  },
  mobilenet_v1: {
    base: "mobilenet_v1",
    description: "Balanced speed and accuracy",
    accuracy: "balanced",
  },
  mobilenet_v2: {
    base: "mobilenet_v2",
    description: "Highest accuracy, slower - ideal for image uploads",
    accuracy: "high",
  },
}

function getModelBase(): ModelBase {
  const envModel = process.env.MODEL_BASE || process.env.MODEL_PATH
  if (envModel && envModel in MODEL_CONFIGS) {
    return envModel as ModelBase
  }
  // Default to mobilenet_v2 for higher accuracy
  return "mobilenet_v2"
}

// ============================================
// Model Cache (prevents reloading on every request)
// ============================================
const modelCache: Map<ModelBase, cocoSsd.ObjectDetection> = new Map()
const loadingPromises: Map<ModelBase, Promise<cocoSsd.ObjectDetection>> = new Map()

async function getModel(base?: ModelBase): Promise<{ model: cocoSsd.ObjectDetection; base: ModelBase }> {
  const modelBase = base || getModelBase()

  // Check cache first
  const cachedModel = modelCache.get(modelBase)
  if (cachedModel) {
    return { model: cachedModel, base: modelBase }
  }

  // Check if already loading
  const existingPromise = loadingPromises.get(modelBase)
  if (existingPromise) {
    const model = await existingPromise
    return { model, base: modelBase }
  }

  // Load new model
  const loadPromise = (async () => {
    try {
      await tf.ready()
      console.log(`[API] Loading COCO-SSD model with base: ${modelBase}`)
      const startTime = Date.now()

      const model = await cocoSsd.load({
        base: modelBase,
      })

      const loadTime = Date.now() - startTime
      console.log(`[API] Model loaded in ${loadTime}ms`)

      modelCache.set(modelBase, model)
      return model
    } catch (error) {
      loadingPromises.delete(modelBase)
      throw error
    }
  })()

  loadingPromises.set(modelBase, loadPromise)
  const model = await loadPromise
  return { model, base: modelBase }
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

function validateBase64(base64String: string, mimeType?: string): { valid: boolean; error?: string; buffer?: Buffer } {
  try {
    let cleanBase64 = base64String
    let detectedMimeType = mimeType

    if (base64String.startsWith("data:")) {
      const matches = base64String.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return { valid: false, error: "Invalid data URI format" }
      }
      detectedMimeType = matches[1]
      cleanBase64 = matches[2]
    }

    if (detectedMimeType && !ALLOWED_TYPES.includes(detectedMimeType)) {
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

    const buffer = Buffer.from(cleanBase64, "base64")

    if (buffer.length === 0) {
      return { valid: false, error: "Empty image data" }
    }

    return { valid: true, buffer }
  } catch {
    return { valid: false, error: "Invalid base64 encoding" }
  }
}

async function processImageBuffer(buffer: Buffer): Promise<{ tensor: tf.Tensor3D; width: number; height: number }> {
  const image = sharp(buffer)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions")
  }

  let processedImage = image
  const maxDimension = 1280
  if (metadata.width > maxDimension || metadata.height > maxDimension) {
    processedImage = image.resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  const { data, info } = await processedImage.removeAlpha().raw().toBuffer({ resolveWithObject: true })

  const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32")

  return {
    tensor: tensor as tf.Tensor3D,
    width: info.width,
    height: info.height,
  }
}

const DEFAULT_MIN_CONFIDENCE = 0.5
const MIN_CONFIDENCE_FLOOR = 0.0
const MIN_CONFIDENCE_CEILING = 1.0

function getMinConfidence(): number {
  const envThreshold = process.env.MIN_CONFIDENCE || process.env.CONFIDENCE_THRESHOLD
  if (envThreshold) {
    const parsed = Number.parseFloat(envThreshold)
    if (!isNaN(parsed) && parsed >= MIN_CONFIDENCE_FLOOR && parsed <= MIN_CONFIDENCE_CEILING) {
      return parsed
    }
  }
  return DEFAULT_MIN_CONFIDENCE
}

function validateConfidence(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null
  }
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value)
  if (!isNaN(num) && num >= MIN_CONFIDENCE_FLOOR && num <= MIN_CONFIDENCE_CEILING) {
    return num
  }
  return null
}

const DEFAULT_IOU_THRESHOLD = 0.5
const IOU_THRESHOLD_FLOOR = 0.0
const IOU_THRESHOLD_CEILING = 1.0

function getIoUThreshold(): number {
  const envThreshold = process.env.IOU_THRESHOLD || process.env.NMS_THRESHOLD
  if (envThreshold) {
    const parsed = Number.parseFloat(envThreshold)
    if (!isNaN(parsed) && parsed > IOU_THRESHOLD_FLOOR && parsed <= IOU_THRESHOLD_CEILING) {
      return parsed
    }
  }
  return DEFAULT_IOU_THRESHOLD
}

async function runDetection(
  buffer: Buffer,
  modelBase?: ModelBase,
  minConfidence?: number,
  iouThreshold?: number,
): Promise<{
  objects: DetectedObject[]
  base: ModelBase
  filterInfo: { minConfidence: number; totalDetections: number; filteredCount: number }
  nmsInfo: { iouThreshold: number; suppressedCount: number }
}> {
  let imageTensor: tf.Tensor3D | null = null

  try {
    const { model, base } = await getModel(modelBase)
    const { tensor } = await processImageBuffer(buffer)
    imageTensor = tensor

    const predictions = await model.detect(imageTensor)

    const threshold = minConfidence ?? getMinConfidence()
    const totalDetections = predictions.length

    const filteredPredictions = predictions.filter((prediction) => prediction.score >= threshold)

    const detections: DetectionWithBox[] = filteredPredictions.map((prediction) => ({
      name: prediction.class,
      confidence: Math.round(prediction.score * 100) / 100,
      box: {
        x: Math.round(prediction.bbox[0]),
        y: Math.round(prediction.bbox[1]),
        width: Math.round(prediction.bbox[2]),
        height: Math.round(prediction.bbox[3]),
      },
    }))

    const nmsThreshold = iouThreshold ?? getIoUThreshold()
    const { kept, suppressed } = applyNMS(detections, nmsThreshold, true)

    imageTensor.dispose()
    return {
      objects: kept,
      base,
      filterInfo: {
        minConfidence: threshold,
        totalDetections,
        filteredCount: totalDetections - filteredPredictions.length,
      },
      nmsInfo: {
        iouThreshold: nmsThreshold,
        suppressedCount: suppressed,
      },
    }
  } catch (error) {
    if (imageTensor) {
      imageTensor.dispose()
    }
    throw error
  }
}

// ============================================
// Main API Handler
// ============================================
export async function POST(request: NextRequest): Promise<NextResponse<DetectionResponse | ErrorResponse>> {
  try {
    const contentType = request.headers.get("content-type") || ""
    const url = new URL(request.url)
    const requestedModel = url.searchParams.get("model") as ModelBase | null
    const queryConfidence = validateConfidence(
      url.searchParams.get("minConfidence") || url.searchParams.get("confidence"),
    )
    const queryIoU = validateIoUThreshold(url.searchParams.get("iouThreshold") || url.searchParams.get("nmsThreshold"))

    let imageBuffer: Buffer
    let bodyConfidence: number | null = null
    let bodyIoU: number | null = null

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("image") as File | null
      const formConfidence = formData.get("minConfidence") || formData.get("confidence")
      const formIoU = formData.get("iouThreshold") || formData.get("nmsThreshold")
      if (formConfidence) {
        bodyConfidence = validateConfidence(formConfidence.toString())
      }
      if (formIoU) {
        bodyIoU = validateIoUThreshold(formIoU.toString())
      }

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

      const arrayBuffer = await file.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else if (contentType.includes("application/json")) {
      let body: Base64RequestBody & {
        model?: ModelBase
        minConfidence?: number
        confidence?: number
        iouThreshold?: number
        nmsThreshold?: number
      }
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

      bodyConfidence = validateConfidence(body.minConfidence ?? body.confidence)
      bodyIoU = validateIoUThreshold(body.iouThreshold ?? body.nmsThreshold)

      const validation = validateBase64(body.image, body.mimeType)
      if (!validation.valid || !validation.buffer) {
        return NextResponse.json(
          {
            error: "Invalid image data",
            details: validation.error,
          },
          { status: 400 },
        )
      }

      imageBuffer = validation.buffer
    } else {
      try {
        const arrayBuffer = await request.arrayBuffer()
        if (arrayBuffer.byteLength === 0) {
          return NextResponse.json(
            {
              error: "No image data provided",
              details: "Request body is empty",
            },
            { status: 400 },
          )
        }

        if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              error: "Image too large",
              details: `Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
            { status: 400 },
          )
        }

        imageBuffer = Buffer.from(arrayBuffer)
      } catch {
        return NextResponse.json(
          {
            error: "Failed to read request body",
            details: "Could not parse image data from request",
          },
          { status: 400 },
        )
      }
    }

    const minConfidence = queryConfidence ?? bodyConfidence ?? undefined
    const iouThreshold = queryIoU ?? bodyIoU ?? undefined
    const { objects, base, filterInfo, nmsInfo } = await runDetection(
      imageBuffer,
      requestedModel || undefined,
      minConfidence,
      iouThreshold,
    )

    return NextResponse.json({
      objects,
      modelInfo: {
        base,
      },
      filterInfo,
      nmsInfo,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("decode") || error.message.includes("sharp")) {
        return NextResponse.json(
          {
            error: "Failed to decode image",
            details: "The image may be corrupted or in an unsupported format",
          },
          { status: 400 },
        )
      }

      if (error.message.includes("model") || error.message.includes("load")) {
        return NextResponse.json(
          {
            error: "Failed to load AI model",
            details: "Please try again in a few moments",
          },
          { status: 503 },
        )
      }

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
  try {
    const currentBase = getModelBase()
    const { model, base } = await getModel()
    const minConfidence = getMinConfidence()
    const iouThreshold = getIoUThreshold()

    return NextResponse.json({
      status: "healthy",
      modelLoaded: !!model,
      currentModel: {
        base,
        ...MODEL_CONFIGS[base],
      },
      confidenceThreshold: {
        current: minConfidence,
        envVar: "MIN_CONFIDENCE or CONFIDENCE_THRESHOLD",
        queryParam: "?minConfidence=0.6 or ?confidence=0.6",
        bodyParam: "{ minConfidence: 0.6 } or { confidence: 0.6 }",
        range: `${MIN_CONFIDENCE_FLOOR} - ${MIN_CONFIDENCE_CEILING}`,
      },
      nmsSettings: {
        current: iouThreshold,
        envVar: "IOU_THRESHOLD or NMS_THRESHOLD",
        queryParam: "?iouThreshold=0.5 or ?nmsThreshold=0.5",
        bodyParam: "{ iouThreshold: 0.5 } or { nmsThreshold: 0.5 }",
        range: `${IOU_THRESHOLD_FLOOR} - ${IOU_THRESHOLD_CEILING}`,
        description: "Lower values = more aggressive suppression, fewer overlapping boxes",
      },
      availableModels: Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
        id: key,
        ...config,
        isCurrent: key === currentBase,
        isCached: modelCache.has(key as ModelBase),
      })),
      supportedFormats: ALLOWED_TYPES.map((t) => t.split("/")[1]),
      maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      supportedContentTypes: [
        "multipart/form-data (file upload)",
        "application/json (base64 image)",
        "application/octet-stream (raw binary)",
      ],
      configuration: {
        envVar: "MODEL_BASE or MODEL_PATH",
        queryParam: "?model=mobilenet_v2",
      },
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
