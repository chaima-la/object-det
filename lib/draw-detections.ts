export interface DetectedObject {
  name: string
  confidence: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface DrawOptions {
  /** Scale factors to convert from original coordinates to canvas coordinates */
  scaleX?: number
  scaleY?: number
  /** Line width for bounding boxes */
  lineWidth?: number
  /** Font size for labels */
  fontSize?: number
  /** Label padding */
  padding?: number
  /** Minimum confidence threshold to display (0-1) */
  minConfidence?: number
  /** Custom color palette */
  colors?: string[]
  /** Show confidence percentage in label */
  showConfidence?: boolean
  /** Show only the class name without confidence */
  labelFormat?: "full" | "name-only" | "confidence-only"
  /** Corner radius for boxes (0 for sharp corners) */
  cornerRadius?: number
  /** Box fill opacity (0-1, 0 for no fill) */
  fillOpacity?: number
}

// Default color palette - vibrant, accessible colors
const DEFAULT_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#14b8a6", // teal
]

/**
 * Generate a consistent color for a given class name
 * Same class will always get the same color
 */
export function getColorForClass(className: string, colors: string[] = DEFAULT_COLORS): string {
  let hash = 0
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Format the label text based on options
 */
function formatLabel(obj: DetectedObject, format: DrawOptions["labelFormat"]): string {
  const confidenceStr = `${Math.round(obj.confidence * 100)}%`

  switch (format) {
    case "name-only":
      return obj.name
    case "confidence-only":
      return confidenceStr
    case "full":
    default:
      return `${obj.name} ${confidenceStr}`
  }
}

/**
 * Draw a rounded rectangle
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  if (radius === 0) {
    ctx.rect(x, y, width, height)
    return
  }

  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Draw detection results (bounding boxes + labels) on a canvas
 * Works with both images and video frames
 */
export function drawDetections(
  ctx: CanvasRenderingContext2D,
  objects: DetectedObject[],
  options: DrawOptions = {},
): void {
  const {
    scaleX = 1,
    scaleY = 1,
    lineWidth = 3,
    fontSize = 14,
    padding = 6,
    minConfidence = 0,
    colors = DEFAULT_COLORS,
    labelFormat = "full",
    cornerRadius = 0,
    fillOpacity = 0,
  } = options

  // Filter by confidence threshold
  const filteredObjects = objects.filter((obj) => obj.confidence >= minConfidence)

  filteredObjects.forEach((obj) => {
    const color = getColorForClass(obj.name, colors)

    // Scale coordinates
    const x = obj.box.x * scaleX
    const y = obj.box.y * scaleY
    const width = obj.box.width * scaleX
    const height = obj.box.height * scaleY

    // Draw box fill if opacity > 0
    if (fillOpacity > 0) {
      ctx.save()
      ctx.globalAlpha = fillOpacity
      ctx.fillStyle = color
      ctx.beginPath()
      roundedRect(ctx, x, y, width, height, cornerRadius)
      ctx.fill()
      ctx.restore()
    }

    // Draw bounding box stroke
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    roundedRect(ctx, x, y, width, height, cornerRadius)
    ctx.stroke()

    // Draw label
    const label = formatLabel(obj, labelFormat)
    ctx.font = `bold ${fontSize}px sans-serif`
    const textMetrics = ctx.measureText(label)
    const textHeight = fontSize + 4
    const labelWidth = textMetrics.width + padding * 2
    const labelHeight = textHeight + padding

    // Label background
    ctx.fillStyle = color
    ctx.beginPath()
    roundedRect(ctx, x - 1, y - labelHeight - 2, labelWidth, labelHeight, cornerRadius > 0 ? 4 : 0)
    ctx.fill()

    // Label text
    ctx.fillStyle = "#ffffff"
    ctx.fillText(label, x + padding - 1, y - padding - 4)
  })
}

/**
 * Clear the canvas and optionally draw a video/image frame first
 */
export function clearAndDrawFrame(
  ctx: CanvasRenderingContext2D,
  source?: HTMLVideoElement | HTMLImageElement | null,
  canvasWidth?: number,
  canvasHeight?: number,
): void {
  const width = canvasWidth ?? ctx.canvas.width
  const height = canvasHeight ?? ctx.canvas.height

  ctx.clearRect(0, 0, width, height)

  if (source) {
    ctx.drawImage(source, 0, 0, width, height)
  }
}

/**
 * Draw detections on a video element with real-time updates
 * Returns cleanup function to stop the animation loop
 */
export function drawDetectionsOnVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  getDetections: () => DetectedObject[],
  options: DrawOptions = {},
): () => void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return () => {}

  let animationId: number

  const draw = () => {
    // Sync canvas size with video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    // Clear canvas (video is behind, so we only draw boxes)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw detections
    const objects = getDetections()
    drawDetections(ctx, objects, options)

    animationId = requestAnimationFrame(draw)
  }

  draw()

  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  }
}

/**
 * Draw detections on an image canvas
 * Handles loading, scaling, and drawing in one call
 */
export async function drawDetectionsOnImage(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  objects: DetectedObject[],
  originalWidth: number,
  originalHeight: number,
  options: DrawOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      reject(new Error("Could not get canvas context"))
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      // Calculate scale factors
      const scaleX = canvas.width / originalWidth
      const scaleY = canvas.height / originalHeight

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw detections with scaling
      drawDetections(ctx, objects, {
        ...options,
        scaleX,
        scaleY,
      })

      resolve()
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = imageSrc
  })
}
