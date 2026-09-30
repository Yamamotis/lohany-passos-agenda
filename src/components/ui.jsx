// Peças de interface reutilizadas em várias telas (botão, campo de
// formulário, cartão, etiqueta de status), pra manter o visual consistente
// sem repetir classes do Tailwind em todo lugar. Todas já vêm com as
// variantes `dark:` para o modo escuro (padrão do app).

export function Button({ variant = 'primary', className = '', ...props }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-rose-600 text-white hover:bg-rose-700',
    secondary: 'bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900',
    ghost: 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

// Rótulo + campo, para formulários (ex: <Field label="Nome"><Input .../></Field>).
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      {...props}
    />
  )
}

export function Select(props) {
  return (
    <select
      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      {...props}
    />
  )
}

// Contêiner básico com borda e sombra leve, usado para agrupar conteúdo.
export function Card({ className = '', children }) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {children}
    </div>
  )
}

// Etiqueta colorida pra status (agendado, concluído, cancelado, etc).
export function Badge({ children, tone = 'stone' }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}
