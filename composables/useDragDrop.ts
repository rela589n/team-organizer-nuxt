import { ref } from 'vue'

export interface DragDropApi {
  draggingPid: { value: string | null }
  draggingFromTeamId: { value: string | null }
  highlightTeamId: { value: string | null }
  isOverTeam: (teamId: string) => boolean
  handleDragStartMember: (ev: DragEvent, pid: string, teamId: string) => void
  handleDragEndMember: () => void
  handleDragOverTeam: (ev: DragEvent) => void
  handleDragEnterTeam: (ev: DragEvent, teamId: string) => void
  handleDragLeaveTeam: (ev: DragEvent, teamId: string) => void
  handleDropTeam: (ev: DragEvent, toTeamId: string) => void
}

export function useDragDrop(movePerson: (pid: string, fromTeamId: string, toTeamId: string) => void): DragDropApi {
  const draggingPid = ref<string | null>(null)
  const draggingFromTeamId = ref<string | null>(null)
  const highlightTeamId = ref<string | null>(null)
  // Track nested dragenter/leaves per team to avoid flicker when moving over children
  const overCounts = ref<Record<string, number>>({})

  function isOverTeam(teamId: string) {
    return (overCounts.value[teamId] || 0) > 0
  }

  function handleDragStartMember(ev: DragEvent, pid: string, teamId: string) {
    draggingPid.value = pid
    draggingFromTeamId.value = teamId
    if (!ev.dataTransfer) {
      throw new Error('handleDragStartMember: dataTransfer not available')
    }
    ev.dataTransfer.setData('text/plain', JSON.stringify({ pid, fromTeamId: teamId }))
    ev.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEndMember() {
    draggingPid.value = null
    draggingFromTeamId.value = null
    overCounts.value = {}
    highlightTeamId.value = null
  }

  function handleDragOverTeam(ev: DragEvent) {
    if (draggingPid.value) {
      ev.preventDefault() // allow drop
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
    }
  }

  function handleDragEnterTeam(_ev: DragEvent, teamId: string) {
    if (!draggingPid.value) return
    // Increment nested enter counter to keep outline while inside children
    overCounts.value[teamId] = (overCounts.value[teamId] || 0) + 1
    // keep highlight via overCounts; no separate overTeamId state
    highlightTeamId.value = teamId
  }

  function handleDragLeaveTeam(_ev: DragEvent, teamId: string) {
    // Decrement and clear only when fully left the drop area (not into a child)
    if (!draggingPid.value) return
    const cur = (overCounts.value[teamId] || 0) - 1
    overCounts.value[teamId] = Math.max(0, cur)
    if (overCounts.value[teamId] === 0) {
      highlightTeamId.value = null
    }
  }

  function handleDropTeam(ev: DragEvent, toTeamId: string) {
    ev.preventDefault()
    if (!ev.dataTransfer) throw new Error('handleDropTeam: dataTransfer not available')
    let pid = draggingPid.value
    let fromTeamId = draggingFromTeamId.value
    const raw = ev.dataTransfer.getData('text/plain')
    if (raw) {
      let parsed: any
      try {
        parsed = JSON.parse(raw)
      } catch (e) {
        throw new Error(`handleDropTeam: invalid drop payload: ${String(e)}`)
      }
      pid = String(parsed?.pid ?? pid)
      fromTeamId = String(parsed?.fromTeamId ?? fromTeamId)
    }
    if (pid && fromTeamId && toTeamId && fromTeamId !== toTeamId) {
      movePerson(pid, fromTeamId, toTeamId)
    }
    // Clear all hover counters on drop
    overCounts.value = {}
    highlightTeamId.value = null
    draggingPid.value = null
    draggingFromTeamId.value = null
  }

  return {
    draggingPid,
    draggingFromTeamId,
    highlightTeamId,
    isOverTeam,
    handleDragStartMember,
    handleDragEndMember,
    handleDragOverTeam,
    handleDragEnterTeam,
    handleDragLeaveTeam,
    handleDropTeam,
  }
}
