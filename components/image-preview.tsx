"use client"

import { useEffect, useRef, useState } from "react"
import type { DetectionResult } from "@/hooks/use-object-detection"

interface ImagePreviewProps {
  src: string
  results: DetectionResult | null
  loading: boolean
}

const COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
]

export function ImagePreview({ src, results, loading }: ImagePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = src

    img.onload = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      // Calculate display dimensions maintaining aspect ratio
      const containerWidth = container.clientWidth
      const scale = containerWidth / img.width
      const displayWidth = containerWidth
      const displayHeight = img.height * scale

      setDimensions({ width: displayWidth, height: displayHeight })

      canvas.width = displayWidth
      canvas.height = displayHeight

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight)

      // Draw bounding boxes if results exist
      if (results && results.objects.length > 0) {
        const scaleX = displayWidth / results.imageWidth
        const scaleY = displayHeight / results.imageHeight

        results.objects.forEach((obj, index) => {
          const color = COLORS[index % COLORS.length]
          const x = obj.box.x * scaleX
          const y = obj.box.y * scaleY
          const width = obj.box.width * scaleX
          const height = obj.box.height * scaleY

          // Draw bounding box
          ctx.strokeStyle = color
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, width, height)

          // Draw label background
          const label = `${obj.name} ${(obj.confidence * 100).toFixed(0)}%`
          ctx.font = "bold 14px sans-serif"
          const textMetrics = ctx.measureText(label)
          const textHeight = 20
          const padding = 6

          ctx.fillStyle = color
          ctx.fillRect(x, y - textHeight - padding, textMetrics.width + padding * 2, textHeight + padding)

          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.fillText(label, x + padding, y - padding - 2)
        })
      }
    }
  }, [src, results])

  return (
    <div ref={containerRef} className="relative bg-card border border-border rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-auto" style={{ minHeight: "300px" }} />
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
