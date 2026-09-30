// Autenticação simples baseada em localStorage (fase local do projeto).
// Quando o Supabase entrar, este arquivo passa a chamar supabase.auth.*,
// mantendo as mesmas funções exportadas para não precisar mexer nas telas.
import { storage } from '../storage'

const SESSION_KEY = 'salao:session'

// Remove a senha do objeto antes de expor o usuário para o resto do app.
function sanitize(user) {
  const { password: _password, ...rest } = user
  return rest
}

// Cria uma conta de cliente e já efetua o login.
export async function register({ name, email, phone, password }) {
  const users = await storage.getAll('users')
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('Este e-mail já está cadastrado.')
  }
  const user = await storage.insert('users', { name, email, phone, password, role: 'client' })
  localStorage.setItem(SESSION_KEY, user.id)
  return sanitize(user)
}

// Autentica por e-mail/senha e guarda a sessão (id do usuário) no navegador.
export async function login({ email, password }) {
  const users = await storage.getAll('users')
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) throw new Error('E-mail ou senha inválidos.')
  localStorage.setItem(SESSION_KEY, user.id)
  return sanitize(user)
}

// Encerra a sessão atual.
export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

// Recupera o usuário logado (se houver) a partir da sessão salva.
export async function getCurrentUser() {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const user = await storage.getById('users', id)
  return user ? sanitize(user) : null
}

// Atualiza dados do próprio perfil (nome, telefone, etc).
export async function updateProfile(id, patch) {
  const user = await storage.update('users', id, patch)
  return sanitize(user)
}

// Troca a senha, validando a senha atual antes.
export async function changePassword(id, currentPassword, newPassword) {
  const user = await storage.getById('users', id)
  if (!user || user.password !== currentPassword) {
    throw new Error('Senha atual incorreta.')
  }
  await storage.update('users', id, { password: newPassword })
}
