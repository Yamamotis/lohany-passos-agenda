import { useEffect, useMemo, useState } from 'react'
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getProfessionalByUserId } from '../../lib/api/professionals'
import { listAppointmentsByProfessional, updateAppointmentStatus } from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { Badge, Button, Card } from '../../components/ui'

const STATUS_LABEL = {
  scheduled: { label: 'Agendado', tone: 'green' },
  completed: { label: 'Concluído', tone: 'stone' },
  no_show: { label: 'Não compareceu', tone: 'amber' },
}

export default function MyAgenda() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [professional, setProfessional] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  async function load() {
    const prof = await getProfessionalByUserId(user.id)
    setProfessional(prof)
    if (!prof) return
    const [appointmentsData, servicesData] = await Promise.all([listAppointmentsByProfessional(prof.id), listServices()])
    setAppointments(appointmentsData.filter((a) => a.status !== 'cancelled'))
    setServices(servicesData)
  }

  useEffect(() => {
    load()
  }, [user.id])

  async function handleStatusChange(id, status) {
    await updateAppointmentStatus(id, status)
    showToast(status === 'completed' ? 'Atendimento marcado como concluído.' : 'Agendamento marcado como falta.')
    load()
  }

  function serviceName(id) {
    return services.find((s) => s.id === id)?.name ?? '—'
  }

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  function appointmentsForDay(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    return appointments
      .filter((a) => a.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  if (!professional) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-stone-500">Este usuário não está vinculado a um profissional cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Minha agenda</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setWeekStart((d) => addWeeks(d, -1))}>
            ‹ Semana anterior
          </Button>
          <Button variant="secondary" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Hoje
          </Button>
          <Button variant="secondary" onClick={() => setWeekStart((d) => addWeeks(d, 1))}>
            Próxima semana ›
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(day)
          const today = isSameDay(day, new Date())
          return (
            <Card key={day.toISOString()} className={`min-w-[180px] ${today ? 'border-rose-400' : ''}`}>
              <p className={`mb-3 text-sm font-medium capitalize ${today ? 'text-rose-600' : 'text-stone-700'}`}>
                {format(day, 'EEE, dd/MM', { locale: ptBR })}
              </p>

              {dayAppointments.length === 0 ? (
                <p className="text-xs text-stone-400">Sem agendamentos</p>
              ) : (
                <div className="space-y-2">
                  {dayAppointments.map((appointment) => {
                    const status = STATUS_LABEL[appointment.status]
                    return (
                      <div key={appointment.id} className="rounded-lg border border-stone-200 p-2 text-xs">
                        <p className="font-medium text-stone-900">
                          {appointment.startTime} · {appointment.clientName}
                        </p>
                        <p className="text-stone-500">{serviceName(appointment.serviceId)}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <Badge tone={status?.tone}>{status?.label}</Badge>
                          {appointment.status === 'scheduled' && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(appointment.id, 'completed')}
                                className="text-stone-500 hover:text-stone-900"
                                title="Marcar como concluído"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(appointment.id, 'no_show')}
                                className="text-stone-500 hover:text-red-600"
                                title="Marcar como falta"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
