// Define, para cada papel de usuário, qual é a tela "inicial" dele no
// sistema. Usado pelo login, pelo logo da navbar e pela página pública.
export const HOME_BY_ROLE = {
  admin: '/admin',
  professional: '/minha-agenda',
  client: '/agendar',
}

// Retorna a rota inicial adequada ao usuário logado (ou "/" se não há usuário).
export function getHomeRoute(user) {
  if (!user) return '/'
  return HOME_BY_ROLE[user.role] ?? '/'
}
