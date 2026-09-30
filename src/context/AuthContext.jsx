import { createContext, useContext, useEffect, useState } from 'react'
import * as authApi from '../lib/api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  return context
}
