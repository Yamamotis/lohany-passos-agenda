// Painel inicial do admin: números gerais e algumas métricas de negócio
// (faturamento do mês, serviço mais procurado, taxa de falta por profissional).
import { useEffect, useMemo, useState } from 'react'
import { listAppointments } from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { listProfessionals } from '../../lib/api/professionals'
import { Card } from '../../components/ui'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// "YYYY-MM" do mês atual, usado para filtrar agendamentos do mês corrente.
function currentMonthKey() {
  return todayISO().slice(0, 7)
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [professionals, setProfessionals] = useState([])

  useEffect(() => {
    Promise.all([listAppointments(), listServices(), listProfessionals()]).then(
      ([appointmentsData, servicesData, professionalsData]) => {
        setAppointments(appointmentsData)
        setServices(servicesData)
        setProfessionals(professionalsData)
      },
    )
  }, [])

  const stats = useMemo(() => {
    const today = todayISO()
    return {
      today: appointments.filter((a) => a.date === today && a.status !== 'cancelled').length,
      scheduled: appointments.filter((a) => a.status === 'scheduled').length,
      services: services.length,
      professionals: professionals.length,
    }
  }, [appointments, services, professionals])

  // Soma o preço dos serviços dos atendimentos concluídos no mês atual.
  const monthlyRevenue = useMemo(() => {
    const monthKey = currentMonthKey()
    return appointments
      .filter((a) => a.status === 'completed' && a.date.startsWith(monthKey))
      .reduce((sum, a) => sum + (services.find((s) => s.id === a.serviceId)?.price ?? 0), 0)
  }, [appointments, services])

  // Serviço com mais agendamentos (contando qualquer status, exceto cancelado).
  const topService = useMemo(() => {
    const counts = new Map()
    appointments
      .filter((a) => a.status !== 'cancelled')
      .forEach((a) => counts.set(a.serviceId, (counts.get(a.serviceId) ?? 0) + 1))
    let best = null
    for (const [serviceId, count] of counts) {
      if (!best || count > best.count) best = { serviceId, count }
    }
    if (!best) return null
    return { name: services.find((s) => s.id === best.serviceId)?.name ?? '—', count: best.count }
  }, [appointments, services])

  // Para cada profissional, quantos atendimentos foram falta em relação ao total (concluídos + faltas).
  const noShowByProfessional = useMemo(() => {
    return professionals
      .map((professional) => {
        const relevant = appointments.filter(
          (a) => a.professionalId === professional.id && (a.status === 'completed' || a.status === 'no_show'),
        )
        const noShows = relevant.filter((a) => a.status === 'no_show').length
        const rate = relevant.length > 0 ? Math.round((noShows / relevant.length) * 100) : null
        return { name: professional.name, noShows, total: relevant.length, rate }
      })
      .filter((row) => row.total > 0)
  }, [appointments, professionals])

  const cards = [
    { label: 'Agendamentos hoje', value: stats.today },
    { label: 'Agendamentos ativos', value: stats.scheduled },
    { label: 'Serviços cadastrados', value: stats.services },
    { label: 'Profissionais', value: stats.professionals },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Painel</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-stone-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold text-stone-900">{card.value}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold text-stone-900">Visão do negócio</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-stone-500">Faturamento do mês (atendimentos concluídos)</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{formatCurrency(monthlyRevenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Serviço mais procurado</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{topService?.name ?? '—'}</p>
          {topService && <p className="text-sm text-stone-500">{topService.count} agendamento(s)</p>}
        </Card>
      </div>

      {noShowByProfessional.length > 0 && (
        <Card className="mt-4">
          <p className="mb-3 text-sm font-medium text-stone-900">Taxa de falta por profissional</p>
          <div className="space-y-2">
            {noShowByProfessional.map((row) => (
              <div key={row.name} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{row.name}</span>
                <span className="text-stone-500">
                  {row.noShows} falta(s) em {row.total} atendimento(s) · {row.rate}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
