/**
 * Non-Maximum Suppression (NMS) Utility
 * Reduces overlapping bounding boxes by keeping only the most confident one
 */

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectionWithBox {
  name: string
  confidence: number
  box: BoundingBox
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  // Calculate coordinates of intersection rectangle
  const xA = Math.max(boxA.x, boxB.x)
  const yA = Math.max(boxA.y, boxB.y)
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width)
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height)

  // Calculate intersection area
  const intersectionWidth = Math.max(0, xB - xA)
  const intersectionHeight = Math.max(0, yB - yA)
  const intersectionArea = intersectionWidth * intersectionHeight

  // Calculate union area
  const boxAArea = boxA.width * boxA.height
  const boxBArea = boxB.width * boxB.height
  const unionArea = boxAArea + boxBArea - intersectionArea

  // Avoid division by zero
  if (unionArea === 0) return 0

  return intersectionArea / unionArea
}

/**
 * Apply Non-Maximum Suppression to reduce overlapping detections
 * @param detections - Array of detections with bounding boxes
 * @param iouThreshold - IoU threshold for considering boxes as overlapping (default: 0.5)
 * @param perClass - Whether to apply NMS per class (default: true)
 * @returns Filtered detections with overlapping boxes removed
 */
export function applyNMS<T extends DetectionWithBox>(
  detections: T[],
  iouThreshold = 0.5,
  perClass = true,
): { kept: T[]; suppressed: number } {
  if (detections.length === 0) {
    return { kept: [], suppressed: 0 }
  }

  // Sort by confidence (highest first)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)

  if (perClass) {
    // Group by class
    const byClass = new Map<string, T[]>()
    for (const det of sorted) {
      const existing = byClass.get(det.name) || []
      existing.push(det)
      byClass.set(det.name, existing)
    }

    // Apply NMS to each class separately
    const kept: T[] = []
    let totalSuppressed = 0

    for (const classDetections of byClass.values()) {
      const { kept: classKept, suppressed } = applyNMSToGroup(classDetections, iouThreshold)
      kept.push(...classKept)
      totalSuppressed += suppressed
    }

    // Re-sort by confidence after combining
    kept.sort((a, b) => b.confidence - a.confidence)

    return { kept, suppressed: totalSuppressed }
  }

  return applyNMSToGroup(sorted, iouThreshold)
}

/**
 * Apply NMS to a single group of detections
 */
function applyNMSToGroup<T extends DetectionWithBox>(
  detections: T[],
  iouThreshold: number,
): { kept: T[]; suppressed: number } {
  const kept: T[] = []
  const suppressed = new Set<number>()

  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue

    const current = detections[i]
    kept.push(current)

    // Suppress all lower-confidence boxes that overlap too much
    for (let j = i + 1; j < detections.length; j++) {
      if (suppressed.has(j)) continue

      const iou = calculateIoU(current.box, detections[j].box)
      if (iou >= iouThreshold) {
        suppressed.add(j)
      }
    }
  }

  return { kept, suppressed: suppressed.size }
}

/**
 * Validate IoU threshold value
 */
export function validateIoUThreshold(value: unknown): number | null {
  if (value === undefined || value === null) return null

  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value)
  if (!isNaN(num) && num > 0 && num <= 1) {
    return num
  }
  return null
}
