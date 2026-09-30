// Bloqueia o acesso a uma rota caso o usuário não esteja logado, ou caso
// esteja logado com um papel diferente do permitido para aquela tela.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) return null // aguarda descobrir se há sessão salva, sem piscar tela de login
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return children
}
