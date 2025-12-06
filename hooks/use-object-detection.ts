"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { applyNMS } from "@/lib/nms"

const DEFAULT_MIN_CONFIDENCE = 0.5
const DEFAULT_IOU_THRESHOLD = 0.5

export type ModelBase = "lite_mobilenet_v2" | "mobilenet_v1" | "mobilenet_v2"

export interface AccuracyMode {
  name: string
  base: ModelBase
  description: string
  minConfidence: number
  maxImageSize: number
}

export const ACCURACY_MODES: Record<"fast" | "balanced" | "high", AccuracyMode> = {
  fast: {
    name: "Fast",
    base: "lite_mobilenet_v2",
    description: "Fastest detection, lower accuracy",
    minConfidence: 0.4,
    maxImageSize: 640,
  },
  balanced: {
    name: "Balanced",
    base: "mobilenet_v1",
    description: "Good balance of speed and accuracy",
    minConfidence: 0.5,
    maxImageSize: 1024,
  },
  high: {
    name: "High Accuracy",
    base: "mobilenet_v2",
    description: "Best accuracy, slower detection",
    minConfidence: 0.3,
    maxImageSize: 1920,
  },
}

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
  filterInfo?: {
    minConfidence: number
    totalDetections: number
    filteredCount: number
  }
  nmsInfo?: {
    iouThreshold: number
    suppressedCount: number
  }
  modelInfo?: {
    base: ModelBase
    accuracyMode: string
  }
}

export interface DetectionOptions {
  minConfidence?: number
  iouThreshold?: number
  accuracyMode?: keyof typeof ACCURACY_MODES
}

interface UseObjectDetectionReturn {
  detect: (file: File, options?: DetectionOptions) => Promise<DetectionResult | null>
  loading: boolean
  error: string | null
  clearError: () => void
  modelLoading: boolean
  currentModelBase: ModelBase
  setAccuracyMode: (mode: keyof typeof ACCURACY_MODES) => void
  accuracyMode: keyof typeof ACCURACY_MODES
  defaultMinConfidence: number
  defaultIoUThreshold: number
}

const modelCache: Map<ModelBase, Promise<cocoSsd.ObjectDetection>> = new Map()

function getModel(base: ModelBase): Promise<cocoSsd.ObjectDetection> {
  if (!modelCache.has(base)) {
    const promise = (async () => {
      await tf.ready()
      return cocoSsd.load({ base })
    })()
    modelCache.set(base, promise)
  }
  return modelCache.get(base)!
}

export function useObjectDetection(): UseObjectDetectionReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelLoading, setModelLoading] = useState(true)
  const [accuracyMode, setAccuracyMode] = useState<keyof typeof ACCURACY_MODES>("balanced")
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const currentBaseRef = useRef<ModelBase>("mobilenet_v1")

  const currentMode = ACCURACY_MODES[accuracyMode]

  // Preload model on mount and when accuracy mode changes
  useEffect(() => {
    setModelLoading(true)
    getModel(currentMode.base)
      .then((model) => {
        modelRef.current = model
        currentBaseRef.current = currentMode.base
        setModelLoading(false)
      })
      .catch(() => {
        setError("Failed to load detection model")
        setModelLoading(false)
      })
  }, [currentMode.base])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const detect = useCallback(
    async (file: File, options?: DetectionOptions): Promise<DetectionResult | null> => {
      setLoading(true)
      setError(null)

      try {
        // Use the mode from options or current state
        const mode = options?.accuracyMode ? ACCURACY_MODES[options.accuracyMode] : currentMode
        const base = mode.base

        // Ensure correct model is loaded
        let model = modelRef.current
        if (!model || currentBaseRef.current !== base) {
          model = await getModel(base)
          modelRef.current = model
          currentBaseRef.current = base
        }

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

        const minConfidence = options?.minConfidence ?? mode.minConfidence
        const iouThreshold = options?.iouThreshold ?? DEFAULT_IOU_THRESHOLD
        const totalDetections = predictions.length

        // Filter by confidence
        const filteredPredictions = predictions.filter((pred) => pred.score >= minConfidence)

        // Transform results
        const detections: DetectedObject[] = filteredPredictions.map((pred) => ({
          name: pred.class,
          confidence: pred.score,
          box: {
            x: pred.bbox[0],
            y: pred.bbox[1],
            width: pred.bbox[2],
            height: pred.bbox[3],
          },
        }))

        const { kept, suppressed } = applyNMS(detections, iouThreshold, true)

        return {
          objects: kept,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight,
          filterInfo: {
            minConfidence,
            totalDetections,
            filteredCount: totalDetections - filteredPredictions.length,
          },
          nmsInfo: {
            iouThreshold,
            suppressedCount: suppressed,
          },
          modelInfo: {
            base,
            accuracyMode: mode.name,
          },
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [currentMode],
  )

  return {
    detect,
    loading,
    error,
    clearError,
    modelLoading,
    currentModelBase: currentBaseRef.current,
    setAccuracyMode,
    accuracyMode,
    defaultMinConfidence: currentMode.minConfidence,
    defaultIoUThreshold: DEFAULT_IOU_THRESHOLD,
  }
}
