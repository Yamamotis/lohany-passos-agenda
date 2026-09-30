// Cadastro de cliente. Profissionais e admin não se cadastram por aqui —
// suas contas já existem via dados de seed (ou seriam criadas pelo admin).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input } from '../components/ui'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register({ name, email, phone, password })
      navigate('/agendar')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card>
        <h1 className="mb-6 text-xl font-semibold text-stone-900 dark:text-stone-100">Criar conta</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input
              type="tel"
              placeholder="(11) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          Já tem conta?{' '}
          <Link to="/login" className="text-rose-600 hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  )
}
