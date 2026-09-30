// Estrutura visual do app: navbar, área de conteúdo (com as rotas) e,
// quando for cliente, a navegação por abas no rodapé. Fica em um componente
// à parte porque precisa ler o usuário logado (useAuth), o que só é possível
// dentro do AuthProvider.
import { Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import ProtectedRoute from './ProtectedRoute'

import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Profile from '../pages/Profile'
import NotFound from '../pages/NotFound'
import BookAppointment from '../pages/client/BookAppointment'
import MyAppointments from '../pages/client/MyAppointments'
import MyAgenda from '../pages/professional/MyAgenda'
import Dashboard from '../pages/admin/Dashboard'
import Services from '../pages/admin/Services'
import Professionals from '../pages/admin/Professionals'
import Appointments from '../pages/admin/Appointments'
import SalonSettings from '../pages/admin/Settings'

export default function AppShell() {
  const { user } = useAuth()
  const showBottomNav = user?.role === 'client'

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      {/* Espaço reservado no rodapé no celular, pra conteúdo não ficar atrás das abas. */}
      <div className={showBottomNav ? 'pb-16 sm:pb-0' : ''}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />

          {/* Perfil é acessível a qualquer papel logado, sem restrição de role. */}
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Área do cliente */}
          <Route
            path="/agendar"
            element={
              <ProtectedRoute roles={['client']}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meus-agendamentos"
            element={
              <ProtectedRoute roles={['client']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />

          {/* Área do profissional */}
          <Route
            path="/minha-agenda"
            element={
              <ProtectedRoute roles={['professional']}>
                <MyAgenda />
              </ProtectedRoute>
            }
          />

          {/* Área do admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/servicos"
            element={
              <ProtectedRoute roles={['admin']}>
                <Services />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profissionais"
            element={
              <ProtectedRoute roles={['admin']}>
                <Professionals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/agendamentos"
            element={
              <ProtectedRoute roles={['admin']}>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/configuracoes"
            element={
              <ProtectedRoute roles={['admin']}>
                <SalonSettings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
