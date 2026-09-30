import { useEffect, useState } from 'react'
import { getSalonSettings, updateSalonSettings } from '../../lib/api/settings'
import { useToast } from '../../context/ToastContext'
import { Button, Card, Field, Input } from '../../components/ui'

export default function Settings() {
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSalonSettings().then((settings) => setPhone(settings.phone ?? ''))
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateSalonSettings({ phone })
      showToast('Configurações salvas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Configurações</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="WhatsApp do salão">
            <Input
              type="tel"
              placeholder="5511999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="mt-1 text-xs text-stone-500">
              Use o número com código do país e DDD, só números (ex: 5511999999999). É esse número que os
              clientes vão acionar pelo botão "Falar no WhatsApp".
            </p>
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
