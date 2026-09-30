// Acesso aos serviços do salão (tabela `servicos`, agrupados por
// `categorias_servicos`). Os nomes de campo são traduzidos aqui pra manter
// o resto do app falando em inglês (name, durationMinutes, price...).
import { supabase } from '../supabaseClient'

function mapService(row) {
  return {
    id: row.id,
    name: row.nome,
    durationMinutes: row.duracao_minutos,
    price: Number(row.preco),
    active: row.ativo,
    categoryId: row.categoria_id,
  }
}

export async function listServices() {
  const { data, error } = await supabase.from('servicos').select('*').order('nome')
  if (error) throw error
  return data.map(mapService)
}

export async function listActiveServices() {
  const { data, error } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome')
  if (error) throw error
  return data.map(mapService)
}

export async function listServiceCategories() {
  const { data, error } = await supabase.from('categorias_servicos').select('id, nome').eq('ativo', true).order('nome')
  if (error) throw error
  return data.map((row) => ({ id: row.id, name: row.nome }))
}

export async function createService({ name, durationMinutes, price, categoryId }) {
  const { error } = await supabase.from('servicos').insert({
    nome: name,
    duracao_minutos: durationMinutes,
    preco: price,
    categoria_id: categoryId,
    ativo: true,
  })
  if (error) throw error
}

export async function updateService(id, patch) {
  const dbPatch = {}
  if ('name' in patch) dbPatch.nome = patch.name
  if ('durationMinutes' in patch) dbPatch.duracao_minutos = patch.durationMinutes
  if ('price' in patch) dbPatch.preco = patch.price
  if ('categoryId' in patch) dbPatch.categoria_id = patch.categoryId
  if ('active' in patch) dbPatch.ativo = patch.active

  const { error } = await supabase.from('servicos').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function deleteService(id) {
  // Remove primeiro o vínculo com profissionais (sem isso, a exclusão do
  // serviço esbarraria na referência da tabela profissional_servicos).
  await supabase.from('profissional_servicos').delete().eq('servico_id', id)
  const { error } = await supabase.from('servicos').delete().eq('id', id)
  if (error) throw error
}
