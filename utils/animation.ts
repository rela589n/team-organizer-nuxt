export function dur(base: number, speed: number): number {
  const s = Math.min(2, Math.max(0.5, Number(speed) || 1))
  return Math.round(base / s)
}

export function speedText(speed: number): string {
  const s = Math.min(2, Math.max(0.5, Number(speed) || 1))
  return `${s.toFixed(2)}x`
}
