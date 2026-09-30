import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { listActiveServices } from '../../lib/api/services'
import { listProfessionalsByService } from '../../lib/api/professionals'
import { createAppointment, listAppointmentsByProfessional } from '../../lib/api/appointments'
import { getAvailableSlots } from '../../lib/slots'
import { parseLocalDate } from '../../lib/datetime'
import { Button, Card, Field } from '../../components/ui'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId])
  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === professionalId),
    [professionals, professionalId],
  )

  useEffect(() => {
    listActiveServices().then(setServices)
  }, [])

  useEffect(() => {
    if (!serviceId) {
      setProfessionals([])
      return
    }
    listProfessionalsByService(serviceId).then(setProfessionals)
  }, [serviceId])

  useEffect(() => {
    setSelectedSlot(null)
    setSlots([])
    if (!selectedProfessional || !selectedService || !date) return

    listAppointmentsByProfessional(selectedProfessional.id).then((existingAppointments) => {
      const available = getAvailableSlots({
        professional: selectedProfessional,
        durationMinutes: selectedService.durationMinutes,
        date,
        existingAppointments,
      })
      setSlots(available)
    })
  }, [selectedProfessional, selectedService, date])

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
        clientId: user.id,
        clientName: user.name,
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
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
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s) => (
          <div key={s.number} className="flex flex-1 items-center gap-2 last:flex-none">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step >= s.number ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-500'
              }`}
            >
              {s.number}
            </div>
            <span className={`hidden text-xs sm:inline ${step >= s.number ? 'text-stone-900' : 'text-stone-400'}`}>
              {s.label}
            </span>
            {s.number < STEPS.length && <div className="h-px flex-1 bg-stone-200" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900">Escolha o serviço</h1>
          {services.map((service) => (
            <button key={service.id} type="button" onClick={() => selectService(service.id)} className="block w-full text-left">
              <Card
                className={`flex items-center justify-between transition ${
                  serviceId === service.id ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              >
                <div>
                  <p className="font-medium text-stone-900">{service.name}</p>
                  <p className="text-sm text-stone-500">{service.durationMinutes}min</p>
                </div>
                <p className="font-medium text-stone-900">R$ {service.price}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900">Escolha o profissional</h1>
          {professionals.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhum profissional disponível para este serviço.</p>
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
                  <p className="font-medium text-stone-900">{professional.name}</p>
                  {professional.bio && <p className="text-sm text-stone-500">{professional.bio}</p>}
                </Card>
              </button>
            ))
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h1 className="text-xl font-semibold text-stone-900">Escolha data e horário</h1>

          <Field label="Data">
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </Field>

          <Field label="Horário">
            {slots.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhum horário disponível neste dia.</p>
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
                        : 'border-stone-300 text-stone-700 hover:border-rose-400'
                    }`}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {step > 1 && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-stone-200 bg-white/95 backdrop-blur sm:bottom-0">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 text-sm text-stone-600">
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
              {selectedService && <p className="text-xs text-stone-400">R$ {selectedService.price}</p>}
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
