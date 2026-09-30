export function Button({ variant = 'primary', className = '', ...props }) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-rose-600 text-white hover:bg-rose-700',
    secondary: 'bg-stone-200 text-stone-800 hover:bg-stone-300',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    ghost: 'text-rose-600 hover:bg-rose-50',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
      {...props}
    />
  )
}

export function Select(props) {
  return (
    <select
      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
      {...props}
    />
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function Badge({ children, tone = 'stone' }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}
