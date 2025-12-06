"use client"

import { useState, useCallback } from "react"
import { UploadBox } from "./upload-box"
import { ResultsCard } from "./results-card"
import { Loader } from "./loader"
import { ImagePreview } from "./image-preview"
import { useObjectDetection, type DetectionResult } from "@/hooks/use-object-detection"

export function ObjectDetector() {
  const [image, setImage] = useState<string | null>(null)
  const [results, setResults] = useState<DetectionResult | null>(null)
  const { detect, loading, error, clearError, modelLoading } = useObjectDetection()

  const handleImageUpload = useCallback(
    async (file: File) => {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg"]
      if (!validTypes.includes(file.type)) {
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return
      }

      clearError()

      // Create preview
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageDataUrl = e.target?.result as string
        setImage(imageDataUrl)
        setResults(null)

        // Run detection via API
        const detectionResult = await detect(file)
        if (detectionResult) {
          setResults(detectionResult)
        }
      }
      reader.readAsDataURL(file)
    },
    [detect, clearError],
  )

  const handleReset = useCallback(() => {
    setImage(null)
    setResults(null)
    clearError()
  }, [clearError])

  return (
    <div className="max-w-4xl mx-auto">
      {modelLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-lg border border-border mb-6">
          <Loader />
          <p className="mt-4 text-muted-foreground">Loading AI model...</p>
          <p className="mt-1 text-xs text-muted-foreground/60">This may take a moment on first load</p>
        </div>
      )}

      {!modelLoading && !image ? (
        <UploadBox onUpload={handleImageUpload} error={error} />
      ) : !modelLoading && image ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Upload New Image
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ImagePreview src={image || "/placeholder.svg"} results={results} loading={loading} />

            <div className="space-y-4">
              {loading && (
                <div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg border border-border">
                  <Loader />
                  <p className="mt-4 text-muted-foreground">Analyzing image...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {results && !loading && <ResultsCard results={results} />}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
