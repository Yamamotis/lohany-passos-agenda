// Contexto global de autenticação: guarda o usuário logado e expõe as
// ações (login, cadastro, logout, editar perfil) pra qualquer componente.
import { createContext, useContext, useEffect, useState } from 'react'
import * as authApi from '../lib/api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true enquanto verifica se já existe sessão salva

  // Ao montar o app, tenta recuperar o usuário da sessão salva no navegador.
  useEffect(() => {
    authApi.getCurrentUser().then((current) => {
      setUser(current)
      setLoading(false)
    })
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

  function logout() {
    authApi.logout()
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
