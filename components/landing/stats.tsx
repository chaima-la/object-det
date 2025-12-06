const stats = [
  { value: "99.2%", label: "Accuracy Rate" },
  { value: "50ms", label: "Avg Detection Time" },
  { value: "80+", label: "Object Classes" },
  { value: "10M+", label: "Images Processed" },
]

export function Stats() {
  return (
    <section className="py-16 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
