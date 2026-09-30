// Gestão de todos os agendamentos: filtros por profissional/status, criação
// manual (sempre para um cliente já cadastrado — o banco exige uma conta
// por trás de todo agendamento) e edição/reatribuição de um agendamento
// existente (outro profissional, serviço, data ou horário).
import { useEffect, useMemo, useState } from 'react'
import {
  createAppointment,
  getAvailableSlots,
  listAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from '../../lib/api/appointments'
import { listServices } from '../../lib/api/services'
import { listProfessionals } from '../../lib/api/professionals'
import { listUsersByRole } from '../../lib/api/users'
import { useToast } from '../../context/ToastContext'
import { Badge, Button, Card, Field, Select } from '../../components/ui'

const STATUS_LABEL = {
  AGENDADO: { label: 'Agendado', tone: 'green' },
  CONFIRMADO: { label: 'Confirmado', tone: 'green' },
  EM_ATENDIMENTO: { label: 'Em atendimento', tone: 'amber' },
  CONCLUIDO: { label: 'Concluído', tone: 'stone' },
  CANCELADO_CLIENTE: { label: 'Cancelado pelo cliente', tone: 'red' },
  CANCELADO_PROFISSIONAL: { label: 'Cancelado pelo salão', tone: 'red' },
  NAO_COMPARECEU: { label: 'Não compareceu', tone: 'amber' },
}

// Agendamentos que ainda podem ser editados/cancelados pelo admin.
const ACTIVE_STATUSES = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm() {
  return { clientUserId: '', serviceId: '', professionalId: '', date: todayISO() }
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
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [slot, setSlot] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
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

  // Horários livres do profissional escolhido, excluindo o próprio agendamento
  // quando estamos editando (senão ele bloquearia o próprio horário atual).
  useEffect(() => {
    setSlot(null)
    setAvailableSlots([])
    if (!form.professionalId || !form.serviceId || !form.date) return

    getAvailableSlots({
      professionalId: form.professionalId,
      serviceId: form.serviceId,
      date: form.date,
      excludeAppointmentId: editingId === 'new' ? null : editingId,
    }).then(setAvailableSlots)
  }, [form.professionalId, form.serviceId, form.date, editingId])

  function startCreate() {
    setEditingId('new')
    setEditingAppointment(null)
    setForm(emptyForm())
    setSlot(null)
  }

  function startEdit(appointment) {
    setEditingId(appointment.id)
    setEditingAppointment(appointment)
    setForm({
      clientUserId: '',
      serviceId: appointment.serviceId,
      professionalId: appointment.professionalId,
      date: appointment.date,
    })
    setSlot({ startTime: appointment.startTime, endTime: appointment.endTime })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingAppointment(null)
    setForm(emptyForm())
    setSlot(null)
  }

  // Qualquer mudança relevante do formulário invalida o horário já escolhido.
  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!slot) return
    setSaving(true)
    try {
      if (editingId === 'new') {
        await createAppointment({
          clientUserId: form.clientUserId,
          professionalId: form.professionalId,
          serviceId: form.serviceId,
          date: form.date,
          startTime: slot.startTime,
        })
        showToast('Agendamento criado.')
      } else {
        await updateAppointment(editingId, {
          serviceId: form.serviceId,
          professionalId: form.professionalId,
          date: form.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
        showToast('Agendamento atualizado.')
      }
      cancelEdit()
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(id) {
    try {
      await updateAppointmentStatus(id, 'CANCELADO_PROFISSIONAL')
      showToast('Agendamento cancelado.')
      load()
    } catch (err) {
      showToast(err.message, 'error')
    }
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

  const canSubmit = slot && form.serviceId && form.professionalId && (editingId !== 'new' || form.clientUserId)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Agendamentos</h1>
        {editingId === null && <Button onClick={startCreate}>Novo agendamento</Button>}
      </div>

      {editingId !== null && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {editingId === 'new' ? (
              <Field label="Cliente">
                <Select value={form.clientUserId} onChange={(e) => updateForm({ clientUserId: e.target.value })}>
                  <option value="">Selecione o cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Só é possível agendar para quem já tem conta cadastrada.
                </p>
              </Field>
            ) : (
              <Field label="Cliente">
                <p className="text-sm text-stone-700 dark:text-stone-300">{editingAppointment?.clientName}</p>
              </Field>
            )}

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
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
              </Field>
            )}

            {form.professionalId && (
              <Field label="Horário">
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-stone-500 dark:text-stone-400">Nenhum horário disponível neste dia.</p>
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
                            : 'border-stone-300 text-stone-700 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
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
        <p className="text-stone-500 dark:text-stone-400">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((appointment) => {
            const status = STATUS_LABEL[appointment.status]
            const active = ACTIVE_STATUSES.includes(appointment.status)
            return (
              <Card key={appointment.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{appointment.clientName}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {serviceName(appointment.serviceId)} · {professionalName(appointment.professionalId)} ·{' '}
                    {appointment.date} às {appointment.startTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={status?.tone}>{status?.label}</Badge>
                  {active && (
                    <>
                      <Button variant="secondary" onClick={() => startEdit(appointment)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => handleCancel(appointment.id)}>
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
