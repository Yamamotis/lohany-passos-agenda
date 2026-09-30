// Fluxo de agendamento do cliente, em 3 passos (serviço → profissional →
// data/horário). Pensado para celular: cartões grandes em vez de menus
// suspensos, e uma barra fixa no rodapé com o resumo e o botão de ação,
// sempre visível mesmo com a tela cheia de opções.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { listActiveServices } from '../../lib/api/services'
import { listProfessionalsByService } from '../../lib/api/professionals'
import { createAppointment, getAvailableSlots } from '../../lib/api/appointments'
import { getSalonSettings } from '../../lib/api/settings'
import { parseLocalDate } from '../../lib/datetime'
import { Button, Card, Field } from '../../components/ui'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Preço 0 significa "a combinar" (ex: serviços orçados na hora) — não faz
// sentido mostrar "R$ 0" pro cliente nesse caso.
function formatPrice(price) {
  return price === 0 ? 'Valor a combinar' : `R$ ${price}`
}

const STEPS = [
  { number: 1, label: 'Serviço' },
  { number: 2, label: 'Profissional' },
  { number: 3, label: 'Data e horário' },
]

export default function BookAppointment() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [services, setServices] = useState([])
  const [professionals, setProfessionals] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [maxDate, setMaxDate] = useState(null)

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId])
  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === professionalId),
    [professionals, professionalId],
  )

  // Carrega os serviços ativos assim que a tela abre.
  useEffect(() => {
    listActiveServices().then(setServices)
    getSalonSettings().then((settings) => setMaxDate(addDaysISO(todayISO(), settings.maxAdvanceBookingDays)))
  }, [])

  // Ao escolher um serviço, busca só os profissionais que o realizam.
  useEffect(() => {
    if (!serviceId) {
      setProfessionals([])
      return
    }
    listProfessionalsByService(serviceId).then(setProfessionals)
  }, [serviceId])

  // Recalcula os horários livres sempre que profissional, serviço ou data mudam.
  useEffect(() => {
    setSelectedSlot(null)
    setSlots([])
    if (!selectedProfessional || !selectedService || !date) return

    getAvailableSlots({
      professionalId: selectedProfessional.id,
      serviceId: selectedService.id,
      date,
    }).then(setSlots)
  }, [selectedProfessional, selectedService, date])

  // Escolher um serviço já avança pro passo seguinte (menos toques no celular).
  function selectService(id) {
    setServiceId(id)
    setProfessionalId('')
    setStep(2)
  }

  function selectProfessional(id) {
    setProfessionalId(id)
    setStep(3)
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleConfirm() {
    if (!selectedSlot || !selectedService || !selectedProfessional) return
    setStatus('saving')
    setError('')
    try {
      await createAppointment({
        clientUserId: user.id,
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        date,
        startTime: selectedSlot.startTime,
      })
      showToast('Agendamento confirmado!')
      navigate('/meus-agendamentos')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
      {/* Indicador de progresso dos 3 passos. */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s) => (
          <div key={s.number} className="flex flex-1 items-center gap-2 last:flex-none">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step >= s.number ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500'
              }`}
            >
              {s.number}
            </div>
            <span
              className={`hidden text-xs sm:inline ${
                step >= s.number ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-600'
              }`}
            >
              {s.label}
            </span>
            {s.number < STEPS.length && <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />}
          </div>
        ))}
      </div>

      {/* Passo 1: escolha do serviço (cartão inteiro é clicável). */}
      {step === 1 && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Escolha o serviço</h1>
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => selectService(service.id)}
              className="block w-full text-left"
            >
              <Card
                className={`flex items-center justify-between transition ${
                  serviceId === service.id ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{service.name}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{service.durationMinutes}min</p>
                </div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{formatPrice(service.price)}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Passo 2: escolha do profissional, já filtrado pelo serviço. */}
      {step === 2 && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Escolha o profissional</h1>
          {professionals.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Nenhum profissional disponível para este serviço.
            </p>
          ) : (
            professionals.map((professional) => (
              <button
                key={professional.id}
                type="button"
                onClick={() => selectProfessional(professional.id)}
                className="block w-full text-left"
              >
                <Card
                  className={`transition ${
                    professionalId === professional.id ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                >
                  <p className="font-medium text-stone-900 dark:text-stone-100">{professional.name}</p>
                  {professional.bio && (
                    <p className="text-sm text-stone-500 dark:text-stone-400">{professional.bio}</p>
                  )}
                </Card>
              </button>
            ))
          )}
        </div>
      )}

      {/* Passo 3: escolha de data e horário, com base nos slots calculados. */}
      {step === 3 && (
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Escolha data e horário</h1>

          <Field label="Data">
            <input
              type="date"
              min={todayISO()}
              max={maxDate ?? undefined}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </Field>

          <Field label="Horário">
            {slots.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Nenhum horário disponível neste dia.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-2 py-3 text-sm ${
                      selectedSlot?.startTime === slot.startTime
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-stone-300 text-stone-700 hover:border-rose-400 dark:border-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}

      {/* Barra fixa no rodapé: some no passo 1 (ainda não há nada pra resumir). */}
      {step > 1 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-900/95 sm:bottom-0">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 text-sm text-stone-600 dark:text-stone-300">
              {selectedService && (
                <p className="truncate">
                  {selectedService.name}
                  {selectedProfessional && ` · ${selectedProfessional.name}`}
                  {step === 3 && selectedSlot && (
                    <>
                      {' · '}
                      <span className="capitalize">{format(parseLocalDate(date), 'dd/MM', { locale: ptBR })}</span> às{' '}
                      {selectedSlot.startTime}
                    </>
                  )}
                </p>
              )}
              {selectedService && (
                <p className="text-xs text-stone-400 dark:text-stone-500">{formatPrice(selectedService.price)}</p>
              )}
            </div>
            <Button variant="secondary" onClick={goBack}>
              Voltar
            </Button>
            {step === 3 && (
              <Button onClick={handleConfirm} disabled={!selectedSlot || status === 'saving'}>
                {status === 'saving' ? 'Confirmando...' : 'Confirmar'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
