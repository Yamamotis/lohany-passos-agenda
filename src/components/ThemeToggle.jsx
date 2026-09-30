// Botão que alterna entre modo escuro (padrão) e modo claro.
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-300 text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
    >
      <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
    </button>
  )
}
