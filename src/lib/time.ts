export function nowMs() {
  return Date.now()
}

export function startOfLocalDayMs(timestamp: number) {
  const start = new Date(timestamp)
  start.setHours(0, 0, 0, 0)

  return start.getTime()
}

export function startOfNextLocalDayMs(timestamp: number) {
  const nextDayStart = new Date(startOfLocalDayMs(timestamp))
  nextDayStart.setDate(nextDayStart.getDate() + 1)

  return nextDayStart.getTime()
}
