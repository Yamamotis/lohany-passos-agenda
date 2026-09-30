// Configurações gerais do salão (hoje só o telefone/WhatsApp de contato).
// Guardadas como um único registro de id fixo ("salon").
import { storage } from '../storage'

const SETTINGS_ID = 'salon'

export async function getSalonSettings() {
  const settings = await storage.getById('settings', SETTINGS_ID)
  return settings ?? { id: SETTINGS_ID, phone: '' }
}

// Cria o registro na primeira vez; nas próximas, só atualiza.
export async function updateSalonSettings(patch) {
  const existing = await storage.getById('settings', SETTINGS_ID)
  if (existing) return storage.update('settings', SETTINGS_ID, patch)
  return storage.insert('settings', { id: SETTINGS_ID, phone: '', ...patch })
}
