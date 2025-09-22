import type { Person } from '~/composables/usePeople'
import type { Team } from '~/composables/useTeams'

export type Assignment = { person: Person; teamId: string }

/**
 * Build an assignment queue using a greedy power-balancing strategy:
 * - Sort people by descending power
 * - Iteratively assign each person to the team with the current lowest total power
 * - Break ties randomly among teams with equal totals to avoid bias
 */
export function makeAssignmentQueue(people: Person[], teams: Team[]): Assignment[] {
  // Fail-fast preconditions
  if (!teams || teams.length === 0) throw new Error('makeAssignmentQueue: teams must be a non-empty array')
  if (!people) throw new Error('makeAssignmentQueue: people must be an array')

  const peopleByPower = [...people].sort((a, b) => b.power - a.power)

  const totalsByTeam: Record<string, number> = {}
  for (const t of teams) {
    if (!t || typeof t.id !== 'string' || t.id.length === 0) {
      throw new Error('makeAssignmentQueue: each team must have a non-empty id')
    }
    if (totalsByTeam[t.id] !== undefined) {
      throw new Error(`makeAssignmentQueue: duplicate team id detected: ${t.id}`)
    }
    totalsByTeam[t.id] = 0
  }

  const powerOf = (p?: Person | null): number => {
    if (!p) throw new Error('makeAssignmentQueue: person is undefined')
    return p.power
  }

  const result: Assignment[] = []
  for (const person of peopleByPower) {
    const totals = Object.values(totalsByTeam)
    if (totals.length === 0) throw new Error('makeAssignmentQueue: no teams available to assign')
    const minTotal = Math.min(...totals)
    const candidateIds = Object.keys(totalsByTeam).filter((id) => totalsByTeam[id] === minTotal)
    const pickId = candidateIds[Math.floor(Math.random() * candidateIds.length)] || teams[0]?.id
    if (!pickId) throw new Error('makeAssignmentQueue: failed to choose a team id')
    result.push({ person, teamId: pickId })
    totalsByTeam[pickId] += powerOf(person)
  }

  return result
}
