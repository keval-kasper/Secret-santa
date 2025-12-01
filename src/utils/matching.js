// Backtracking Secret Santa generator that respects exclusions and self-avoidance.
export function generateAssignments(participantIds, exclusions) {
  if (!participantIds?.length) {
    return { success: false, error: 'No participants' }
  }

  const exclusionMap = new Map()
  exclusions.forEach(({ fromUserId, toUserId }) => {
    const list = exclusionMap.get(fromUserId) || new Set()
    list.add(toUserId)
    exclusionMap.set(fromUserId, list)
  })

  const receivers = [...participantIds]
  shuffle(receivers)
  const used = new Set()
  const result = []

  const canUse = (giver, receiver) => {
    if (giver === receiver) return false
    if (used.has(receiver)) return false
    const blocked = exclusionMap.get(giver)
    if (blocked && blocked.has(receiver)) return false
    return true
  }

  const backtrack = (index) => {
    if (index === participantIds.length) return true
    const giver = participantIds[index]
    // try every receiver still available
    for (let i = 0; i < receivers.length; i += 1) {
      const receiver = receivers[i]
      if (!canUse(giver, receiver)) continue
      used.add(receiver)
      result[index] = { giverUserId: giver, receiverUserId: receiver }
      if (backtrack(index + 1)) return true
      used.delete(receiver)
    }
    return false
  }

  const ok = backtrack(0)
  if (!ok) {
    return { success: false, error: 'Could not find valid matches with current exclusions.' }
  }
  return { success: true, assignments: result }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}
