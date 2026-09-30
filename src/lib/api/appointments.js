// Acesso a agendamentos (`agendamentos`). A disponibilidade de horários e a
// criação de um novo agendamento são resolvidas pelo próprio banco (funções
// obter_horarios_disponiveis / criar_agendamento) — elas já conhecem
// expediente, intervalo de almoço, folgas, conflitos e as regras de negócio
// (antecedência mínima/máxima), então não duplicamos essa lógica aqui.
import { supabase } from '../supabaseClient'

const APPOINTMENT_SELECT = '*, clientes(usuarios(nome))'
const ACTIVE_STATUSES = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO']

function mapAppointment(row) {
  return {
    id: row.id,
    clientId: row.cliente_id,
    clientName: row.clientes?.usuarios?.nome ?? '',
    professionalId: row.profissional_id,
    serviceId: row.servico_id,
    date: row.data,
    startTime: row.hora_inicio?.slice(0, 5),
    endTime: row.hora_fim?.slice(0, 5),
    price: Number(row.valor),
    status: row.status,
    createdAt: row.criado_em,
  }
}

// agendamentos.cliente_id aponta para `clientes.id`, não direto para o
// usuário logado — por isso a maioria das funções abaixo recebe o id do
// usuário e resolve o cliente internamente.
async function getClienteId(userId) {
  const { data, error } = await supabase.from('clientes').select('id').eq('usuario_id', userId).single()
  if (error) throw error
  return data.id
}

export async function listAppointments() {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(APPOINTMENT_SELECT)
    .order('data', { ascending: false })
  if (error) throw error
  return data.map(mapAppointment)
}

export async function listAppointmentsByClient(userId) {
  const clienteId = await getClienteId(userId)
  const { data, error } = await supabase.from('agendamentos').select(APPOINTMENT_SELECT).eq('cliente_id', clienteId)
  if (error) throw error
  return data.map(mapAppointment)
}

export async function listAppointmentsByProfessional(professionalId) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(APPOINTMENT_SELECT)
    .eq('profissional_id', professionalId)
  if (error) throw error
  return data.map(mapAppointment)
}

// Horários livres de um profissional, num dia, para um serviço — calculado
// pelo banco (função obter_horarios_disponiveis). excludeAppointmentId é
// usado ao reagendar, pra não bloquear o próprio horário atual.
export async function getAvailableSlots({ professionalId, serviceId, date, excludeAppointmentId = null }) {
  const { data, error } = await supabase.rpc('obter_horarios_disponiveis', {
    p_profissional_id: professionalId,
    p_servico_id: serviceId,
    p_data: date,
    p_excluir_agendamento_id: excludeAppointmentId,
  })
  if (error) throw error
  return data.map((row) => ({ startTime: row.hora_inicio.slice(0, 5), endTime: row.hora_fim.slice(0, 5) }))
}

// Cria o agendamento via RPC: o banco valida serviço/vínculo com o
// profissional, antecedência mínima/máxima e disponibilidade real do
// horário (com proteção contra concorrência) antes de gravar.
export async function createAppointment({ clientUserId, professionalId, serviceId, date, startTime }) {
  const clienteId = await getClienteId(clientUserId)
  const { data, error } = await supabase.rpc('criar_agendamento', {
    p_cliente_id: clienteId,
    p_profissional_id: professionalId,
    p_servico_id: serviceId,
    p_data: date,
    p_hora_inicio: startTime,
  })
  if (error) throw new Error(error.message)
  return mapAppointment(data)
}

export async function updateAppointmentStatus(id, status) {
  const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

// Reagendar (nova data/horário) ou reatribuir (outro profissional/serviço).
export async function updateAppointment(id, patch) {
  const dbPatch = {}
  if (patch.date !== undefined) dbPatch.data = patch.date
  if (patch.startTime !== undefined) dbPatch.hora_inicio = patch.startTime
  if (patch.endTime !== undefined) dbPatch.hora_fim = patch.endTime
  if (patch.professionalId !== undefined) dbPatch.profissional_id = patch.professionalId
  if (patch.serviceId !== undefined) {
    dbPatch.servico_id = patch.serviceId
    const { data: service, error: serviceError } = await supabase
      .from('servicos')
      .select('preco')
      .eq('id', patch.serviceId)
      .single()
    if (serviceError) throw serviceError
    dbPatch.valor = service.preco
  }

  const { error } = await supabase.from('agendamentos').update(dbPatch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function hasScheduledAppointmentsForService(serviceId) {
  const { count, error } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('servico_id', serviceId)
    .in('status', ACTIVE_STATUSES)
  if (error) throw error
  return count > 0
}

export async function hasScheduledAppointmentsForProfessional(professionalId) {
  const { count, error } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('profissional_id', professionalId)
    .in('status', ACTIVE_STATUSES)
  if (error) throw error
  return count > 0
}
