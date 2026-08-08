/**
 * Queries a bubble mask with source-image pixel coordinates.
 *
 * Keeping coordinate translation behind this narrow interface lets callers
 * remain independent of the mask's cropped, single-channel representation.
 *
 * @param {import('../types.js').BubbleMask} mask
 * @param {number} imageX
 * @param {number} imageY
 * @returns {boolean}
 */
export function hasBubbleMaskPixel(mask, imageX, imageY) {
  const localX = imageX - mask.x
  const localY = imageY - mask.y
  if (
    localX < 0 ||
    localX >= mask.width ||
    localY < 0 ||
    localY >= mask.height
  ) {
    return false
  }
  return mask.data[localY * mask.width + localX] !== 0
}
