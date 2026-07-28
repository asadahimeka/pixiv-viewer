/**
 * Reading order sorting — sorts detected text regions in manga reading order.
 *
 * Rules:
 * - Right-to-left (primary sort by X descending)
 * - Top-to-bottom (secondary sort by Y ascending)
 * - Double-page spreads: split at midline, right page first
 * - Column grouping: regions with same X center ±30px → same column
 */

/**
 * Sort text regions in manga reading order.
 *
 * @param {import('./types.js').TextRegion[]} regions
 * @param {number} imageWidth - Width of the source image
 * @param {number} imageHeight - Height of the source image
 * @returns {import('./types.js').TextRegion[]} Sorted regions
 */
export function sortRegionsForRender(regions, imageWidth, imageHeight) {
  if (!regions || regions.length === 0) return []
  if (regions.length === 1) return [...regions]

  const sorted = [...regions]

  // Determine if this is a double-page spread (width significantly > height)
  const isDoublePage = imageWidth > imageHeight * 1.3

  if (isDoublePage) {
    // Split into left and right halves
    const midX = imageWidth / 2
    const rightHalf = sorted.filter(r => r.box.x + r.box.width / 2 >= midX)
    const leftHalf = sorted.filter(r => r.box.x + r.box.width / 2 < midX)

    // Right page: right-to-left, top-to-bottom
    rightHalf.sort((a, b) => {
      const aCenterX = a.box.x + a.box.width / 2
      const bCenterX = b.box.x + b.box.width / 2
      if (Math.abs(aCenterX - bCenterX) > 20) {
        return bCenterX - aCenterX // right-to-left
      }
      return a.box.y - b.box.y // top-to-bottom
    })

    // Left page: right-to-left, top-to-bottom
    leftHalf.sort((a, b) => {
      const aCenterX = a.box.x + a.box.width / 2
      const bCenterX = b.box.x + b.box.width / 2
      if (Math.abs(aCenterX - bCenterX) > 20) {
        return bCenterX - aCenterX // right-to-left
      }
      return a.box.y - b.box.y // top-to-bottom
    })

    // Right page comes first in manga reading order
    return [...rightHalf, ...leftHalf]
  }

  // Single page: sort by X descending (right-to-left), then Y ascending (top-to-bottom)
  sorted.sort((a, b) => {
    const aCenterX = a.box.x + a.box.width / 2
    const bCenterX = b.box.x + b.box.width / 2

    // Group regions in same "column" (similar X center within 30px)
    if (Math.abs(aCenterX - bCenterX) > 30) {
      return bCenterX - aCenterX // right-to-left
    }
    return a.box.y - b.box.y // top-to-bottom
  })

  return sorted
}
