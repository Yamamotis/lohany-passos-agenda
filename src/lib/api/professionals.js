// Acesso aos dados dos profissionais do salão.
import { storage } from '../storage'

export const listProfessionals = () => storage.getAll('professionals')

// Encontra o profissional vinculado a um usuário de login (usado na tela
// "Minha agenda", pra saber de quem é a agenda que está logada).
export const getProfessionalByUserId = async (userId) => {
  const professionals = await storage.getAll('professionals')
  return professionals.find((p) => p.userId === userId) ?? null
}

// Só os profissionais que realizam determinado serviço.
export async function listProfessionalsByService(serviceId) {
  const professionals = await storage.getAll('professionals')
  return professionals.filter((p) => p.serviceIds.includes(serviceId))
}

export const createProfessional = (data) => storage.insert('professionals', data)

export const updateProfessional = (id, patch) => storage.update('professionals', id, patch)

export const deleteProfessional = (id) => storage.remove('professionals', id)
