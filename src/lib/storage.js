// Camada de persistência local (localStorage). Todas as funções são async
// de propósito: quando o projeto migrar para Supabase, os arquivos em
// src/lib/api/*.js passam a chamar o supabase-js aqui dentro, mas mantêm
// a mesma assinatura — as telas não precisam mudar.

const PREFIX = 'salao:'

function readCollection(name) {
  const raw = localStorage.getItem(PREFIX + name)
  return raw ? JSON.parse(raw) : []
}

function writeCollection(name, items) {
  localStorage.setItem(PREFIX + name, JSON.stringify(items))
}

function uid() {
  return crypto.randomUUID()
}

export const storage = {
  getAll(name) {
    return Promise.resolve(readCollection(name))
  },

  getById(name, id) {
    const item = readCollection(name).find((item) => item.id === id) ?? null
    return Promise.resolve(item)
  },

  insert(name, data) {
    const items = readCollection(name)
    const record = { id: uid(), ...data }
    items.push(record)
    writeCollection(name, items)
    return Promise.resolve(record)
  },

  update(name, id, patch) {
    const items = readCollection(name)
    const index = items.findIndex((item) => item.id === id)
    if (index === -1) return Promise.reject(new Error(`Registro ${id} não encontrado em ${name}.`))
    items[index] = { ...items[index], ...patch }
    writeCollection(name, items)
    return Promise.resolve(items[index])
  },

  remove(name, id) {
    writeCollection(name, readCollection(name).filter((item) => item.id !== id))
    return Promise.resolve()
  },

  seedIfEmpty(name, records) {
    if (readCollection(name).length === 0) {
      writeCollection(name, records)
    }
  },
}
