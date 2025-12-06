"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"

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

export interface DetectionResult {
  objects: DetectedObject[]
  imageWidth: number
  imageHeight: number
}

interface UseObjectDetectionReturn {
  detect: (file: File) => Promise<DetectionResult | null>
  loading: boolean
  error: string | null
  clearError: () => void
  modelLoading: boolean
}

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null

function getModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready()
      return cocoSsd.load()
    })()
  }
  return modelPromise
}

export function useObjectDetection(): UseObjectDetectionReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(true)
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)

  // Preload model on mount
  useEffect(() => {
    getModel()
      .then((model) => {
        modelRef.current = model
        setModelLoading(false)
      })
      .catch((err) => {
        setError("Failed to load detection model")
        setModelLoading(false)
      })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const detect = useCallback(async (file: File): Promise<DetectionResult | null> => {
    setLoading(true)
    setError(null)

    try {
      // Ensure model is loaded
      const model = modelRef.current || (await getModel())
      modelRef.current = model

      // Create image element from file
      const imageUrl = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error("Failed to load image"))
        image.src = imageUrl
      })

      // Run detection
      const predictions = await model.detect(img)

      // Clean up
      URL.revokeObjectURL(imageUrl)

      // Transform results
      const objects: DetectedObject[] = predictions.map((pred) => ({
        name: pred.class,
        confidence: pred.score,
        box: {
          x: pred.bbox[0],
          y: pred.bbox[1],
          width: pred.bbox[2],
          height: pred.bbox[3],
        },
      }))

      return {
        objects,
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { detect, loading, error, clearError, modelLoading }
}
