import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, updateProfile } from 'firebase/auth'
import {
  auth,
  createUserProfile,
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
} from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      setAuthError(null)
    })
    return unsubscribe
  }, [])

  const signup = async ({ email, password, displayName }) => {
    setAuthError(null)
    const cred = await registerWithEmail(email, password)
    if (cred.user) {
      await updateProfile(cred.user, { displayName })
      await createUserProfile(cred.user, displayName)
      setUser({ ...cred.user })
    }
    return cred.user
  }

  const login = async ({ email, password }) => {
    setAuthError(null)
    const cred = await loginWithEmail(email, password)
    setUser(cred.user)
    return cred.user
  }

  const loginGoogle = async () => {
    setAuthError(null)
    const cred = await loginWithGoogle()
    await createUserProfile(cred.user, cred.user.displayName || '')
    setUser(cred.user)
    return cred.user
  }

  const logout = async () => {
    setAuthError(null)
    await logoutUser()
    setUser(null)
  }

  const value = {
    user,
    loading,
    authError,
    setAuthError,
    signup,
    login,
    loginGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
