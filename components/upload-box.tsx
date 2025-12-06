"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { Upload, ImageIcon } from "lucide-react"

interface UploadBoxProps {
  onUpload: (file: File) => void
  error?: string | null
}

export function UploadBox({ onUpload, error }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const validateAndUpload = useCallback(
    (file: File) => {
      const validTypes = ["image/jpeg", "image/png", "image/jpg"]
      if (!validTypes.includes(file.type)) {
        setLocalError("Please upload only .png, .jpg, or .jpeg files")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setLocalError("Image size must be less than 10MB")
        return
      }
      setLocalError(null)
      onUpload(file)
    },
    [onUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        validateAndUpload(file)
      }
    },
    [validateAndUpload],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        validateAndUpload(file)
      }
    },
    [validateAndUpload],
  )

  const displayError = localError || error

  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full h-72 
          border-2 border-dashed rounded-xl cursor-pointer
          transition-all duration-200 ease-in-out
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div
            className={`
            p-4 rounded-full mb-4 transition-colors
            ${isDragging ? "bg-primary/10" : "bg-muted"}
          `}
          >
            {isDragging ? (
              <Upload className="w-10 h-10 text-primary" />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <p className="mb-2 text-lg font-medium text-foreground">
            {isDragging ? "Drop your image here" : "Drag & drop an image"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer</p>
          <p className="text-xs text-muted-foreground">Accepts: .png, .jpg, .jpeg (Max 10MB)</p>
        </div>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleFileSelect}
        />
      </label>

      {displayError && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm text-center">{displayError}</p>
        </div>
      )}
    </div>
  )
}
