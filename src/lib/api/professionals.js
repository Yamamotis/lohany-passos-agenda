// Acesso aos profissionais (`profissionais`) e sua agenda-base: serviços
// que realizam (`profissional_servicos`), expediente semanal
// (`horarios_profissionais` + `intervalos_profissionais` para o almoço) e
// folgas pontuais (`bloqueios_agenda`).
//
// Importante: no schema real, um profissional só existe se já houver uma
// conta de usuário (auth) por trás dele — criar um usuário novo não pode
// ser feito pelo painel admin com a chave anônima (exigiria a service role
// key, que nunca deve rodar no navegador). Por isso "criar profissional"
// aqui significa promover um cliente já cadastrado.
import { supabase } from '../supabaseClient'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function mapProfessional(row) {
  return {
    id: row.id,
    userId: row.usuario_id,
    name: row.nome,
    bio: row.descricao ?? '',
    active: row.ativo,
  }
}

// Anexa `serviceIds` (array de ids) a cada profissional, lendo a tabela de
// vínculo de uma vez só (evita N+1 consultas).
async function attachServiceIds(professionals) {
  if (professionals.length === 0) return []
  const ids = professionals.map((p) => p.id)
  const { data, error } = await supabase
    .from('profissional_servicos')
    .select('profissional_id, servico_id')
    .in('profissional_id', ids)
  if (error) throw error

  const byProfessional = new Map()
  for (const row of data) {
    const list = byProfessional.get(row.profissional_id) ?? []
    list.push(row.servico_id)
    byProfessional.set(row.profissional_id, list)
  }
  return professionals.map((p) => ({ ...p, serviceIds: byProfessional.get(p.id) ?? [] }))
}

export async function listProfessionals() {
  const { data, error } = await supabase.from('profissionais').select('*').order('nome')
  if (error) throw error
  return attachServiceIds(data.map(mapProfessional))
}

export async function getProfessionalByUserId(userId) {
  const { data, error } = await supabase.from('profissionais').select('*').eq('usuario_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const [withServices] = await attachServiceIds([mapProfessional(data)])
  return withServices
}

export async function listProfessionalsByService(serviceId) {
  const { data, error } = await supabase
    .from('profissional_servicos')
    .select('profissionais(*)')
    .eq('servico_id', serviceId)
  if (error) throw error

  const professionals = data.map((row) => mapProfessional(row.profissionais)).filter((p) => p.active)
  return attachServiceIds(professionals)
}

async function setProfessionalServices(professionalId, serviceIds) {
  const { error: deleteError } = await supabase
    .from('profissional_servicos')
    .delete()
    .eq('profissional_id', professionalId)
  if (deleteError) throw deleteError

  if (serviceIds.length > 0) {
    const rows = serviceIds.map((servico_id) => ({ profissional_id: professionalId, servico_id }))
    const { error } = await supabase.from('profissional_servicos').insert(rows)
    if (error) throw error
  }
}

// Data do dia seguinte (string "YYYY-MM-DD"), sem depender de fuso horário.
function nextDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day + 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Lê o expediente semanal e as folgas de um profissional, no mesmo formato
// que a tela de admin já usava (workingHours por dia da semana + timeOff).
export async function getProfessionalSchedule(professionalId) {
  const { data: horarios, error: horariosError } = await supabase
    .from('horarios_profissionais')
    .select('id, dia_semana, hora_inicial, hora_final, ativo')
    .eq('profissional_id', professionalId)
  if (horariosError) throw horariosError

  const horarioIds = horarios.map((h) => h.id)
  let intervalos = []
  if (horarioIds.length > 0) {
    const { data, error } = await supabase
      .from('intervalos_profissionais')
      .select('horario_profissional_id, hora_inicial, hora_final')
      .in('horario_profissional_id', horarioIds)
    if (error) throw error
    intervalos = data
  }

  const { data: bloqueios, error: bloqueiosError } = await supabase
    .from('bloqueios_agenda')
    .select('inicio')
    .eq('profissional_id', professionalId)
  if (bloqueiosError) throw bloqueiosError

  const workingHours = Object.fromEntries(WEEKDAY_KEYS.map((key) => [key, null]))
  for (const h of horarios) {
    if (!h.ativo) continue
    const entry = { start: h.hora_inicial.slice(0, 5), end: h.hora_final.slice(0, 5) }
    const pausa = intervalos.find((i) => i.horario_profissional_id === h.id)
    if (pausa) {
      entry.breakStart = pausa.hora_inicial.slice(0, 5)
      entry.breakEnd = pausa.hora_final.slice(0, 5)
    }
    workingHours[WEEKDAY_KEYS[h.dia_semana]] = entry
  }

  // Folgas são guardadas como bloqueio do dia inteiro; aqui só precisamos da data.
  const timeOff = bloqueios.map((b) => b.inicio.slice(0, 10))

  return { workingHours, timeOff }
}

// Substitui todo o expediente/folgas do profissional pelos valores dados —
// mais simples e seguro do que tentar calcular a diferença.
export async function saveProfessionalSchedule(professionalId, { workingHours, timeOff }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('horarios_profissionais').delete().eq('profissional_id', professionalId)
  // intervalos_profissionais é apagado em cascata junto com horarios_profissionais.

  for (const [dia, key] of WEEKDAY_KEYS.entries()) {
    const hours = workingHours[key]
    if (!hours) continue

    const { data: horario, error } = await supabase
      .from('horarios_profissionais')
      .insert({
        profissional_id: professionalId,
        dia_semana: dia,
        hora_inicial: hours.start,
        hora_final: hours.end,
        ativo: true,
      })
      .select('id')
      .single()
    if (error) throw error

    if (hours.breakStart && hours.breakEnd) {
      const { error: breakError } = await supabase
        .from('intervalos_profissionais')
        .insert({ horario_profissional_id: horario.id, hora_inicial: hours.breakStart, hora_final: hours.breakEnd })
      if (breakError) throw breakError
    }
  }

  await supabase.from('bloqueios_agenda').delete().eq('profissional_id', professionalId)
  if (timeOff.length > 0) {
    const rows = timeOff.map((date) => ({
      profissional_id: professionalId,
      inicio: `${date} 00:00:00`,
      fim: `${nextDateString(date)} 00:00:00`,
      motivo: 'Folga',
      criado_por: user.id,
    }))
    const { error } = await supabase.from('bloqueios_agenda').insert(rows)
    if (error) throw error
  }
}

// Promove um cliente já cadastrado a profissional (ver nota no topo do arquivo).
export async function promoteClientToProfessional({ userId, name, bio, serviceIds, workingHours, timeOff }) {
  const { error: userError } = await supabase.from('usuarios').update({ tipo_usuario: 'PROFISSIONAL' }).eq('id', userId)
  if (userError) throw userError

  const { data: professional, error: professionalError } = await supabase
    .from('profissionais')
    .insert({ usuario_id: userId, nome: name, descricao: bio, ativo: true })
    .select('id')
    .single()
  if (professionalError) throw professionalError

  await setProfessionalServices(professional.id, serviceIds)
  await saveProfessionalSchedule(professional.id, { workingHours, timeOff })
  return professional.id
}

export async function updateProfessional(id, { name, bio, serviceIds, workingHours, timeOff, active }) {
  const dbPatch = {}
  if (name !== undefined) dbPatch.nome = name
  if (bio !== undefined) dbPatch.descricao = bio
  if (active !== undefined) dbPatch.ativo = active

  if (Object.keys(dbPatch).length > 0) {
    const { error } = await supabase.from('profissionais').update(dbPatch).eq('id', id)
    if (error) throw error
  }
  if (serviceIds !== undefined) await setProfessionalServices(id, serviceIds)
  if (workingHours !== undefined && timeOff !== undefined) {
    await saveProfessionalSchedule(id, { workingHours, timeOff })
  }
}

export async function deleteProfessional(id) {
  const { error } = await supabase.from('profissionais').delete().eq('id', id)
  if (error) throw error
}
