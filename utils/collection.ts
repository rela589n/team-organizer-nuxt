export function makeIndexMap<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map(it => [it.id, it])) as Record<string, T>
}
