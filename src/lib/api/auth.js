import { storage } from '../storage'

const SESSION_KEY = 'salao:session'

function sanitize(user) {
  const { password: _password, ...rest } = user
  return rest
}

export async function register({ name, email, phone, password }) {
  const users = await storage.getAll('users')
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este e-mail já está cadastrado.')
  }
  const user = await storage.insert('users', { name, email, phone, password, role: 'client' })
  localStorage.setItem(SESSION_KEY, user.id)
  return sanitize(user)
}

export async function login({ email, password }) {
  const users = await storage.getAll('users')
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) throw new Error('E-mail ou senha inválidos.')
  localStorage.setItem(SESSION_KEY, user.id)
  return sanitize(user)
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export async function getCurrentUser() {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const user = await storage.getById('users', id)
  return user ? sanitize(user) : null
}

export async function updateProfile(id, patch) {
  const user = await storage.update('users', id, patch)
  return sanitize(user)
}

export async function changePassword(id, currentPassword, newPassword) {
  const user = await storage.getById('users', id)
  if (!user || user.password !== currentPassword) {
    throw new Error('Senha atual incorreta.')
  }
  await storage.update('users', id, { password: newPassword })
}
