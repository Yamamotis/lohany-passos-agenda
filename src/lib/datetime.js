export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function combineDateTime(date, time) {
  const [hours, minutes] = time.split(':').map(Number)
  const result = parseLocalDate(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

export function hoursUntil(date, time, now = new Date()) {
  return (combineDateTime(date, time).getTime() - now.getTime()) / (1000 * 60 * 60)
}
