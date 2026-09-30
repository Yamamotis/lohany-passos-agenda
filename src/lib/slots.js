// Cálculo dos horários disponíveis para agendamento.
import { parseLocalDate } from './datetime'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const SLOT_STEP_MINUTES = 30 // de quanto em quanto tempo um novo horário pode começar

// Converte "HH:mm" em minutos desde a meia-noite, para facilitar as contas.
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Converte minutos desde a meia-noite de volta para "HH:mm".
function minutesToTime(total) {
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const m = (total % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Gera os horários disponíveis de um profissional, em um dia, para um serviço
 * de determinada duração, descontando os agendamentos já existentes, o
 * intervalo de almoço e as folgas pontuais cadastradas.
 */
export function getAvailableSlots({
  professional,
  durationMinutes,
  date,
  existingAppointments,
  now = new Date(),
  excludeAppointmentId = null, // usado ao reagendar/editar, pra não bloquear o próprio horário
}) {
  // Dia de folga cadastrado (férias, feriado) → nenhum horário disponível.
  if (professional.timeOff?.includes(date)) return []

  // Sem expediente definido para esse dia da semana (ex: domingo) → nenhum horário.
  const weekday = WEEKDAY_KEYS[parseLocalDate(date).getDay()]
  const hours = professional.workingHours?.[weekday]
  if (!hours) return []

  const dayStart = timeToMinutes(hours.start)
  const dayEnd = timeToMinutes(hours.end)

  // Intervalos já ocupados por outros agendamentos do mesmo profissional/dia.
  const busyRanges = existingAppointments
    .filter(
      (a) =>
        a.professionalId === professional.id &&
        a.date === date &&
        a.status !== 'cancelled' &&
        a.id !== excludeAppointmentId,
    )
    .map((a) => [timeToMinutes(a.startTime), timeToMinutes(a.endTime)])

  // O intervalo de almoço conta como mais um período ocupado.
  if (hours.breakStart && hours.breakEnd) {
    busyRanges.push([timeToMinutes(hours.breakStart), timeToMinutes(hours.breakEnd)])
  }

  // Se o dia é hoje, não faz sentido oferecer horário que já passou.
  const isToday = parseLocalDate(date).toDateString() === now.toDateString()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // Varre o expediente em passos fixos, montando a lista de horários livres.
  const slots = []
  for (let start = dayStart; start + durationMinutes <= dayEnd; start += SLOT_STEP_MINUTES) {
    const end = start + durationMinutes
    if (isToday && start <= nowMinutes) continue

    const overlaps = busyRanges.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart)
    if (!overlaps) {
      slots.push({ startTime: minutesToTime(start), endTime: minutesToTime(end) })
    }
  }
  return slots
}
