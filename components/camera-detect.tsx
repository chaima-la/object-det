"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import * as tf from "@tensorflow/tfjs"
import * as cocoSsd from "@tensorflow-models/coco-ssd"
import { Camera, CameraOff, SwitchCamera, Loader2 } from "lucide-react"
import { drawDetections, getColorForClass, type DetectedObject } from "@/lib/draw-detections"
import { AccuracyModeSelector } from "./accuracy-mode-selector"
import { ACCURACY_MODES, type ModelBase } from "@/hooks/use-object-detection"
import { applyNMS } from "@/lib/nms"

type CameraFacing = "user" | "environment"

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

export function CameraDetect() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment")
  const [modelLoading, setModelLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([])
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [accuracyMode, setAccuracyMode] = useState<keyof typeof ACCURACY_MODES>("balanced")

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null)
  const currentBaseRef = useRef<ModelBase>("mobilenet_v1")

  const currentMode = ACCURACY_MODES[accuracyMode]

  // Load the model on mount and when accuracy mode changes
  useEffect(() => {
    setModelLoading(true)
    getModel(currentMode.base)
      .then((model) => {
        modelRef.current = model
        currentBaseRef.current = currentMode.base
        setModelLoading(false)
      })
      .catch(() => {
        setError("Failed to load AI detection model")
        setModelLoading(false)
      })

    // Check for multiple cameras
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((d) => d.kind === "videoinput")
      setHasMultipleCameras(videoDevices.length > 1)
    })

    return () => {
      stopCamera()
    }
  }, [currentMode.base])

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setDetecting(false)
    setDetectedObjects([])
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not supported in this browser")
      return
    }

    try {
      // Stop any existing stream
      stopCamera()

      const maxSize = currentMode.maxImageSize
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: maxSize },
          height: { ideal: Math.round(maxSize * 0.5625) }, // 16:9 aspect ratio
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        startDetection()
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Please allow camera permissions.")
        } else if (err.name === "NotFoundError") {
          setError("No camera device found on this device.")
        } else if (err.name === "NotReadableError") {
          setError("Camera is already in use by another application.")
        } else {
          setError(`Camera error: ${err.message}`)
        }
      } else {
        setError("Failed to access camera")
      }
    }
  }, [cameraFacing, stopCamera, currentMode.maxImageSize])

  const startDetection = useCallback(() => {
    if (!modelRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const frameSkip = accuracyMode === "high" ? 3 : accuracyMode === "balanced" ? 2 : 1
    let frameCount = 0

    const detectFrame = async () => {
      if (!modelRef.current || !video || video.paused || video.ended) {
        return
      }

      frameCount++

      // Skip frames for performance in high accuracy mode
      if (frameCount % frameSkip !== 0) {
        animationRef.current = requestAnimationFrame(detectFrame)
        return
      }

      // Sync canvas size with video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      setDetecting(true)

      try {
        const predictions = await modelRef.current.detect(video)

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const minConfidence = currentMode.minConfidence
        const filteredPredictions = predictions.filter((pred) => pred.score >= minConfidence)

        const objects: DetectedObject[] = filteredPredictions.map((pred) => ({
          name: pred.class,
          confidence: pred.score,
          box: {
            x: pred.bbox[0],
            y: pred.bbox[1],
            width: pred.bbox[2],
            height: pred.bbox[3],
          },
        }))

        const { kept } = applyNMS(objects, 0.5, true)

        setDetectedObjects(kept)

        drawDetections(ctx, kept, {
          lineWidth: 3,
          fontSize: 14,
          padding: 4,
        })
      } catch {
        // Silently handle detection errors during streaming
      }

      setDetecting(false)

      // Continue detection loop
      animationRef.current = requestAnimationFrame(detectFrame)
    }

    // Start detection loop
    animationRef.current = requestAnimationFrame(detectFrame)
  }, [accuracyMode, currentMode.minConfidence])

  const switchCamera = useCallback(() => {
    const newFacing = cameraFacing === "user" ? "environment" : "user"
    setCameraFacing(newFacing)
  }, [cameraFacing])

  // Restart camera when facing changes
  useEffect(() => {
    if (cameraActive) {
      startCamera()
    }
  }, [cameraFacing])

  useEffect(() => {
    if (cameraActive && !modelLoading) {
      // Cancel current detection loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      // Restart with new settings
      startDetection()
    }
  }, [accuracyMode, modelLoading])

  const handleAccuracyModeChange = useCallback((mode: keyof typeof ACCURACY_MODES) => {
    setAccuracyMode(mode)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!cameraActive && !modelLoading && (
        <div className="p-4 bg-card rounded-lg border border-border">
          <AccuracyModeSelector value={accuracyMode} onChange={handleAccuracyModeChange} disabled={modelLoading} />
        </div>
      )}

      {/* Model loading state */}
      {modelLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-lg border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading AI model ({currentMode.name})...</p>
          <p className="mt-1 text-xs text-muted-foreground/60">This may take a moment on first load</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Camera view */}
      {!modelLoading && (
        <div className="space-y-4">
          {cameraActive && (
            <div className="flex items-center justify-between">
              <AccuracyModeSelector value={accuracyMode} onChange={handleAccuracyModeChange} compact />
              {accuracyMode === "high" && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Lower FPS for better accuracy
                </span>
              )}
            </div>
          )}

          {/* Video container */}
          <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: cameraActive ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ display: cameraActive ? "block" : "none" }}
            />

            {/* Placeholder when camera is off */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <CameraOff className="w-16 h-16 mb-4 opacity-40" />
                <p className="text-sm">Camera is off</p>
                <p className="text-xs mt-1 opacity-60">Click the button below to start</p>
              </div>
            )}

            {/* Detecting indicator */}
            {cameraActive && detecting && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-border">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-foreground">Detecting ({currentMode.name})</span>
              </div>
            )}

            {/* Object count badge */}
            {cameraActive && detectedObjects.length > 0 && (
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-border">
                <span className="text-xs font-medium text-foreground">
                  {detectedObjects.length} object{detectedObjects.length !== 1 ? "s" : ""} found
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              disabled={modelLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                cameraActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {cameraActive ? (
                <>
                  <CameraOff className="w-5 h-5" />
                  Stop Camera
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Start Camera
                </>
              )}
            </button>

            {hasMultipleCameras && cameraActive && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                <SwitchCamera className="w-5 h-5" />
                Switch
              </button>
            )}
          </div>

          {/* Detected objects list */}
          {cameraActive && detectedObjects.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Detected Objects</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {detectedObjects.map((obj, index) => (
                  <div key={`${obj.name}-${index}`} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorForClass(obj.name) }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">{obj.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{Math.round(obj.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
