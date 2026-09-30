// Monta um link "wa.me" para abrir uma conversa de WhatsApp já com uma
// mensagem pré-preenchida. Retorna null quando não há telefone cadastrado.
export function buildWhatsAppLink(phone, message = '') {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${query}`
}
