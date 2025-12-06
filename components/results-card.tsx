"use client"

import { Package, Target } from "lucide-react"
import type { DetectionResult } from "@/hooks/use-object-detection"

interface ResultsCardProps {
  results: DetectionResult
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return "text-green-500"
  if (confidence >= 0.5) return "text-yellow-500"
  return "text-orange-500"
}

const getConfidenceBg = (confidence: number) => {
  if (confidence >= 0.8) return "bg-green-500"
  if (confidence >= 0.5) return "bg-yellow-500"
  return "bg-orange-500"
}

export function ResultsCard({ results }: ResultsCardProps) {
  const { objects } = results

  if (objects.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Detection Results</h3>
        </div>
        <p className="text-muted-foreground text-center py-8">No objects detected in this image</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Detection Results</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {objects.length} object{objects.length !== 1 ? "s" : ""} found
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {objects.map((obj, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getConfidenceBg(obj.confidence)}`} />
              <div>
                <p className="font-medium text-foreground capitalize">{obj.name}</p>
                <p className="text-xs text-muted-foreground">
                  Position: ({Math.round(obj.box.x)}, {Math.round(obj.box.y)})
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${getConfidenceColor(obj.confidence)}`}>
                {(obj.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">confidence</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Average Confidence</span>
          <span className="font-medium text-foreground">
            {((objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
