// Lista de agendamentos do cliente logado, com opção de cancelar ou
// remarcar (dentro do prazo mínimo) e um atalho de WhatsApp para o salão
// quando o prazo já não permite alteração pelo próprio app.
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  getAvailableSlots,
  listAppointmentsByClient,
  updateAppointment,
  updateAppointmentStatus,
} from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { listProfessionals } from '../../lib/api/professionals'
import { minutesUntil } from '../../lib/datetime'
import { getSalonSettings } from '../../lib/api/settings'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { Badge, Button, Card } from '../../components/ui'

const STATUS_LABEL = {
  AGENDADO: { label: 'Agendado', tone: 'green' },
  CONFIRMADO: { label: 'Confirmado', tone: 'green' },
  EM_ATENDIMENTO: { label: 'Em atendimento', tone: 'amber' },
  CONCLUIDO: { label: 'Concluído', tone: 'stone' },
  CANCELADO_CLIENTE: { label: 'Cancelado por você', tone: 'red' },
  CANCELADO_PROFISSIONAL: { label: 'Cancelado pelo salão', tone: 'red' },
  NAO_COMPARECEU: { label: 'Não compareceu', tone: 'amber' },
}

// Status em que o cliente ainda pode cancelar/remarcar sozinho.
const MODIFIABLE_STATUSES = ['AGENDADO', 'CONFIRMADO']

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
  const [cutoffMinutes, setCutoffMinutes] = useState(0)

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
    getSalonSettings().then((settings) => {
      setSalonPhone(settings.phone)
      setCutoffMinutes(settings.cancellationCutoffMinutes)
    })
  }, [user.id])

  // Recalcula os horários livres da remarcação sempre que a data muda,
  // excluindo o próprio agendamento (senão ele bloquearia o próprio horário).
  useEffect(() => {
    if (!reschedulingId) return
    const appointment = appointments.find((a) => a.id === reschedulingId)
    if (!appointment) return

    setRescheduleSlot(null)
    getAvailableSlots({
      professionalId: appointment.professionalId,
      serviceId: appointment.serviceId,
      date: rescheduleDate,
      excludeAppointmentId: appointment.id,
    }).then(setRescheduleSlots)
  }, [reschedulingId, rescheduleDate])

  // Cliente só pode mexer sozinho se faltar mais que o prazo mínimo de cancelamento.
  function canModify(appointment) {
    return (
      MODIFIABLE_STATUSES.includes(appointment.status) &&
      minutesUntil(appointment.date, appointment.startTime) >= cutoffMinutes
    )
  }

  async function handleCancel(id) {
    try {
      await updateAppointmentStatus(id, 'CANCELADO_CLIENTE')
      showToast('Agendamento cancelado.')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
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
    } catch (err) {
      showToast(err.message, 'error')
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
      <h1 className="mb-6 text-2xl font-semibold text-stone-900 dark:text-stone-100">Meus agendamentos</h1>

      {appointments.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">Você ainda não tem agendamentos.</p>
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
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {serviceName(appointment.serviceId)}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {appointment.date} às {appointment.startTime} · {professionalName(appointment.professionalId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={status?.tone}>{status?.label}</Badge>
                    {modifiable && (
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
                {MODIFIABLE_STATUSES.includes(appointment.status) && !modifiable && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Muito perto do horário — fale com o salão para alterar.
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
                  <div className="mt-4 space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800">
                    <input
                      type="date"
                      min={todayISO()}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    />
                    {rescheduleSlots.length === 0 ? (
                      <p className="text-sm text-stone-500 dark:text-stone-400">Nenhum horário disponível neste dia.</p>
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
                                : 'border-stone-300 text-stone-700 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
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
