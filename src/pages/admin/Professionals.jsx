// CRUD de profissionais: dados básicos, serviços realizados, expediente por
// dia da semana (com intervalo de almoço opcional) e folgas pontuais.
//
// "Criar profissional" aqui promove um cliente já cadastrado (ver nota em
// src/lib/api/professionals.js) — criar uma conta de login nova exigiria a
// service role key, que não pode rodar no navegador.
import { useEffect, useState } from 'react'
import {
  deleteProfessional,
  getProfessionalSchedule,
  listProfessionals,
  promoteClientToProfessional,
  updateProfessional,
} from '../../lib/api/professionals'
import { listServices } from '../../lib/api/services'
import { listUsersByRole } from '../../lib/api/users'
import { hasScheduledAppointmentsForProfessional } from '../../lib/api/appointments'
import { useToast } from '../../context/ToastContext'
import { Button, Card, Field, Input, Select } from '../../components/ui'

const WEEKDAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
]

const DEFAULT_DAY_HOURS = { start: '09:00', end: '18:00' }

// Formulário vazio: todos os dias começam sem expediente definido (null).
function emptyForm() {
  return {
    userId: '',
    name: '',
    bio: '',
    serviceIds: [],
    workingHours: Object.fromEntries(WEEKDAYS.map((d) => [d.key, null])),
    timeOff: [],
  }
}

export default function Professionals() {
  const { showToast } = useToast()
  const [professionals, setProfessionals] = useState([])
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [newTimeOff, setNewTimeOff] = useState('')
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  async function load() {
    const [professionalsData, servicesData, clientsData] = await Promise.all([
      listProfessionals(),
      listServices(),
      listUsersByRole('client'),
    ])
    setProfessionals(professionalsData)
    setServices(servicesData)
    setClients(clientsData)
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setEditingId('new')
    setForm(emptyForm())
  }

  async function startEdit(professional) {
    setEditingId(professional.id)
    setLoadingSchedule(true)
    setForm({
      userId: professional.userId,
      name: professional.name,
      bio: professional.bio ?? '',
      serviceIds: professional.serviceIds,
      workingHours: emptyForm().workingHours,
      timeOff: [],
    })
    const schedule = await getProfessionalSchedule(professional.id)
    setForm((prev) => ({ ...prev, workingHours: schedule.workingHours, timeOff: schedule.timeOff }))
    setLoadingSchedule(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setNewTimeOff('')
  }

  function selectClient(userId) {
    const client = clients.find((c) => c.id === userId)
    setForm((prev) => ({ ...prev, userId, name: prev.name || client?.name || '' }))
  }

  function toggleService(serviceId) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  // Liga/desliga o expediente de um dia (null = não trabalha nesse dia).
  function toggleDay(dayKey) {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [dayKey]: prev.workingHours[dayKey] ? null : DEFAULT_DAY_HOURS,
      },
    }))
  }

  function setDayHour(dayKey, field, value) {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [dayKey]: { ...prev.workingHours[dayKey], [field]: value },
      },
    }))
  }

  // Liga/desliga o intervalo de almoço de um dia, removendo os campos
  // breakStart/breakEnd por completo quando desligado (em vez de zerá-los).
  function toggleBreak(dayKey) {
    setForm((prev) => {
      const hours = prev.workingHours[dayKey]
      if (!hours) return prev
      if (hours.breakStart) {
        const { breakStart: _breakStart, breakEnd: _breakEnd, ...rest } = hours
        return { ...prev, workingHours: { ...prev.workingHours, [dayKey]: rest } }
      }
      return {
        ...prev,
        workingHours: { ...prev.workingHours, [dayKey]: { ...hours, breakStart: '12:00', breakEnd: '13:00' } },
      }
    })
  }

  function addTimeOff() {
    if (!newTimeOff || form.timeOff.includes(newTimeOff)) return
    setForm((prev) => ({ ...prev, timeOff: [...prev.timeOff, newTimeOff].sort() }))
    setNewTimeOff('')
  }

  function removeTimeOff(date) {
    setForm((prev) => ({ ...prev, timeOff: prev.timeOff.filter((d) => d !== date) }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (editingId === 'new') {
      await promoteClientToProfessional(form)
      showToast('Profissional cadastrado.')
    } else {
      await updateProfessional(editingId, form)
      showToast('Profissional atualizado.')
    }
    cancelEdit()
    load()
  }

  async function handleDelete(id) {
    // Não deixa excluir um profissional que ainda tem agendamento ativo.
    if (await hasScheduledAppointmentsForProfessional(id)) {
      showToast('Não é possível excluir: há agendamentos ativos com este profissional.', 'error')
      return
    }
    if (!window.confirm('Excluir este profissional? Essa ação não pode ser desfeita.')) return
    await deleteProfessional(id)
    showToast('Profissional removido.')
    load()
  }

  function serviceNames(ids) {
    return services
      .filter((s) => ids.includes(s.id))
      .map((s) => s.name)
      .join(', ')
  }

  const canSubmit = editingId === 'new' ? form.userId && form.name : true

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Profissionais</h1>
        {editingId === null && <Button onClick={startCreate}>Novo profissional</Button>}
      </div>

      {editingId !== null && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {editingId === 'new' && (
              <Field label="Cliente a promover">
                <Select value={form.userId} onChange={(e) => selectClient(e.target.value)} required>
                  <option value="">Selecione um cliente cadastrado</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  A pessoa precisa ter criado uma conta pela tela de cadastro antes de virar profissional.
                </p>
              </Field>
            )}

            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Bio">
              <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>

            <Field label="Serviços realizados">
              <div className="flex flex-wrap gap-3">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Horário de trabalho">
              {loadingSchedule ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">Carregando...</p>
              ) : (
                <div className="space-y-2">
                  {WEEKDAYS.map((day) => {
                    const hours = form.workingHours[day.key]
                    return (
                      <div key={day.key} className="flex flex-wrap items-center gap-3">
                        <label className="flex w-16 items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                          <input type="checkbox" checked={!!hours} onChange={() => toggleDay(day.key)} />
                          {day.label}
                        </label>
                        {hours && (
                          <>
                            <input
                              type="time"
                              value={hours.start}
                              onChange={(e) => setDayHour(day.key, 'start', e.target.value)}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                            />
                            <span className="text-sm text-stone-500 dark:text-stone-400">até</span>
                            <input
                              type="time"
                              value={hours.end}
                              onChange={(e) => setDayHour(day.key, 'end', e.target.value)}
                              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                            />
                            <label className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
                              <input
                                type="checkbox"
                                checked={!!hours.breakStart}
                                onChange={() => toggleBreak(day.key)}
                              />
                              Intervalo
                            </label>
                            {hours.breakStart && (
                              <>
                                <input
                                  type="time"
                                  value={hours.breakStart}
                                  onChange={(e) => setDayHour(day.key, 'breakStart', e.target.value)}
                                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                                />
                                <span className="text-sm text-stone-500 dark:text-stone-400">até</span>
                                <input
                                  type="time"
                                  value={hours.breakEnd}
                                  onChange={(e) => setDayHour(day.key, 'breakEnd', e.target.value)}
                                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                                />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Field>

            <Field label="Folgas específicas (férias, feriados)">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newTimeOff}
                  onChange={(e) => setNewTimeOff(e.target.value)}
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
                <Button type="button" variant="secondary" onClick={addTimeOff}>
                  Adicionar
                </Button>
              </div>
              {form.timeOff.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.timeOff.map((date) => (
                    <span
                      key={date}
                      className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {date}
                      <button
                        type="button"
                        onClick={() => removeTimeOff(date)}
                        className="text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={!canSubmit || loadingSchedule}>
                Salvar
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {professionals.map((professional) => (
          <Card key={professional.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{professional.name}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">{serviceNames(professional.serviceIds)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => startEdit(professional)}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(professional.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
