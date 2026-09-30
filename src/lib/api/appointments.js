import { storage } from '../storage'

export const listAppointments = () => storage.getAll('appointments')

export async function listAppointmentsByClient(clientId) {
  const appointments = await storage.getAll('appointments')
  return appointments.filter((a) => a.clientId === clientId)
}

export async function listAppointmentsByProfessional(professionalId) {
  const appointments = await storage.getAll('appointments')
  return appointments.filter((a) => a.professionalId === professionalId)
}

export const createAppointment = (data) =>
  storage.insert('appointments', { status: 'scheduled', createdAt: new Date().toISOString(), ...data })

export const updateAppointmentStatus = (id, status) => storage.update('appointments', id, { status })

export const updateAppointment = (id, patch) => storage.update('appointments', id, patch)

export async function hasScheduledAppointmentsForService(serviceId) {
  const appointments = await storage.getAll('appointments')
  return appointments.some((a) => a.serviceId === serviceId && a.status === 'scheduled')
}

export async function hasScheduledAppointmentsForProfessional(professionalId) {
  const appointments = await storage.getAll('appointments')
  return appointments.some((a) => a.professionalId === professionalId && a.status === 'scheduled')
}
