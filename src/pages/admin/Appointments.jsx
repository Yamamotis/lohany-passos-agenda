// Gestão de todos os agendamentos: filtros por profissional/status, criação
// manual (cliente cadastrado ou avulso) e edição/reatribuição de um
// agendamento existente (outro profissional, serviço, data ou horário).
import { useEffect, useMemo, useState } from 'react'
import {
  createAppointment,
  listAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { listProfessionals } from '../../lib/api/professionals'
import { listUsersByRole } from '../../lib/api/users'
import { getAvailableSlots } from '../../lib/slots'
import { useToast } from '../../context/ToastContext'
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui'

const STATUS_LABEL = {
  scheduled: { label: 'Agendado', tone: 'green' },
  completed: { label: 'Concluído', tone: 'stone' },
  cancelled: { label: 'Cancelado', tone: 'red' },
  no_show: { label: 'Não compareceu', tone: 'amber' },
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return {
    clientMode: 'existing', // 'existing' (cliente cadastrado) | 'walkin' (sem conta, só o nome)
    clientId: '',
    clientName: '',
    serviceId: '',
    professionalId: '',
    date: todayISO(),
  }
}

export default function Appointments() {
  const { showToast } = useToast()
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [professionals, setProfessionals] = useState([])
  const [clients, setClients] = useState([])
  const [professionalFilter, setProfessionalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // editingId: null (formulário fechado) | 'new' (criando) | id do agendamento em edição.
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [slot, setSlot] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [appointmentsData, servicesData, professionalsData, clientsData] = await Promise.all([
      listAppointments(),
      listServices(),
      listProfessionals(),
      listUsersByRole('client'),
    ])
    appointmentsData.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    setAppointments(appointmentsData)
    setServices(servicesData)
    setProfessionals(professionalsData)
    setClients(clientsData)
  }

  useEffect(() => {
    load()
  }, [])

  const professionalsForService = useMemo(
    () => professionals.filter((p) => p.serviceIds.includes(form.serviceId)),
    [professionals, form.serviceId],
  )

  const selectedService = useMemo(() => services.find((s) => s.id === form.serviceId), [services, form.serviceId])
  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === form.professionalId),
    [professionals, form.professionalId],
  )

  // Horários livres do profissional escolhido, excluindo o próprio agendamento
  // quando estamos editando (senão ele bloquearia o próprio horário atual).
  const availableSlots = useMemo(() => {
    if (!selectedProfessional || !selectedService || !form.date) return []
    const existing = appointments.filter((a) => a.professionalId === selectedProfessional.id)
    return getAvailableSlots({
      professional: selectedProfessional,
      durationMinutes: selectedService.durationMinutes,
      date: form.date,
      existingAppointments: existing,
      excludeAppointmentId: editingId === 'new' ? null : editingId,
    })
  }, [selectedProfessional, selectedService, form.date, appointments, editingId])

  function startCreate() {
    setEditingId('new')
    setForm(emptyForm())
    setSlot(null)
  }

  function startEdit(appointment) {
    setEditingId(appointment.id)
    setForm({
      clientMode: appointment.clientId ? 'existing' : 'walkin',
      clientId: appointment.clientId ?? '',
      clientName: appointment.clientName,
      serviceId: appointment.serviceId,
      professionalId: appointment.professionalId,
      date: appointment.date,
    })
    setSlot({ startTime: appointment.startTime, endTime: appointment.endTime })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm())
    setSlot(null)
  }

  // Qualquer mudança relevante do formulário invalida o horário já escolhido.
  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
    setSlot(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!slot) return
    setSaving(true)
    try {
      const clientName =
        form.clientMode === 'existing' ? clients.find((c) => c.id === form.clientId)?.name ?? '' : form.clientName

      const payload = {
        clientId: form.clientMode === 'existing' ? form.clientId : null,
        clientName,
        serviceId: form.serviceId,
        professionalId: form.professionalId,
        date: form.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }

      if (editingId === 'new') {
        await createAppointment(payload)
        showToast('Agendamento criado.')
      } else {
        await updateAppointment(editingId, payload)
        showToast('Agendamento atualizado.')
      }
      cancelEdit()
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id, status) {
    await updateAppointmentStatus(id, status)
    showToast('Agendamento cancelado.')
    load()
  }

  function serviceName(id) {
    return services.find((s) => s.id === id)?.name ?? '—'
  }

  function professionalName(id) {
    return professionals.find((p) => p.id === id)?.name ?? '—'
  }

  const filtered = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (!professionalFilter || a.professionalId === professionalFilter) &&
          (!statusFilter || a.status === statusFilter),
      ),
    [appointments, professionalFilter, statusFilter],
  )

  const canSubmit =
    slot &&
    form.serviceId &&
    form.professionalId &&
    (form.clientMode === 'existing' ? form.clientId : form.clientName.trim())

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Agendamentos</h1>
        {editingId === null && <Button onClick={startCreate}>Novo agendamento</Button>}
      </div>

      {editingId !== null && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Cliente">
              <div className="mb-2 flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.clientMode === 'existing'}
                    onChange={() => updateForm({ clientMode: 'existing' })}
                  />
                  Cliente cadastrado
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.clientMode === 'walkin'}
                    onChange={() => updateForm({ clientMode: 'walkin' })}
                  />
                  Sem cadastro (avulso)
                </label>
              </div>
              {form.clientMode === 'existing' ? (
                <Select value={form.clientId} onChange={(e) => updateForm({ clientId: e.target.value })}>
                  <option value="">Selecione o cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="Nome do cliente"
                  value={form.clientName}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                />
              )}
            </Field>

            <Field label="Serviço">
              <Select
                value={form.serviceId}
                onChange={(e) => updateForm({ serviceId: e.target.value, professionalId: '' })}
              >
                <option value="">Selecione um serviço</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {service.durationMinutes}min
                  </option>
                ))}
              </Select>
            </Field>

            {form.serviceId && (
              <Field label="Profissional">
                <Select value={form.professionalId} onChange={(e) => updateForm({ professionalId: e.target.value })}>
                  <option value="">Selecione um profissional</option>
                  {professionalsForService.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {form.professionalId && (
              <Field label="Data">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm({ date: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </Field>
            )}

            {form.professionalId && (
              <Field label="Horário">
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-stone-500">Nenhum horário disponível neste dia.</p>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {availableSlots.map((s) => (
                      <button
                        key={s.startTime}
                        type="button"
                        onClick={() => setSlot(s)}
                        className={`rounded-lg border px-2 py-1 text-sm ${
                          slot?.startTime === s.startTime
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : 'border-stone-300 text-stone-700 hover:border-rose-400'
                        }`}
                      >
                        {s.startTime}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={!canSubmit || saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Profissional">
          <Select value={professionalFilter} onChange={(e) => setProfessionalFilter(e.target.value)}>
            <option value="">Todos</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-stone-500">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment) => {
            const status = STATUS_LABEL[appointment.status]
            return (
              <Card key={appointment.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">{appointment.clientName}</p>
                  <p className="text-sm text-stone-500">
                    {serviceName(appointment.serviceId)} · {professionalName(appointment.professionalId)} ·{' '}
                    {appointment.date} às {appointment.startTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={status?.tone}>{status?.label}</Badge>
                  {appointment.status === 'scheduled' && (
                    <>
                      <Button variant="secondary" onClick={() => startEdit(appointment)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => handleStatusChange(appointment.id, 'cancelled')}>
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
