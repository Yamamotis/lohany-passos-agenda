// Autenticação via Supabase Auth. A tabela `usuarios` guarda o perfil
// (nome, telefone, papel); ela é criada automaticamente por um trigger no
// banco quando alguém se cadastra (sempre como "CLIENTE" — promover para
// profissional/admin é feito à parte, nunca pelo cadastro público).
import { supabase } from '../supabaseClient'

// Papel no banco (maiúsculo, em português) -> papel usado no app (o resto
// do código já fala 'admin' | 'professional' | 'client').
const ROLE_FROM_DB = {
  ADMIN: 'admin',
  PROFISSIONAL: 'professional',
  CLIENTE: 'client',
}

async function fetchProfile(id) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, telefone, tipo_usuario')
    .eq('id', id)
    .single()
  if (error) throw error

  return {
    id: data.id,
    name: data.nome,
    email: data.email,
    phone: data.telefone,
    role: ROLE_FROM_DB[data.tipo_usuario] ?? 'client',
  }
}

export async function register({ name, email, phone, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome: name, telefone: phone } },
  })
  if (error) throw new Error(error.message === 'User already registered' ? 'Este e-mail já está cadastrado.' : error.message)

  // Se a confirmação por e-mail estiver ativa no projeto, ainda não há sessão aqui.
  if (!data.session) {
    throw new Error('Conta criada! Confirme seu e-mail antes de entrar.')
  }
  return fetchProfile(data.user.id)
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('E-mail ou senha inválidos.')
  return fetchProfile(data.user.id)
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  return fetchProfile(session.user.id)
}

export async function updateProfile(id, patch) {
  const dbPatch = {}
  if ('name' in patch) dbPatch.nome = patch.name
  if ('phone' in patch) dbPatch.telefone = patch.phone

  const { error } = await supabase.from('usuarios').update(dbPatch).eq('id', id)
  if (error) throw error
  return fetchProfile(id)
}

// Reautentica com a senha atual (Supabase não expõe "verificar senha" direto)
// antes de trocar — assim garantimos que quem está trocando sabe a senha antiga.
export async function changePassword(currentPassword, newPassword) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada, faça login novamente.')

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) throw new Error('Senha atual incorreta.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
