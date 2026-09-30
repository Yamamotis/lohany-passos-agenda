// Funções de data/hora usadas pela interface (o cálculo de disponibilidade
// em si roda no banco — ver src/lib/api/appointments.js).
// Trabalham sempre no fuso horário local do navegador (evitam o
// deslocamento de dia que `new Date(string)` costuma causar com datas puras).

// Converte uma data no formato "YYYY-MM-DD" em um Date local (sem hora).
export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Combina uma data ("YYYY-MM-DD") com um horário ("HH:mm") em um único Date.
export function combineDateTime(date, time) {
  const [hours, minutes] = time.split(':').map(Number)
  const result = parseLocalDate(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

// Quantos minutos faltam (pode ser negativo, se já passou) entre agora e o
// horário informado. Usado para aplicar a regra de prazo mínimo de cancelamento.
export function minutesUntil(date, time, now = new Date()) {
  return (combineDateTime(date, time).getTime() - now.getTime()) / (1000 * 60)
}
