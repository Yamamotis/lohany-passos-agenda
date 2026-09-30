import { useEffect, useState } from 'react'
import {
  createProfessional,
  deleteProfessional,
  listProfessionals,
  updateProfessional,
} from '../../lib/api/professionals'
import { listServices } from '../../lib/api/services'
import { hasScheduledAppointmentsForProfessional } from '../../lib/api/appointments'
import { useToast } from '../../context/ToastContext'
import { Button, Card, Field, Input } from '../../components/ui'

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

function emptyForm() {
  return {
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
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [newTimeOff, setNewTimeOff] = useState('')

  async function load() {
    const [professionalsData, servicesData] = await Promise.all([listProfessionals(), listServices()])
    setProfessionals(professionalsData)
    setServices(servicesData)
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setEditingId('new')
    setForm(emptyForm())
  }

  function startEdit(professional) {
    setEditingId(professional.id)
    setForm({
      name: professional.name,
      bio: professional.bio ?? '',
      serviceIds: professional.serviceIds,
      workingHours: professional.workingHours,
      timeOff: professional.timeOff ?? [],
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setNewTimeOff('')
  }

  function toggleService(serviceId) {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

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
      await createProfessional(form)
      showToast('Profissional cadastrado.')
    } else {
      await updateProfessional(editingId, form)
      showToast('Profissional atualizado.')
    }
    cancelEdit()
    load()
  }

  async function handleDelete(id) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Profissionais</h1>
        {editingId === null && <Button onClick={startCreate}>Novo profissional</Button>}
      </div>

      {editingId !== null && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Bio">
              <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Field>

            <Field label="Serviços realizados">
              <div className="flex flex-wrap gap-3">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center gap-2 text-sm text-stone-700">
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
              <div className="space-y-2">
                {WEEKDAYS.map((day) => {
                  const hours = form.workingHours[day.key]
                  return (
                    <div key={day.key} className="flex flex-wrap items-center gap-3">
                      <label className="flex w-16 items-center gap-2 text-sm text-stone-700">
                        <input type="checkbox" checked={!!hours} onChange={() => toggleDay(day.key)} />
                        {day.label}
                      </label>
                      {hours && (
                        <>
                          <input
                            type="time"
                            value={hours.start}
                            onChange={(e) => setDayHour(day.key, 'start', e.target.value)}
                            className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                          />
                          <span className="text-sm text-stone-500">até</span>
                          <input
                            type="time"
                            value={hours.end}
                            onChange={(e) => setDayHour(day.key, 'end', e.target.value)}
                            className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                          />
                          <label className="flex items-center gap-1 text-xs text-stone-600">
                            <input type="checkbox" checked={!!hours.breakStart} onChange={() => toggleBreak(day.key)} />
                            Intervalo
                          </label>
                          {hours.breakStart && (
                            <>
                              <input
                                type="time"
                                value={hours.breakStart}
                                onChange={(e) => setDayHour(day.key, 'breakStart', e.target.value)}
                                className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                              />
                              <span className="text-sm text-stone-500">até</span>
                              <input
                                type="time"
                                value={hours.breakEnd}
                                onChange={(e) => setDayHour(day.key, 'breakEnd', e.target.value)}
                                className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Field>

            <Field label="Folgas específicas (férias, feriados)">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={newTimeOff}
                  onChange={(e) => setNewTimeOff(e.target.value)}
                  className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
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
                      className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700"
                    >
                      {date}
                      <button type="button" onClick={() => removeTimeOff(date)} className="text-stone-500 hover:text-red-600">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <div className="flex gap-2">
              <Button type="submit">Salvar</Button>
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
              <p className="font-medium text-stone-900">{professional.name}</p>
              <p className="text-sm text-stone-500">{serviceNames(professional.serviceIds)}</p>
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
