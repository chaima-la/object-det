import { Zap, Eye, Video, Shield, Cpu, Globe } from "lucide-react"

const features = [
  {
    icon: Eye,
    title: "Precise Detection",
    description: "Identify 80+ object classes with industry-leading accuracy using COCO-SSD model.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get results in milliseconds with optimized TensorFlow.js processing.",
  },
  {
    icon: Video,
    title: "Real-Time Camera",
    description: "Detect objects in real-time using your device camera with live bounding boxes.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "All processing happens in your browser. Your images never leave your device.",
  },
  {
    icon: Cpu,
    title: "No Setup Required",
    description: "Works instantly in any modern browser. No installation or API keys needed.",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "Full support for desktop and mobile devices across all major browsers.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Powerful Features for Every Use Case
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to integrate object detection into your workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
