interface LoaderProps {
  variant?: "default" | "realtime" | "processing"
  message?: string
}

export function Loader({ variant = "default", message }: LoaderProps) {
  if (variant === "realtime") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-border shadow-sm">
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{message || "Analyzing..."}</span>
      </div>
    )
  }

  if (variant === "processing") {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-md">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.6s" }}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">{message || "Processing frame..."}</span>
      </div>
    )
  }

  // Default full-screen loader
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-20 h-20">
        {/* Outer ring */}
        <div className="absolute inset-0 border-4 border-muted rounded-full" />
        {/* Spinning arc */}
        <div className="absolute inset-0 border-4 border-transparent border-t-primary border-r-primary rounded-full animate-spin" />
        {/* Inner scanning effect */}
        <div
          className="absolute inset-2 border-2 border-transparent border-b-primary/50 rounded-full animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
        {/* Center pulse */}
        <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse" />
        {/* Center dot */}
        <div
          className="absolute inset-[30%] bg-primary rounded-full animate-ping"
          style={{ animationDuration: "1.5s" }}
        />
      </div>
      {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  )
}
