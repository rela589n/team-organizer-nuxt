// Utility for generating unique IDs with a safe fallback for environments
// where crypto.randomUUID may not be available.
export function newId(): string {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
  } catch (err) {
    console.warn('crypto.randomUUID access failed; using fallback id generation:', err)
  }
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2)
  )
}
