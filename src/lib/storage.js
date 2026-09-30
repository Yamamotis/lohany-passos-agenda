// Camada de persistência local (localStorage). Todas as funções são async
// de propósito: quando o projeto migrar para Supabase, os arquivos em
// src/lib/api/*.js passam a chamar o supabase-js aqui dentro, mas mantêm
// a mesma assinatura — as telas não precisam mudar.

const PREFIX = 'salao:'

// Lê uma "coleção" (equivalente a uma tabela) do localStorage.
function readCollection(name) {
  const raw = localStorage.getItem(PREFIX + name)
  return raw ? JSON.parse(raw) : []
}

// Sobrescreve a coleção inteira no localStorage.
function writeCollection(name, items) {
  localStorage.setItem(PREFIX + name, JSON.stringify(items))
}

// Gera um identificador único para novos registros.
function uid() {
  return crypto.randomUUID()
}

export const storage = {
  // Retorna todos os registros de uma coleção.
  getAll(name) {
    return Promise.resolve(readCollection(name))
  },

  // Busca um registro pelo id; retorna null se não existir.
  getById(name, id) {
    const item = readCollection(name).find((item) => item.id === id) ?? null
    return Promise.resolve(item)
  },

  // Cria um novo registro com id gerado automaticamente.
  insert(name, data) {
    const items = readCollection(name)
    const record = { id: uid(), ...data }
    items.push(record)
    writeCollection(name, items)
    return Promise.resolve(record)
  },

  // Atualiza parcialmente (merge) um registro existente.
  update(name, id, patch) {
    const items = readCollection(name)
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return Promise.reject(new Error(`Registro ${id} não encontrado em ${name}.`))
    items[index] = { ...items[index], ...patch }
    writeCollection(name, items)
    return Promise.resolve(items[index])
  },

  // Remove um registro pelo id.
  remove(name, id) {
    writeCollection(name, readCollection(name).filter((item) => item.id !== id))
    return Promise.resolve()
  },

  // Popula a coleção com dados iniciais, apenas se ela ainda estiver vazia.
  seedIfEmpty(name, records) {
    if (readCollection(name).length === 0) {
      writeCollection(name, records)
    }
  },
}
