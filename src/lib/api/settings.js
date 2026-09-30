// Configurações gerais do salão (tabela `configuracoes`, sempre uma única
// linha com id fixo `true`): telefone de WhatsApp e as regras de
// antecedência mínima/máxima usadas pelo banco (obter_horarios_disponiveis,
// criar_agendamento, validar_transicao_agendamento) — expostas aqui só para
// exibição/edição na tela de admin, o cumprimento delas é sempre no servidor.
import { supabase } from '../supabaseClient'

const SELECT = 'telefone_whatsapp, antecedencia_minima_cancelamento_minutos, antecedencia_maxima_agendamento_dias'

function mapSettings(row) {
  return {
    phone: row.telefone_whatsapp ?? '',
    cancellationCutoffMinutes: row.antecedencia_minima_cancelamento_minutos,
    maxAdvanceBookingDays: row.antecedencia_maxima_agendamento_dias,
  }
}

export async function getSalonSettings() {
  const { data, error } = await supabase.from('configuracoes').select(SELECT).eq('id', true).single()
  if (error) throw error
  return mapSettings(data)
}

export async function updateSalonSettings({ phone, cancellationCutoffMinutes, maxAdvanceBookingDays }) {
  const dbPatch = {}
  if (phone !== undefined) dbPatch.telefone_whatsapp = phone
  if (cancellationCutoffMinutes !== undefined) dbPatch.antecedencia_minima_cancelamento_minutos = cancellationCutoffMinutes
  if (maxAdvanceBookingDays !== undefined) dbPatch.antecedencia_maxima_agendamento_dias = maxAdvanceBookingDays

  const { error } = await supabase.from('configuracoes').update(dbPatch).eq('id', true)
  if (error) throw error
}
