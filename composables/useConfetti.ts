/**
 * Confetti composable: provides a radial burst confetti.
 * No external libs. Injects necessary keyframes once.
 */
export interface ConfettiOptions {
  /** Origin point in viewport or page coordinates (pixels). Defaults to viewport center. */
  origin?: { x: number; y: number }
  /** Palette of colors to use. Defaults to a small vibrant set. */
  colors?: string[]
  /** Speed factor (1 = normal). Durations scale as base / speed. */
  speed?: number
  /** Base particle count used to scale intensity. */
  baseCount?: number
}

import { TEAM_COLORS } from '~/utils/colors'

function ensureConfettiStyles() {
  const id = 'confetti-burst-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `@keyframes confetti-burst { 0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--rot, 720deg)) scale(0.9); opacity: 0; } }`
  document.head.appendChild(style)
}

function scaleDur(base: number, speed = 1) {
  const s = Math.min(2, Math.max(0.5, Number(speed) || 1))
  return Math.round(base / s)
}

export function useConfetti() {
  function fireBurst(opts: ConfettiOptions = {}) {
    ensureConfettiStyles()
    const colors = (opts.colors && opts.colors.length > 0) ? opts.colors : TEAM_COLORS
    const speed = opts.speed ?? 1
    const baseCount = Math.min(320, Math.max(120, opts.baseCount ?? 180))

    function emit(mult = 1) {
      const container = document.createElement('div')
      Object.assign(container.style, {
        position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999', overflow: 'visible',
      } as CSSStyleDeclaration)

      const ox = opts.origin?.x ?? (window.innerWidth / 2)
      const oy = opts.origin?.y ?? (window.innerHeight / 2)

      const count = Math.round(baseCount * mult)
      for (let i = 0; i < count; i++) {
        const piece = document.createElement('span')
        const size = 6 + Math.random() * 12
        const isCircle = Math.random() < 0.35
        const angle = Math.random() * Math.PI * 2
        const distance = 240 + Math.random() * 640
        const dx = Math.cos(angle) * distance
        const dy = Math.sin(angle) * distance
        const rot = 360 + Math.floor(Math.random() * 720)
        const durMs = scaleDur(1500, speed) + Math.random() * scaleDur(700, speed)
        const delay = Math.random() * 120
        const bg = colors[Math.floor(Math.random() * colors.length)]

        piece.style.setProperty('--dx', `${dx}px`)
        piece.style.setProperty('--dy', `${dy}px`)
        piece.style.setProperty('--rot', `${rot}deg`)
        Object.assign(piece.style, {
          position: 'fixed', left: `${ox}px`, top: `${oy}px`, width: `${size}px`,
          height: `${isCircle ? size : (size * (0.5 + Math.random()*0.8))}px`, backgroundColor: bg,
          borderRadius: isCircle ? '9999px' : '2px', transform: 'translate(0, 0) rotate(0deg) scale(1)',
          opacity: '0', animation: `confetti-burst ${durMs}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms forwards`,
          willChange: 'transform, opacity',
        } as CSSStyleDeclaration)
        container.appendChild(piece)
      }

      document.body.appendChild(container)
      const maxDur = scaleDur(2200, speed) + scaleDur(400, speed)
      window.setTimeout(() => container.remove(), maxDur)
    }

    emit(1)
    window.setTimeout(() => emit(0.6), 160)
  }

  return { fireBurst }
}
