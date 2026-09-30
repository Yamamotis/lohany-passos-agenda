// Tela de perfil, acessível a qualquer papel logado: editar nome/telefone,
// trocar senha e sair da conta (necessário pro cliente no celular, já que
// o menu hambúrguer com o logout não aparece pra ele — ver Navbar.jsx).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { changePassword } from '../lib/api/auth'
import { Button, Card, Field, Input } from '../components/ui'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setSavingProfile(true)
    try {
      await updateUser({ name, phone })
      showToast('Perfil atualizado.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não confere com a nova senha.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Senha alterada.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900 dark:text-stone-100">Meu perfil</h1>

      <Card className="mb-6">
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          {/* E-mail é o identificador de login, por isso não é editável aqui. */}
          <Field label="E-mail">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Button type="submit" disabled={savingProfile} className="w-full">
            {savingProfile ? 'Salvando...' : 'Salvar dados'}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-100">Trocar senha</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Field label="Senha atual">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Nova senha">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          <Field label="Confirmar nova senha">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          <Button type="submit" disabled={savingPassword} className="w-full">
            {savingPassword ? 'Salvando...' : 'Trocar senha'}
          </Button>
        </form>
      </Card>

      <Button variant="secondary" onClick={handleLogout} className="mt-6 w-full">
        Sair da conta
      </Button>
    </div>
  )
}
