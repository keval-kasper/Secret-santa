import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { login, loginGoogle, authError, setAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)
    try {
      await login({ email, password })
      navigate(redirectTo)
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setAuthError(null)
    try {
      await loginGoogle()
      navigate(redirectTo)
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>Log in</h2>
      <p className="muted">Participants should use Google sign-in; admin can use email/password.</p>
      <div className="actions">
        <button className="btn" onClick={handleGoogle} disabled={googleLoading}>
          {googleLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {authError && <p className="error">{authError}</p>}
        <button className="btn ghost" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Log in with email (admin)'}
        </button>
      </form>
    </div>
  )
}

export default Login
