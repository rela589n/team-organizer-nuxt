/**
 * Color utilities and shared palettes.
 */

/** A shared vibrant palette used across the app (teams, confetti, etc.). */
export const TEAM_COLORS = [
  '#10B981', // green (emerald-500)
  '#F59E0B', // yellow/amber-500
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
]

/** Convert hex color (#RRGGBB or #RGB) to rgba string with given alpha. */
export function colorTint(hex: string, alpha = 0.12): string {
  if (!hex) return `rgba(0,0,0,${alpha})`
  const h = hex.replace('#', '')
  let r = 0, g = 0, b = 0
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16)
    g = parseInt(h[1] + h[1], 16)
    b = parseInt(h[2] + h[2], 16)
  } else if (h.length === 6) {
    r = parseInt(h.slice(0, 2), 16)
    g = parseInt(h.slice(2, 4), 16)
    b = parseInt(h.slice(4, 6), 16)
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
