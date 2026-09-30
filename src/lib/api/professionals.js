import { storage } from '../storage'

export const listProfessionals = () => storage.getAll('professionals')

export const getProfessionalByUserId = async (userId) => {
  const professionals = await storage.getAll('professionals')
  return professionals.find((p) => p.userId === userId) ?? null
}

export async function listProfessionalsByService(serviceId) {
  const professionals = await storage.getAll('professionals')
  return professionals.filter((p) => p.serviceIds.includes(serviceId))
}

export const createProfessional = (data) => storage.insert('professionals', data)

export const updateProfessional = (id, patch) => storage.update('professionals', id, patch)

export const deleteProfessional = (id) => storage.remove('professionals', id)
