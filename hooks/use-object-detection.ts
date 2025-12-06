"use client"

import { useState, useCallback } from "react"

export interface DetectedObject {
  name: string
  confidence: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
  description?: string
}

export interface DetectionResult {
  objects: DetectedObject[]
  imageWidth: number
  imageHeight: number
  scene?: string
  modelInfo: {
    model: string
    provider: string
  }
}

interface UseObjectDetectionReturn {
  detect: (file: File) => Promise<DetectionResult | null>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useObjectDetection(): UseObjectDetectionReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const detect = useCallback(async (file: File): Promise<DetectionResult | null> => {
    setLoading(true)
    setError(null)

    try {
      // Get image dimensions first
      const imageUrl = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("Failed to load image"))
        image.src = imageUrl
      })

      const imageWidth = img.naturalWidth
      const imageHeight = img.naturalHeight
      URL.revokeObjectURL(imageUrl)

      // Send to API
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/detect", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || "Detection failed")
      }

      const data = await response.json()

      const objects: DetectedObject[] = data.objects.map(
        (obj: {
          name: string
          confidence: number
          box: { x: number; y: number; width: number; height: number }
          description?: string
        }) => ({
          name: obj.name,
          confidence: obj.confidence,
          description: obj.description,
          box: {
            x: (obj.box.x / 100) * imageWidth,
            y: (obj.box.y / 100) * imageHeight,
            width: (obj.box.width / 100) * imageWidth,
            height: (obj.box.height / 100) * imageHeight,
          },
        }),
      )

      return {
        objects,
        imageWidth,
        imageHeight,
        scene: data.scene,
        modelInfo: data.modelInfo,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    detect,
    loading,
    error,
    clearError,
  }
}
