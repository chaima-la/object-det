export function Loader() {
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
    </div>
  )
}
