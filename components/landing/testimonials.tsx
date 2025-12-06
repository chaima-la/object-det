import { Star } from "lucide-react"

const testimonials = [
  {
    quote:
      "VisionAI transformed our inventory management. We can now track products in real-time with incredible accuracy.",
    author: "Sarah Chen",
    role: "CTO at RetailTech",
    avatar: "/professional-woman-headshot.png",
  },
  {
    quote:
      "The browser-based processing means we don't have to worry about data privacy. Our clients love that their images stay local.",
    author: "Marcus Johnson",
    role: "Lead Developer at SecureApps",
    avatar: "/professional-man-headshot.png",
  },
  {
    quote: "Integration was a breeze. We had object detection running in our app within hours, not weeks.",
    author: "Emily Rodriguez",
    role: "Product Manager at StartupXYZ",
    avatar: "/professional-woman-latina-headshot.jpg",
  },
]

export function Testimonials() {
  return (
    <section className="py-20 md:py-32 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Loved by Developers Worldwide
          </h2>
          <p className="text-muted-foreground text-lg">See what our users have to say about VisionAI.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="p-6 rounded-xl border border-border bg-background">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.avatar || "/placeholder.svg"}
                  alt={testimonial.author}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="font-medium text-foreground text-sm">{testimonial.author}</div>
                  <div className="text-muted-foreground text-xs">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
