// Acesso aos dados de serviços do salão (corte, escova, tatuagem etc).
import { storage } from '../storage'

export const listServices = () => storage.getAll('services')

// Só os serviços ativos aparecem na tela de agendamento do cliente.
export async function listActiveServices() {
  const services = await storage.getAll('services')
  return services.filter((s) => s.active)
}

export const createService = (data) => storage.insert('services', { active: true, ...data })

export const updateService = (id, patch) => storage.update('services', id, patch)

export const deleteService = (id) => storage.remove('services', id)
