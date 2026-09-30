import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-medium text-rose-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Página não encontrada</h1>
      <p className="mt-2 text-stone-500">O endereço acessado não existe ou foi movido.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Voltar para o início</Button>
      </Link>
    </div>
  )
}
