// Barra de navegação do topo. Os links mudam de acordo com o papel do
// usuário logado; no celular, o cliente usa a navegação por abas (BottomNav)
// em vez do menu hambúrguer, então ele é escondido aqui. O botão de tema
// fica sempre visível, em qualquer papel ou tamanho de tela.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomeRoute } from '../lib/roleHome'
import { Button } from './ui'
import ThemeToggle from './ThemeToggle'

const ROLE_LINKS = {
  client: [
    { to: '/agendar', label: 'Agendar' },
    { to: '/meus-agendamentos', label: 'Meus agendamentos' },
  ],
  professional: [{ to: '/minha-agenda', label: 'Minha agenda' }],
  admin: [
    { to: '/admin', label: 'Painel' },
    { to: '/admin/servicos', label: 'Serviços' },
    { to: '/admin/profissionais', label: 'Profissionais' },
    { to: '/admin/agendamentos', label: 'Agendamentos' },
    { to: '/admin/configuracoes', label: 'Configurações' },
  ],
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  function handleNavigate() {
    setMenuOpen(false)
  }

  const links = user ? ROLE_LINKS[user.role] ?? [] : []
  // O cliente já tem a barra de abas no rodapé (mobile), então não precisa do hambúrguer.
  const showMobileMenu = user?.role !== 'client'

  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* O logo leva para a "home" de cada papel (painel, agenda ou tela de agendar). */}
        <Link to={getHomeRoute(user)} className="text-lg font-semibold text-rose-600" onClick={handleNavigate}>
          Lohany Passos
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {showMobileMenu && (
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 dark:border-stone-700 sm:hidden"
              aria-label="Abrir menu"
            >
              <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
            </button>
          )}

          {/* Navegação para telas médias/grandes (sempre visível a partir do breakpoint sm). */}
          <nav className="hidden items-center gap-4 sm:flex">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-stone-600 hover:text-rose-600 dark:text-stone-300"
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-3 border-l border-stone-200 pl-4 dark:border-stone-700">
                <Link to="/perfil" className="text-sm text-stone-500 hover:text-rose-600 dark:text-stone-400">
                  {user.name}
                </Link>
                <Button variant="secondary" onClick={handleLogout}>
                  Sair
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-l border-stone-200 pl-4 dark:border-stone-700">
                <Link to="/login" className="text-sm text-stone-600 hover:text-rose-600 dark:text-stone-300">
                  Entrar
                </Link>
                <Link to="/cadastro">
                  <Button>Criar conta</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Menu suspenso do celular (só para quem não é cliente). */}
      {showMobileMenu && menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-stone-200 px-4 py-3 dark:border-stone-800 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={handleNavigate}
              className="rounded-lg px-2 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-3 dark:border-stone-800">
              <Link
                to="/perfil"
                onClick={handleNavigate}
                className="text-sm text-stone-500 hover:text-rose-600 dark:text-stone-400"
              >
                {user.name}
              </Link>
              <Button variant="secondary" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
              <Link
                to="/login"
                onClick={handleNavigate}
                className="text-sm text-stone-600 hover:text-rose-600 dark:text-stone-300"
              >
                Entrar
              </Link>
              <Link to="/cadastro" onClick={handleNavigate}>
                <Button>Criar conta</Button>
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  )
}
