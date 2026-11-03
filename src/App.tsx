import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function App() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Status Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setInitialLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const resetForm = () => {
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleTabChange = (newTab: 'login' | 'signup') => {
    resetForm()
    setTab(newTab)
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    resetForm()

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setUser(data.user)
        setSuccessMsg('Login successful! Welcome back.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    resetForm()

    if (!email.trim() || !password) {
      setErrorMsg('Please provide your email and password.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            phone: phone.trim() || undefined,
            invite_code: inviteCode.trim() || undefined,
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.session) {
        setUser(data.session.user)
        setSuccessMsg('Account registered and logged in successfully!')
      } else if (data.user) {
        setSuccessMsg('Registration successful! Please check your email to confirm your account.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
    resetForm()
  }

  if (initialLoading) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Connecting to Tiranga...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-badge">
            <div className="brand-tricolor-strip">
              <span className="strip-orange"></span>
              <span className="strip-white"></span>
              <span className="strip-green"></span>
            </div>
            <span>OFFICIAL PORTAL</span>
          </div>
          <h1 className="brand-title">TIRANGA</h1>
          <p className="brand-subtitle">
            {user
              ? 'Account Dashboard & Overview'
              : tab === 'login'
              ? 'Sign in to access your secure account'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Logged In Dashboard View */}
        {user ? (
          <div className="profile-card">
            <div className="profile-avatar">
              {(user.email?.[0] || 'T').toUpperCase()}
            </div>
            <div className="profile-email">{user.email}</div>
            <span className="profile-badge">● Active Member</span>

            <div className="wallet-box">
              <div className="wallet-item">
                <span className="wallet-label">Available Balance</span>
                <span className="wallet-value">₹0.00</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '36px' }}></div>
              <div className="wallet-item">
                <span className="wallet-label">Reward Points</span>
                <span className="wallet-value">100 pts</span>
              </div>
            </div>

            <div className="dashboard-actions">
              <button className="action-btn" type="button" onClick={() => alert('Deposit portal')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Deposit
              </button>
              <button className="action-btn" type="button" onClick={() => alert('Withdrawal portal')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Withdraw
              </button>
            </div>

            <button
              className="signout-btn"
              onClick={handleSignOut}
              disabled={loading}
              type="button"
            >
              {loading ? 'Logging out...' : 'Log Out of Account'}
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tab-container">
              <button
                type="button"
                className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={`tab-btn ${tab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Register
              </button>
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <div className="alert alert-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Forms */}
            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email or Username</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="remember-label">
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me
                  </label>
                  <a
                    href="#forgot"
                    className="forgot-link"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('To reset password, enter your email and request password reset via Supabase.')
                    }}
                  >
                    Forgot password?
                  </a>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Log In</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Invitation / Referral Code (Optional)</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Enter invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </form>
            )}

            <div className="terms-text">
              By continuing, you agree to Tiranga's{' '}
              <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a> and{' '}
              <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

