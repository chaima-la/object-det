import { ObjectDetector } from "@/components/object-detector"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">AI Object Detector</h1>
          <p className="text-muted-foreground text-lg">
            Upload an image to detect objects using AI-powered computer vision
          </p>
        </div>
        <ObjectDetector />
      </div>
    </main>
  )
}
