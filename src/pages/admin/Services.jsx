// CRUD de serviços do salão, com proteção contra exclusão de um serviço
// que ainda tenha agendamentos ativos vinculados.
import { useEffect, useState } from 'react'
import { createService, deleteService, listServiceCategories, listServices, updateService } from '../../lib/api/services'
import { hasScheduledAppointmentsForService } from '../../lib/api/appointments'
import { useToast } from '../../context/ToastContext'
import { Badge, Button, Card, Field, Input, Select } from '../../components/ui'

const EMPTY_FORM = { name: '', durationMinutes: '', price: '', categoryId: '' }

export default function Services() {
  const { showToast } = useToast()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  // editingId: null (nenhum formulário aberto) | 'new' (criando) | id do serviço em edição.
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    const [servicesData, categoriesData] = await Promise.all([listServices(), listServiceCategories()])
    setServices(servicesData)
    setCategories(categoriesData)
  }

  useEffect(() => {
    load()
  }, [])

  function startCreate() {
    setEditingId('new')
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' })
  }

  function startEdit(service) {
    setEditingId(service.id)
    setForm({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      categoryId: service.categoryId,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      name: form.name,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
      categoryId: form.categoryId,
    }
    if (editingId === 'new') {
      await createService(payload)
      showToast('Serviço cadastrado.')
    } else {
      await updateService(editingId, payload)
      showToast('Serviço atualizado.')
    }
    cancelEdit()
    load()
  }

  async function toggleActive(service) {
    await updateService(service.id, { active: !service.active })
    load()
  }

  async function handleDelete(id) {
    // Não deixa excluir um serviço que ainda tem agendamento ativo apontando para ele.
    if (await hasScheduledAppointmentsForService(id)) {
      showToast('Não é possível excluir: há agendamentos ativos com este serviço.', 'error')
      return
    }
    if (!window.confirm('Excluir este serviço? Essa ação não pode ser desfeita.')) return
    await deleteService(id)
    showToast('Serviço removido.')
    load()
  }

  function categoryName(id) {
    return categories.find((c) => c.id === id)?.name ?? '—'
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">Serviços</h1>
        {editingId === null && <Button onClick={startCreate}>Novo serviço</Button>}
      </div>

      {editingId !== null && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Categoria">
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Duração (min)">
              <Input
                type="number"
                min="5"
                step="5"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                required
              />
            </Field>
            <Field label="Preço (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>
            <div className="col-span-full flex gap-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {services.map((service) => (
          <Card key={service.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">{service.name}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {categoryName(service.categoryId)} · {service.durationMinutes}min · R$ {service.price}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={service.active ? 'green' : 'stone'}>{service.active ? 'Ativo' : 'Inativo'}</Badge>
              <Button variant="secondary" onClick={() => toggleActive(service)}>
                {service.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button variant="secondary" onClick={() => startEdit(service)}>
                Editar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(service.id)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
