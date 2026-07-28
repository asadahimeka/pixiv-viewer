/**
 * Text line merging — merges OCR-detected text lines that belong
 * to the same speech bubble/region.
 *
 * Heuristics:
 * - Overlapping Y ranges → same row/column
 * - Close X positions (within 20px) → same bubble
 * - Similar font size (inferred from box height) → same bubble
 */

/**
 * Merge text lines that belong to the same speech bubble.
 * Groups regions by proximity, concatenates their text.
 *
 * @param {import('./types.js').TextRegion[]} regions
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {import('./types.js').TextRegion[]} Merged regions
 */
export function mergeTextLines(regions, imageWidth, imageHeight) {
  if (!regions || regions.length <= 1) return regions || []

  const sorted = [...regions].sort((a, b) => a.box.y - b.box.y)
  const merged = []
  const used = new Set()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue
    used.add(i)

    const group = [sorted[i]]

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue

      const a = sorted[i]
      const b = sorted[j]

      // Check if regions overlap vertically (same row/column)
      const aBottom = a.box.y + a.box.height
      const bBottom = b.box.y + b.box.height
      const verticalOverlap = Math.min(aBottom, bBottom) - Math.max(a.box.y, b.box.y)
      const verticalGap = Math.max(a.box.y, b.box.y) - Math.min(aBottom, bBottom)

      // Check horizontal proximity
      const aRight = a.box.x + a.box.width
      const bRight = b.box.x + b.box.width
      const horizontalGap = Math.max(a.box.x, b.box.x) - Math.min(aRight, bRight)

      // Check height similarity (proxy for font size)
      const heightDiff = Math.abs(a.box.height - b.box.height) / Math.max(a.box.height, b.box.height)

      // Merge if: vertical overlap OR small vertical gap, close horizontally, similar height
      const sameColumn = verticalOverlap > 0 || verticalGap < a.box.height * 0.5
      const closeHorizontally = horizontalGap < 30
      const similarHeight = heightDiff < 0.4

      if (sameColumn && closeHorizontally && similarHeight) {
        group.push(sorted[j])
        used.add(j)
      }
    }

    // Merge group into one region
    const mergedRegion = combineRegions(group)
    merged.push(mergedRegion)
  }

  // Remove duplicates
  return removeDuplicates(merged)
}

/**
 * Combine multiple regions into one merged region.
 * Text is concatenated with newline, box encompasses all.
 *
 * @param {import('./types.js').TextRegion[]} regions
 * @returns {import('./types.js').TextRegion}
 */
function combineRegions(regions) {
  if (regions.length === 1) return { ...regions[0] }

  // Sort group by Y position for reading order
  const sorted = [...regions].sort((a, b) => a.box.y - b.box.y)

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const combinedBox = {
    x: Math.min(...sorted.map(r => r.box.x)),
    y: first.box.y,
    width: Math.max(...sorted.map(r => r.box.x + r.box.width)) - Math.min(...sorted.map(r => r.box.x)),
    height: (last.box.y + last.box.height) - first.box.y,
  }

  // Concatenate text
  const combinedText = sorted
    .map(r => r.sourceText)
    .filter(t => t && t.trim())
    .join('\n')

  return {
    ...first,
    id: `merged_${first.id}`,
    box: combinedBox,
    sourceText: combinedText,
  }
}

/**
 * Remove duplicate regions (overlapping boxes with same text).
 *
 * @param {import('./types.js').TextRegion[]} regions
 * @returns {import('./types.js').TextRegion[]}
 */
function removeDuplicates(regions) {
  return regions.filter((region, index) => {
    return !regions.some((other, otherIndex) => {
      if (otherIndex >= index) return false

      // Check if boxes overlap significantly
      const overlapX = Math.max(0,
        Math.min(region.box.x + region.box.width, other.box.x + other.box.width) -
        Math.max(region.box.x, other.box.x)
      )
      const overlapY = Math.max(0,
        Math.min(region.box.y + region.box.height, other.box.y + other.box.height) -
        Math.max(region.box.y, other.box.y)
      )
      const overlapArea = overlapX * overlapY
      const regionArea = region.box.width * region.box.height

      // Same text and >50% overlap → duplicate
      return overlapArea > regionArea * 0.5 && region.sourceText === other.sourceText
    })
  })
}
