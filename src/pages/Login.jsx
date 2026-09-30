import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomeRoute } from '../lib/roleHome'
import { Button, Card, Field, Input } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const user = await login({ email, password })
      navigate(getHomeRoute(user))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card>
        <h1 className="mb-6 text-xl font-semibold text-stone-900">Entrar</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-stone-500">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-rose-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
        <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
          <p className="font-medium">Contas de teste:</p>
          <p>Admin: admin@salao.com / admin123</p>
          <p>Profissional (cabelo): ana@salao.com / 123456</p>
          <p>Profissional (tatuagem): camila@salao.com / 123456</p>
        </div>
      </Card>
    </div>
  )
}
