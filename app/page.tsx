"use client"

import { useState } from "react"
import { ObjectDetector } from "@/components/object-detector"
import { CameraDetect } from "@/components/camera-detect"
import { Upload, Video, Sparkles } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload")

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 text-balance">AI Object Detector</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto text-pretty">
            Detect objects in images or real-time using AI-powered computer vision
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

        <div className="animate-in fade-in duration-300">
          {activeTab === "upload" ? <ObjectDetector /> : <CameraDetect />}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-12">
          Powered by TensorFlow.js &middot; COCO-SSD Model
        </p>
      </div>
    </main>
  )
}
