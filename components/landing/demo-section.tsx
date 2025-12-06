"use client"

import { useState } from "react"
import { ObjectDetector } from "@/components/object-detector"
import { CameraDetect } from "@/components/camera-detect"
import { Upload, Video } from "lucide-react"

export function DemoSection() {
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload")

  return (
    <section id="demo" className="py-20 md:py-32 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">Try It Yourself</h2>
          <p className="text-muted-foreground text-lg">
            Upload an image or use your camera to see AI object detection in action.
          </p>
        </div>

        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center p-1.5 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === "upload"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Image</span>
              <span className="sm:hidden">Upload</span>
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === "camera"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Live Camera</span>
              <span className="sm:hidden">Camera</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
          {activeTab === "upload" ? <ObjectDetector /> : <CameraDetect />}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-8">
          {activeTab === "upload"
            ? "Powered by GPT-4o Vision · OpenAI"
            : "Powered by TensorFlow.js · COCO-SSD (Real-time)"}
        </p>
      </div>
    </section>
  )
}
