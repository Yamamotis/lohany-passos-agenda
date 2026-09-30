// Consultas a usuários que não se encaixam em auth.js (ex: listar clientes
// cadastrados para o admin escolher ao criar um agendamento manual).
import { storage } from '../storage'

export async function listUsersByRole(role) {
  const users = await storage.getAll('users')
  return users.filter((u) => u.role === role).map(({ password: _password, ...rest }) => rest)
}
