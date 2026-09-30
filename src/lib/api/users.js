// Consultas a usuários que não se encaixam em auth.js — hoje, só listar
// clientes cadastrados (usado pelo admin: escolher um cliente ao promovê-lo
// a profissional, ou ao criar um agendamento manual).
import { supabase } from '../supabaseClient'

export async function listUsersByRole(role) {
  const tipo = { admin: 'ADMIN', professional: 'PROFISSIONAL', client: 'CLIENTE' }[role]
  const { data, error } = await supabase.from('usuarios').select('id, nome, email, telefone').eq('tipo_usuario', tipo)
  if (error) throw error
  return data.map((row) => ({ id: row.id, name: row.nome, email: row.email, phone: row.telefone }))
}
