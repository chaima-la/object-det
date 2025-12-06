"use client"

import { Gauge, Zap, Target } from "lucide-react"
import { ACCURACY_MODES } from "@/hooks/use-object-detection"

interface AccuracyModeSelectorProps {
  value: keyof typeof ACCURACY_MODES
  onChange: (mode: keyof typeof ACCURACY_MODES) => void
  disabled?: boolean
  compact?: boolean
}

const modeIcons = {
  fast: Zap,
  balanced: Gauge,
  high: Target,
}

export function AccuracyModeSelector({ value, onChange, disabled, compact }: AccuracyModeSelectorProps) {
  const modes = Object.entries(ACCURACY_MODES) as [keyof typeof ACCURACY_MODES, typeof ACCURACY_MODES.fast][]

  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        {modes.map(([key, mode]) => {
          const Icon = modeIcons[key]
          const isActive = value === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              disabled={disabled}
              title={`${mode.name}: ${mode.description}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mode.name}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Detection Mode</label>
        {value === "high" && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Slower detection
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {modes.map(([key, mode]) => {
          const Icon = modeIcons[key]
          const isActive = value === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              disabled={disabled}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                isActive
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-xs font-medium">{mode.name}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">{ACCURACY_MODES[value].description}</p>
    </div>
  )
}
