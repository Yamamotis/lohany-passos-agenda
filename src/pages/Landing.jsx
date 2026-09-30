// Página pública inicial. Profissionais e admin nunca deveriam ver essa
// tela de "agendar" (ela é voltada pro cliente), então são redirecionados
// direto pra área deles caso caiam aqui.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomeRoute } from '../lib/roleHome'
import { getSalonSettings } from '../lib/api/settings'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { Button } from '../components/ui'

export default function Landing() {
  const { user } = useAuth()
  const [whatsappLink, setWhatsappLink] = useState(null)

  useEffect(() => {
    getSalonSettings().then((settings) =>
      setWhatsappLink(buildWhatsAppLink(settings.phone, 'Olá! Vim pelo site e gostaria de mais informações.')),
    )
  }, [])

  if (user && user.role !== 'client') {
    return <Navigate to={getHomeRoute(user)} replace />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl font-bold text-stone-900">Agende seu horário no salão</h1>
      <p className="mt-4 text-lg text-stone-600">
        Escolha o serviço, a profissional e o melhor horário para você, tudo em poucos cliques.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={user ? '/agendar' : '/cadastro'}>
          <Button className="px-6 py-3 text-base">Agendar horário</Button>
        </Link>
        {!user && (
          <Link to="/login">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Já sou cliente
            </Button>
          </Link>
        )}
        {whatsappLink && (
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Falar no WhatsApp
            </Button>
          </a>
        )}
      </div>
    </div>
  )
}
