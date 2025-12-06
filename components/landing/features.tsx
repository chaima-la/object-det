import { Zap, Eye, Video, Shield, Brain, Globe } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "GPT-4o Vision",
    description: "State-of-the-art AI detection powered by OpenAI's GPT-4o with scene understanding and context.",
  },
  {
    icon: Eye,
    title: "Comprehensive Detection",
    description: "Detect hundreds of object types with detailed descriptions and relationship analysis.",
  },
  {
    icon: Video,
    title: "Real-Time Camera",
    description: "Live camera detection using optimized TensorFlow.js for instant bounding boxes.",
  },
  {
    icon: Zap,
    title: "Scene Analysis",
    description: "Get intelligent scene descriptions that understand context beyond individual objects.",
  },
  {
    icon: Shield,
    title: "Secure Processing",
    description: "Enterprise-grade security with encrypted API calls. Camera mode runs fully in-browser.",
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
