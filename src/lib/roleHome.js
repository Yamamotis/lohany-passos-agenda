export const HOME_BY_ROLE = {
  admin: '/admin',
  professional: '/minha-agenda',
  client: '/agendar',
}

export function getHomeRoute(user) {
  if (!user) return '/'
  return HOME_BY_ROLE[user.role] ?? '/'
}
