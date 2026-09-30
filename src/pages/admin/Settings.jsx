// Configurações gerais do salão: telefone de WhatsApp e as regras de
// antecedência (mínima para cancelar, máxima para agendar com antecedência)
// que o próprio banco aplica.
import { useEffect, useState } from 'react'
import { getSalonSettings, updateSalonSettings } from '../../lib/api/settings'
import { useToast } from '../../context/ToastContext'
import { Button, Card, Field, Input } from '../../components/ui'

export default function Settings() {
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [cancellationCutoffMinutes, setCancellationCutoffMinutes] = useState('')
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSalonSettings().then((settings) => {
      setPhone(settings.phone)
      setCancellationCutoffMinutes(String(settings.cancellationCutoffMinutes))
      setMaxAdvanceBookingDays(String(settings.maxAdvanceBookingDays))
    })
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateSalonSettings({
        phone,
        cancellationCutoffMinutes: Number(cancellationCutoffMinutes),
        maxAdvanceBookingDays: Number(maxAdvanceBookingDays),
      })
      showToast('Configurações salvas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900 dark:text-stone-100">Configurações</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="WhatsApp do salão">
            <Input type="tel" placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Use o número com código do país e DDD, só números (ex: 5511999999999). É esse número que os clientes
              vão acionar pelo botão "Falar no WhatsApp".
            </p>
          </Field>
          <Field label="Antecedência mínima para cancelar (minutos)">
            <Input
              type="number"
              min="0"
              value={cancellationCutoffMinutes}
              onChange={(e) => setCancellationCutoffMinutes(e.target.value)}
              required
            />
          </Field>
          <Field label="Antecedência máxima para agendar (dias)">
            <Input
              type="number"
              min="1"
              value={maxAdvanceBookingDays}
              onChange={(e) => setMaxAdvanceBookingDays(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
