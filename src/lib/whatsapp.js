export function buildWhatsAppLink(phone, message = '') {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${query}`
}
