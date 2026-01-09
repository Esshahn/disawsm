/**
 * Window Manager Store
 * Manages z-index for all windows to ensure proper stacking
 */

let currentZIndex = 1000;

/**
 * Get the next z-index for bringing a window to front
 * @returns The next available z-index
 */
export function getNextZIndex(): number {
  return ++currentZIndex;
}

/**
 * Reset z-index counter (useful for testing)
 */
export function resetZIndex(): void {
  currentZIndex = 1000;
}
