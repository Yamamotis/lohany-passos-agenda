import { storage } from '../storage'

const SETTINGS_ID = 'salon'

export async function getSalonSettings() {
  const settings = await storage.getById('settings', SETTINGS_ID)
  return settings ?? { id: SETTINGS_ID, phone: '' }
}

export async function updateSalonSettings(patch) {
  const existing = await storage.getById('settings', SETTINGS_ID)
  if (existing) return storage.update('settings', SETTINGS_ID, patch)
  return storage.insert('settings', { id: SETTINGS_ID, phone: '', ...patch })
}
