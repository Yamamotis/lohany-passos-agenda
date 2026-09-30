// Agenda semanal do profissional logado: uma coluna por dia da semana, com
// navegação entre semanas e ações rápidas pra avançar o atendimento.
//
// O banco valida a transição de status (ver validar_transicao_agendamento):
// um profissional não pode pular direto de AGENDADO para CONCLUIDO, por
// exemplo — precisa passar por CONFIRMADO e EM_ATENDIMENTO. As ações abaixo
// só oferecem os próximos passos válidos a partir do status atual.
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
  AGENDADO: { label: 'Agendado', tone: 'green' },
  CONFIRMADO: { label: 'Confirmado', tone: 'green' },
  EM_ATENDIMENTO: { label: 'Em atendimento', tone: 'amber' },
  CONCLUIDO: { label: 'Concluído', tone: 'stone' },
  NAO_COMPARECEU: { label: 'Não compareceu', tone: 'amber' },
}

const CANCELLED_STATUSES = ['CANCELADO_CLIENTE', 'CANCELADO_PROFISSIONAL']

// Próximas ações possíveis a partir de cada status (rótulo do botão + status alvo).
const NEXT_ACTIONS = {
  AGENDADO: [
    { label: 'Confirmar', next: 'CONFIRMADO' },
    { label: 'Falta', next: 'NAO_COMPARECEU' },
    { label: 'Cancelar', next: 'CANCELADO_PROFISSIONAL' },
  ],
  CONFIRMADO: [
    { label: 'Iniciar', next: 'EM_ATENDIMENTO' },
    { label: 'Falta', next: 'NAO_COMPARECEU' },
    { label: 'Cancelar', next: 'CANCELADO_PROFISSIONAL' },
  ],
  EM_ATENDIMENTO: [{ label: 'Concluir', next: 'CONCLUIDO' }],
}

export default function MyAgenda() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [professional, setProfessional] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  async function load() {
    // Descobre qual profissional está vinculado ao usuário logado.
    const prof = await getProfessionalByUserId(user.id)
    setProfessional(prof)
    if (!prof) return
    const [appointmentsData, servicesData] = await Promise.all([
      listAppointmentsByProfessional(prof.id),
      listServices(),
    ])
    setAppointments(appointmentsData.filter((a) => !CANCELLED_STATUSES.includes(a.status)))
    setServices(servicesData)
  }

  useEffect(() => {
    load()
  }, [user.id])

  async function handleStatusChange(id, status) {
    try {
      await updateAppointmentStatus(id, status)
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  function serviceName(id) {
    return services.find((s) => s.id === id)?.name ?? '—'
  }

  // Os 7 dias da semana selecionada, a partir da segunda-feira.
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  function appointmentsForDay(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    return appointments.filter((a) => a.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  // Usuário logado como profissional mas sem cadastro vinculado (não deveria
  // acontecer com os dados de seed, mas evita tela quebrada nesse caso).
  if (!professional) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-stone-500 dark:text-stone-400">Este usuário não está vinculado a um profissional cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Minha agenda</h1>
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

      {/* Uma coluna por dia (empilha no celular, grade de 7 colunas a partir de sm). */}
      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(day)
          const today = isSameDay(day, new Date())
          return (
            <Card key={day.toISOString()} className={`min-w-[180px] ${today ? 'border-rose-400' : ''}`}>
              <p
                className={`mb-3 text-sm font-medium capitalize ${
                  today ? 'text-rose-600' : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                {format(day, 'EEE, dd/MM', { locale: ptBR })}
              </p>

              {dayAppointments.length === 0 ? (
                <p className="text-xs text-stone-400 dark:text-stone-600">Sem agendamentos</p>
              ) : (
                <div className="space-y-2">
                  {dayAppointments.map((appointment) => {
                    const status = STATUS_LABEL[appointment.status]
                    const actions = NEXT_ACTIONS[appointment.status] ?? []
                    return (
                      <div
                        key={appointment.id}
                        className="rounded-lg border border-stone-200 p-2 text-xs dark:border-stone-800"
                      >
                        <p className="font-medium text-stone-900 dark:text-stone-100">
                          {appointment.startTime} · {appointment.clientName}
                        </p>
                        <p className="text-stone-500 dark:text-stone-400">{serviceName(appointment.serviceId)}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
                          <Badge tone={status?.tone}>{status?.label}</Badge>
                          {actions.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {actions.map((action) => (
                                <button
                                  key={action.next}
                                  type="button"
                                  onClick={() => handleStatusChange(appointment.id, action.next)}
                                  className="rounded border border-stone-300 px-1.5 py-0.5 text-stone-600 hover:border-rose-400 hover:text-rose-600 dark:border-stone-700 dark:text-stone-400 dark:hover:text-rose-400"
                                >
                                  {action.label}
                                </button>
                              ))}
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
