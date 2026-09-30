// Testes da geração de horários disponíveis — a parte mais delicada do
// sistema, já que combina expediente, intervalo de almoço, folgas e
// agendamentos existentes. Datas fixas usadas nos testes:
// 2026-09-27 = domingo, 2026-09-28 = segunda, 2026-09-29 = terça.
import { describe, expect, it } from 'vitest'
import { getAvailableSlots } from './slots'

const SUNDAY = '2026-09-27'
const MONDAY = '2026-09-28'
const TUESDAY = '2026-09-29'

// Um "agora" bem no passado, pra nenhum teste ser afetado pelo filtro de
// "não oferecer horário que já passou hoje" sem querer.
const FAR_PAST = new Date('2026-01-01T00:00:00')

const professional = {
  id: 'prof-1',
  timeOff: [],
  workingHours: {
    mon: { start: '09:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    tue: { start: '09:00', end: '18:00' },
    sun: null,
  },
}

describe('getAvailableSlots', () => {
  it('gera horários a cada 30 minutos, do início ao fim do expediente', () => {
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments: [],
      now: FAR_PAST,
    })

    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30' })
    expect(slots.at(-1)).toEqual({ startTime: '17:30', endTime: '18:00' })
    expect(slots).toHaveLength(18) // 9h de expediente / 30min
  })

  it('bloqueia os horários que caem no intervalo de almoço', () => {
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 60,
      date: MONDAY,
      existingAppointments: [],
      now: FAR_PAST,
    })

    const overlapsLunch = slots.some((s) => s.startTime < '13:00' && s.endTime > '12:00')
    expect(overlapsLunch).toBe(false)
    // Ainda assim, tem que sobrar horário antes e depois do almoço.
    expect(slots).toContainEqual({ startTime: '11:00', endTime: '12:00' })
    expect(slots).toContainEqual({ startTime: '13:00', endTime: '14:00' })
  })

  it('não retorna horário em dia sem expediente cadastrado', () => {
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: SUNDAY,
      existingAppointments: [],
      now: FAR_PAST,
    })

    expect(slots).toEqual([])
  })

  it('não retorna horário em dia de folga cadastrada (timeOff)', () => {
    const professionalOnLeave = { ...professional, timeOff: [TUESDAY] }
    const slots = getAvailableSlots({
      professional: professionalOnLeave,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments: [],
      now: FAR_PAST,
    })

    expect(slots).toEqual([])
  })

  it('remove horários que colidem com um agendamento já existente', () => {
    const existingAppointments = [
      { id: 'a1', professionalId: 'prof-1', date: TUESDAY, startTime: '10:00', endTime: '11:00', status: 'scheduled' },
    ]
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments,
      now: FAR_PAST,
    })

    const hasConflict = slots.some((s) => s.startTime >= '10:00' && s.startTime < '11:00')
    expect(hasConflict).toBe(false)
    expect(slots).toContainEqual({ startTime: '09:30', endTime: '10:00' })
    expect(slots).toContainEqual({ startTime: '11:00', endTime: '11:30' })
  })

  it('ignora agendamentos cancelados ao calcular colisões', () => {
    const existingAppointments = [
      { id: 'a1', professionalId: 'prof-1', date: TUESDAY, startTime: '10:00', endTime: '11:00', status: 'cancelled' },
    ]
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments,
      now: FAR_PAST,
    })

    expect(slots).toContainEqual({ startTime: '10:00', endTime: '10:30' })
  })

  it('exclui o próprio agendamento ao reagendar (excludeAppointmentId)', () => {
    const existingAppointments = [
      { id: 'a1', professionalId: 'prof-1', date: TUESDAY, startTime: '10:00', endTime: '11:00', status: 'scheduled' },
    ]
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 60,
      date: TUESDAY,
      existingAppointments,
      excludeAppointmentId: 'a1',
      now: FAR_PAST,
    })

    expect(slots).toContainEqual({ startTime: '10:00', endTime: '11:00' })
  })

  it('não oferece horário que já passou, quando a data é hoje', () => {
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments: [],
      now: new Date(`${TUESDAY}T14:15:00`),
    })

    expect(slots.every((s) => s.startTime >= '14:30')).toBe(true)
  })

  it('não gera horário se a duração do serviço não cabe até o fechamento', () => {
    const professionalShortDay = {
      id: 'prof-2',
      timeOff: [],
      workingHours: { tue: { start: '17:00', end: '17:45' } },
    }
    const slots = getAvailableSlots({
      professional: professionalShortDay,
      durationMinutes: 60,
      date: TUESDAY,
      existingAppointments: [],
      now: FAR_PAST,
    })

    expect(slots).toEqual([])
  })

  it('não considera agendamentos de outro profissional', () => {
    const existingAppointments = [
      { id: 'a1', professionalId: 'outro-profissional', date: TUESDAY, startTime: '10:00', endTime: '11:00', status: 'scheduled' },
    ]
    const slots = getAvailableSlots({
      professional,
      durationMinutes: 30,
      date: TUESDAY,
      existingAppointments,
      now: FAR_PAST,
    })

    expect(slots).toContainEqual({ startTime: '10:00', endTime: '10:30' })
  })
})
