// Cliente único do Supabase, usado por toda a camada src/lib/api/*.js.
// As credenciais vêm de variáveis de ambiente (ver .env.example) — a
// VITE_SUPABASE_ANON_KEY é pública por natureza (protegida pelas policies
// de RLS no banco, não por sigilo da chave).
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
