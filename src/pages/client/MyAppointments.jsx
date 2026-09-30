// Lista de agendamentos do cliente logado, com opção de cancelar ou
// remarcar (dentro do prazo mínimo) e um atalho de WhatsApp para o salão
// quando o prazo já não permite alteração pelo próprio app.
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  listAppointmentsByClient,
  listAppointmentsByProfessional,
  updateAppointment,
  updateAppointmentStatus,
} from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { listProfessionals } from '../../lib/api/professionals'
import { getAvailableSlots } from '../../lib/slots'
import { hoursUntil } from '../../lib/datetime'
import { CANCELLATION_CUTOFF_HOURS } from '../../lib/constants'
import { getSalonSettings } from '../../lib/api/settings'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { Badge, Button, Card } from '../../components/ui'

const STATUS_LABEL = {
  scheduled: { label: 'Agendado', tone: 'green' },
  completed: { label: 'Concluído', tone: 'stone' },
  cancelled: { label: 'Cancelado', tone: 'red' },
  no_show: { label: 'Não compareceu', tone: 'amber' },
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function MyAppointments() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [professionals, setProfessionals] = useState([])

  // Estado da remarcação em andamento (no máximo um agendamento por vez).
  const [reschedulingId, setReschedulingId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState([])
  const [rescheduleSlot, setRescheduleSlot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [salonPhone, setSalonPhone] = useState('')

  async function load() {
    const [appointmentsData, servicesData, professionalsData] = await Promise.all([
      listAppointmentsByClient(user.id),
      listServices(),
      listProfessionals(),
    ])
    appointmentsData.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    setAppointments(appointmentsData)
    setServices(servicesData)
    setProfessionals(professionalsData)
  }

  useEffect(() => {
    load()
    getSalonSettings().then((settings) => setSalonPhone(settings.phone ?? ''))
  }, [user.id])

  // Recalcula os horários livres da remarcação sempre que a data muda,
  // excluindo o próprio agendamento (senão ele bloquearia o próprio horário).
  useEffect(() => {
    if (!reschedulingId) return
    const appointment = appointments.find((a) => a.id === reschedulingId)
    const professional = professionals.find((p) => p.id === appointment.professionalId)
    const service = services.find((s) => s.id === appointment.serviceId)
    if (!professional || !service) return

    setRescheduleSlot(null)
    listAppointmentsByProfessional(professional.id).then((existing) => {
      const available = getAvailableSlots({
        professional,
        durationMinutes: service.durationMinutes,
        date: rescheduleDate,
        existingAppointments: existing,
        excludeAppointmentId: appointment.id,
      })
      setRescheduleSlots(available)
    })
  }, [reschedulingId, rescheduleDate])

  // Cliente só pode mexer sozinho se faltar mais que o prazo mínimo de cancelamento.
  function canModify(appointment) {
    return (
      appointment.status === 'scheduled' &&
      hoursUntil(appointment.date, appointment.startTime) >= CANCELLATION_CUTOFF_HOURS
    )
  }

  async function handleCancel(id) {
    await updateAppointmentStatus(id, 'cancelled')
    showToast('Agendamento cancelado.')
    load()
  }

  function startReschedule(appointment) {
    setReschedulingId(appointment.id)
    setRescheduleDate(appointment.date)
    setRescheduleSlot(null)
  }

  function cancelReschedule() {
    setReschedulingId(null)
    setRescheduleSlots([])
    setRescheduleSlot(null)
  }

  async function confirmReschedule() {
    if (!rescheduleSlot) return
    setSaving(true)
    try {
      await updateAppointment(reschedulingId, {
        date: rescheduleDate,
        startTime: rescheduleSlot.startTime,
        endTime: rescheduleSlot.endTime,
      })
      showToast('Agendamento remarcado!')
      cancelReschedule()
      load()
    } finally {
      setSaving(false)
    }
  }

  function serviceName(id) {
    return services.find((s) => s.id === id)?.name ?? '—'
  }

  function professionalName(id) {
    return professionals.find((p) => p.id === id)?.name ?? '—'
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Meus agendamentos</h1>

      {appointments.length === 0 ? (
        <p className="text-stone-500">Você ainda não tem agendamentos.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const status = STATUS_LABEL[appointment.status]
            const modifiable = canModify(appointment)
            const isRescheduling = reschedulingId === appointment.id
            return (
              <Card key={appointment.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-900">{serviceName(appointment.serviceId)}</p>
                    <p className="text-sm text-stone-500">
                      {appointment.date} às {appointment.startTime} · {professionalName(appointment.professionalId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={status?.tone}>{status?.label}</Badge>
                    {appointment.status === 'scheduled' && modifiable && (
                      <>
                        <Button variant="secondary" onClick={() => startReschedule(appointment)}>
                          Remarcar
                        </Button>
                        <Button variant="danger" onClick={() => handleCancel(appointment.id)}>
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Fora do prazo: em vez de cancelar/remarcar, oferece contato direto. */}
                {appointment.status === 'scheduled' && !modifiable && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-amber-600">
                      Menos de {CANCELLATION_CUTOFF_HOURS}h para o horário — fale com o salão para alterar.
                    </p>
                    {(() => {
                      const link = buildWhatsAppLink(
                        salonPhone,
                        `Olá! Gostaria de alterar meu agendamento de ${serviceName(appointment.serviceId)} no dia ${appointment.date} às ${appointment.startTime}.`,
                      )
                      return (
                        link && (
                          <a href={link} target="_blank" rel="noreferrer">
                            <Button variant="secondary">Falar no WhatsApp</Button>
                          </a>
                        )
                      )
                    })()}
                  </div>
                )}

                {/* Painel de remarcação, aberto só para o agendamento selecionado. */}
                {isRescheduling && (
                  <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
                    <input
                      type="date"
                      min={todayISO()}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    {rescheduleSlots.length === 0 ? (
                      <p className="text-sm text-stone-500">Nenhum horário disponível neste dia.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {rescheduleSlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setRescheduleSlot(slot)}
                            className={`rounded-lg border px-2 py-2 text-sm ${
                              rescheduleSlot?.startTime === slot.startTime
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : 'border-stone-300 text-stone-700 hover:border-rose-400'
                            }`}
                          >
                            {slot.startTime}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={confirmReschedule} disabled={!rescheduleSlot || saving}>
                        {saving ? 'Salvando...' : 'Confirmar novo horário'}
                      </Button>
                      <Button variant="secondary" onClick={cancelReschedule}>
                        Cancelar remarcação
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
