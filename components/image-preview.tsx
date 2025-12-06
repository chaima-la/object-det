"use client"

import { useEffect, useRef, useState } from "react"
import type { DetectionResult } from "@/hooks/use-object-detection"
import { drawDetections, clearAndDrawFrame } from "@/lib/draw-detections"

interface ImagePreviewProps {
  src: string
  results: DetectionResult | null
  loading: boolean
}

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

      clearAndDrawFrame(ctx, img, displayWidth, displayHeight)

      if (results && results.objects.length > 0) {
        const scaleX = displayWidth / results.imageWidth
        const scaleY = displayHeight / results.imageHeight

        drawDetections(ctx, results.objects, {
          scaleX,
          scaleY,
          lineWidth: 3,
          fontSize: 14,
          padding: 6,
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
