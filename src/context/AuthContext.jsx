// Contexto global de autenticação: guarda o usuário logado e expõe as
// ações (login, cadastro, logout, editar perfil) pra qualquer componente.
// Fica de olho nas mudanças de sessão do Supabase (token expirado, login em
// outra aba, etc.) via onAuthStateChange, além de resolver a sessão inicial.
import { createContext, useContext, useEffect, useState } from 'react'
import * as authApi from '../lib/api/auth'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true enquanto verifica se já existe sessão salva

  useEffect(() => {
    let active = true

    authApi.getCurrentUser().then((current) => {
      if (!active) return
      setUser(current)
      setLoading(false)
    })

    // Mantém o usuário sincronizado com a sessão real do Supabase (logout em
    // outra aba, token renovado, etc.), sem depender só das nossas próprias ações.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (!session) {
        setUser(null)
        return
      }
      authApi.getCurrentUser().then((current) => active && setUser(current))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(credentials) {
    const loggedUser = await authApi.login(credentials)
    setUser(loggedUser)
    return loggedUser
  }

  async function register(data) {
    const newUser = await authApi.register(data)
    setUser(newUser)
    return newUser
  }

  async function logout() {
    await authApi.logout()
    setUser(null)
  }

  // Atualiza os dados do usuário logado (nome, telefone) e reflete no estado.
  async function updateUser(patch) {
    const updated = await authApi.updateProfile(user.id, patch)
    setUser(updated)
    return updated
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook de acesso ao contexto — lança erro se usado fora do AuthProvider,
// pra facilitar detectar um esquecimento de wrap durante o desenvolvimento.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}
