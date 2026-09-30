// Navegação por abas fixada no rodapé, exibida só no celular e só para o
// cliente (a maioria dos usuários finais). Substitui o menu hambúrguer,
// que é menos prático de alcançar com o polegar em telas grandes de celular.
import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/agendar', label: 'Agendar', icon: '📅' },
  { to: '/meus-agendamentos', label: 'Agendamentos', icon: '🗓️' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-stone-200 bg-white sm:hidden">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              isActive ? 'text-rose-600' : 'text-stone-500'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
