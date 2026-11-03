import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  invite_code: string | null
  wallet_balance: number
  reward_points: number
  created_at: string
}

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'auth' | 'team' | 'profile'>('home')
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Auth Inputs
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Status Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Download APK Handler matching tirangapaypanel.in
  const handleDownloadAPK = () => {
    setIsDownloading(true)
    const apkLink = 'https://apk.tirangapayofficial.workers.dev/'
    const a = document.createElement('a')
    a.href = apkLink
    a.download = 'Tiranga_Pay.apk'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => {
      setIsDownloading(false)
    }, 2000)
  }

  // Load profile from Supabase
  const loadProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data)
      } else {
        const fallback = {
          id: userId,
          email: userEmail || '',
          wallet_balance: 0.00,
          reward_points: 100,
          created_at: new Date().toISOString()
        }
        await supabase.from('profiles').upsert(fallback)
        setProfile(fallback as UserProfile)
      }
    } catch (err) {
      console.error('Failed to sync profile from Supabase:', err)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        loadProfile(currentUser.id, currentUser.email)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        loadProfile(currentUser.id, currentUser.email)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id)
        await loadProfile(data.user.id, data.user.email)
        setSuccessMsg('Logged in successfully!')
        setCurrentView('profile')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

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
      const cleanPhone = phone.trim()
      const cleanInvite = inviteCode.trim().toUpperCase()

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            phone: cleanPhone || null,
            invite_code: cleanInvite || null,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const payload = {
          id: data.user.id,
          email: data.user.email,
          phone: cleanPhone || null,
          invite_code: cleanInvite || null,
          wallet_balance: 0.00,
          reward_points: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        await supabase.from('profiles').upsert(payload)
        setUser(data.user)
        setProfile(payload as UserProfile)
        setSuccessMsg('Account registered & saved in Supabase!')
        setCurrentView('profile')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
    setCurrentView('home')
  }

  return (
    <>
      <div className="bg-shape-1"></div>
      <div className="bg-shape-2"></div>
      <div className="bg-shape-3"></div>

      <div className="app-shell">
        {/* Sticky Header */}
        <header className="header-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
            <div className="logo-badge">
              <div className="logo-flag-icon">
                <div className="flag-orange"></div>
                <div className="flag-white">
                  <div className="flag-wheel"></div>
                </div>
                <div className="flag-green"></div>
              </div>
            </div>
            <div className="header-title-box">
              <span className="header-app-name">Tiranga Pay</span>
              <span className="header-tagline">Earn Money Online</span>
            </div>
          </div>

          <div className="header-btn-group">
            {user ? (
              <button
                type="button"
                className="header-auth-btn"
                onClick={() => setCurrentView('profile')}
              >
                <i className="fas fa-user-circle" style={{ marginRight: '5px' }}></i> Account
              </button>
            ) : (
              <button
                type="button"
                className="header-auth-btn"
                onClick={() => {
                  setAuthTab('login')
                  setCurrentView('auth')
                }}
              >
                Log In
              </button>
            )}
            <button
              type="button"
              className="download-btn pulse-glow"
              onClick={handleDownloadAPK}
            >
              {isDownloading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Wait
                </>
              ) : (
                <>
                  <i className="fas fa-download" style={{ marginRight: '5px' }}></i> Download
                </>
              )}
            </button>
          </div>
        </header>

        {/* View Routing */}
        {currentView === 'home' && (
          <main style={{ padding: '36px 20px 20px', textAlign: 'center' }}>
            {/* Hero Text */}
            <div style={{ marginBottom: '28px' }}>
              <h2 className="hero-title">
                TO GET RUPEE <br />
                <span className="hero-subtitle">BY EASY TASK</span>
              </h2>
              <p className="hero-desc">
                Complete simple daily tasks, refer friends, and withdraw your earnings instantly.
              </p>
            </div>

            {/* 3D Illustration Graphic matching tirangapaypanel.in */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px', height: '290px', margin: '0 auto 20px' }}>
              {/* Floating Coins */}
              <div className="coin float-fast" style={{ width: '38px', height: '38px', top: '24px', left: '16px', zIndex: 20 }}></div>
              <div className="coin float-slow" style={{ width: '52px', height: '52px', top: '48px', right: '4px', zIndex: 20, animationDelay: '0.5s' }}></div>
              <div className="coin float-fast" style={{ width: '30px', height: '30px', bottom: '32px', left: '32px', zIndex: 30, animationDelay: '1s' }}></div>
              <div className="coin float-slow" style={{ width: '44px', height: '44px', bottom: '48px', right: '28px', zIndex: 10, animationDelay: '1.5s' }}></div>

              {/* Envelope / 3D Folder Element */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="float-slow">
                <div style={{ width: '250px', height: '220px', position: 'relative' }}>
                  {/* Back flap */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    height: '150px',
                    background: 'linear-gradient(135deg, #FF9933, #e67300)',
                    borderRadius: '20px',
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4)'
                  }}></div>

                  {/* Document / Chart */}
                  <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '190px',
                    height: '190px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 15px 35px rgba(0, 0, 128, 0.15)',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    zIndex: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#000080',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                      }}>
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                        <div style={{ width: '60%', height: '8px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    {/* Bar charts */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '80px', marginTop: 'auto', justifyContent: 'center' }}>
                      <div style={{ width: '30%', height: '45%', background: 'linear-gradient(to top, #FF9933, #ffb866)', borderRadius: '6px 6px 0 0' }}></div>
                      <div style={{ width: '30%', height: '65%', background: 'linear-gradient(to top, #cbd5e1, #e2e8f0)', borderRadius: '6px 6px 0 0' }}></div>
                      <div style={{ width: '30%', height: '90%', background: 'linear-gradient(to top, #138808, #22c55e)', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                        <i className="fas fa-caret-up" style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', color: '#16a34a', fontSize: '18px' }}></i>
                      </div>
                    </div>
                  </div>

                  {/* Front Flap */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    height: '110px',
                    background: 'linear-gradient(135deg, #e67300, #FF9933)',
                    borderRadius: '50px 50px 20px 20px',
                    boxShadow: '0 -8px 20px rgba(0,0,0,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                  }}>
                    <div style={{ background: 'rgba(255,255,255,0.3)', width: '80px', height: '6px', borderRadius: '9999px', marginTop: '30px' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Big Action Download Button */}
            <button
              type="button"
              className="download-btn download-btn-hero pulse-glow"
              onClick={handleDownloadAPK}
            >
              {isDownloading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                  Downloading APK...
                </>
              ) : (
                <>
                  <i className="fas fa-download" style={{ marginRight: '10px' }}></i>
                  Download Now
                </>
              )}
            </button>

            {/* Or Online Auth Link */}
            <div style={{ marginBottom: '28px' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup')
                  setCurrentView('auth')
                }}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  color: '#000080',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,128,0.06)'
                }}
              >
                <i className="fas fa-user-plus" style={{ marginRight: '6px', color: '#FF9933' }}></i>
                Don't have APK? Register Online
              </button>
            </div>

            {/* Features 3-Card Grid */}
            <div className="glass-card">
              <div className="glass-badge">— Earn Money Online —</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setCurrentView('team')}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    margin: '0 auto 8px',
                    background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                    border: '1px solid #fed7aa',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF9933',
                    fontSize: '22px',
                    boxShadow: '0 4px 12px rgba(255, 153, 51, 0.15)'
                  }}>
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#FF9933', textTransform: 'uppercase' }}>Easy Task</h4>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>To get Rupee</p>
                </div>

                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setCurrentView(user ? 'profile' : 'auth')}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    margin: '0 auto 8px',
                    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                    border: '1px solid #bbf7d0',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#138808',
                    fontSize: '22px',
                    boxShadow: '0 4px 12px rgba(19, 136, 8, 0.15)'
                  }}>
                    <i className="fas fa-bolt"></i>
                  </div>
                  <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#138808', textTransform: 'uppercase' }}>Super-Fast</h4>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Withdrawal</p>
                </div>

                <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setCurrentView('team')}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    margin: '0 auto 8px',
                    background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                    border: '1px solid #bfdbfe',
                    borderRadius: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000080',
                    fontSize: '22px',
                    boxShadow: '0 4px 12px rgba(0, 0, 128, 0.15)'
                  }}>
                    <i className="fas fa-users"></i>
                  </div>
                  <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#000080', textTransform: 'uppercase' }}>Refer</h4>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>And Earn</p>
                </div>
              </div>
            </div>

            {/* Why Choose Us */}
            <div className="navy-card">
              <div className="glass-badge" style={{ color: '#000080' }}>Why choose our platform?</div>
              <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(19, 136, 8, 0.2)',
                    border: '1px solid rgba(19, 136, 8, 0.5)',
                    color: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-shield-alt" style={{ fontSize: '14px' }}></i>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', marginBottom: '3px' }}>Trusted Protection</h3>
                    <p style={{ fontSize: '12px', color: '#bfdbfe', lineHeight: '1.4' }}>Backed by industry-recognized partners, delivering a stable and reliable earning environment.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(255, 153, 51, 0.2)',
                    border: '1px solid rgba(255, 153, 51, 0.5)',
                    color: '#FF9933',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-rocket" style={{ fontSize: '14px' }}></i>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', marginBottom: '3px' }}>Quick experience</h3>
                    <p style={{ fontSize: '12px', color: '#bfdbfe', lineHeight: '1.4' }}>Smooth task flow, easy money earning without complex procedures.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.5)',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className="fas fa-boxes" style={{ fontSize: '14px' }}></i>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', marginBottom: '3px' }}>Massive orders</h3>
                    <p style={{ fontSize: '12px', color: '#bfdbfe', lineHeight: '1.4' }}>Diverse tasks, suitable for both part-time and full-time work! Start instantly.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '22px', borderTop: '1px solid rgba(59, 130, 246, 0.3)', paddingTop: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 900, color: '#facc15' }}>Join us and earn money efficiently.</p>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.85 }}>Safer, faster, more reliable!</p>
              </div>
            </div>

            {/* Team Profit Ratio */}
            <div className="glass-card">
              <div className="glass-badge" style={{ background: 'linear-gradient(to right, #000080, #000040)', color: '#ffffff' }}>About the Team</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '18px' }}>
                {/* Level 1 */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #fed7aa', overflow: 'hidden', boxShadow: '0 4px 14px rgba(255, 153, 51, 0.1)' }}>
                  <div style={{ padding: '8px 4px', background: '#fff7ed', borderBottom: '1px solid #ffedd5' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#FF9933', textTransform: 'uppercase' }}>Level 1</h4>
                  </div>
                  <div style={{ padding: '14px 0' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#FF9933' }}>30%</span>
                  </div>
                  <div style={{ background: '#FF9933', padding: '6px 0' }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profit Ratio</p>
                  </div>
                </div>

                {/* Level 2 */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ padding: '8px 4px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>Level 2</h4>
                  </div>
                  <div style={{ padding: '14px 0' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#334155' }}>20%</span>
                  </div>
                  <div style={{ background: '#64748b', padding: '6px 0' }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profit Ratio</p>
                  </div>
                </div>

                {/* Level 3 */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #bbf7d0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(19, 136, 8, 0.1)' }}>
                  <div style={{ padding: '8px 4px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 900, color: '#138808', textTransform: 'uppercase' }}>Level 3</h4>
                  </div>
                  <div style={{ padding: '14px 0' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#138808' }}>10%</span>
                  </div>
                  <div style={{ background: '#138808', padding: '6px 0' }}>
                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profit Ratio</p>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '16px' }}>
              Tiranga Pay Official &copy; 2026
            </p>
          </main>
        )}

        {/* Auth View (Login & Register) */}
        {currentView === 'auth' && (
          <div className="auth-panel">
            <div className="glass-card" style={{ marginTop: '20px' }}>
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setErrorMsg(null)
                    setSuccessMsg(null)
                    setAuthTab('login')
                  }}
                >
                  <i className="fas fa-sign-in-alt" style={{ marginRight: '6px' }}></i> Log In
                </button>
                <button
                  type="button"
                  className={`auth-tab-btn ${authTab === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setErrorMsg(null)
                    setSuccessMsg(null)
                    setAuthTab('signup')
                  }}
                >
                  <i className="fas fa-user-plus" style={{ marginRight: '6px' }}></i> Register
                </button>
              </div>

              {errorMsg && (
                <div className="status-alert alert-fail">
                  <i className="fas fa-exclamation-circle" style={{ fontSize: '16px' }}></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="status-alert alert-pass">
                  <i className="fas fa-check-circle" style={{ fontSize: '16px' }}></i>
                  <span>{successMsg}</span>
                </div>
              )}

              {authTab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Email or Username</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-envelope"></i></span>
                      <input
                        type="email"
                        className="custom-input"
                        placeholder="Enter registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-lock"></i></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="custom-input"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '18px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: '#FF9933' }}
                      />
                      Remember me
                    </label>
                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault()
                        alert('Password reset link will be sent to your email.')
                      }}
                      style={{ color: '#FF9933', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Forgot password?
                    </a>
                  </div>

                  <button type="submit" className="auth-action-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt"></i>
                        <span>Log In</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignup}>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-envelope"></i></span>
                      <input
                        type="email"
                        className="custom-input"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number (Saved in Supabase)</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-phone-alt"></i></span>
                      <input
                        type="tel"
                        className="custom-input"
                        placeholder="+91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-lock"></i></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="custom-input"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-shield-alt"></i></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="custom-input"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invitation Code (Optional)</label>
                    <div className="input-box">
                      <span className="input-box-icon"><i className="fas fa-ticket-alt"></i></span>
                      <input
                        type="text"
                        className="custom-input"
                        placeholder="Enter invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <button type="submit" className="auth-action-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Saving in Supabase...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-check"></i>
                        <span>Register Account</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Team Profit Details View */}
        {currentView === 'team' && (
          <div style={{ padding: '24px 20px' }}>
            <div className="glass-card" style={{ marginTop: '10px' }}>
              <div className="glass-badge" style={{ background: '#000080', color: '#ffffff' }}>Team Profit Structure</div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000080', marginTop: '10px', marginBottom: '8px' }}>
                Invite Friends & Earn Commission
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', marginBottom: '18px' }}>
                Every time your referred member completes a task, profit commission is credited instantly into your wallet.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#fff7ed', borderRadius: '14px', border: '1px solid #fed7aa' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#FF9933', fontSize: '14px' }}>Level 1 (Direct Friends)</h5>
                    <span style={{ fontSize: '11px', color: '#9a3412' }}>Directly registered with your code</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#FF9933' }}>30%</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#475569', fontSize: '14px' }}>Level 2 (Friends' Friends)</h5>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Invited by your Level 1 members</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#334155' }}>20%</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#138808', fontSize: '14px' }}>Level 3 (Community)</h5>
                    <span style={{ fontSize: '11px', color: '#166534' }}>Third-tier downline team</span>
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#138808' }}>10%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Member Profile & Wallet Dashboard */}
        {currentView === 'profile' && user && (
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div className="glass-card" style={{ marginTop: '10px' }}>
              <div style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #000080, #FF9933)',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                color: '#ffffff',
                fontWeight: 900,
                boxShadow: '0 8px 25px rgba(0, 0, 128, 0.25)'
              }}>
                {(user.email?.[0] || 'T').toUpperCase()}
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>{user.email}</h3>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: '#dcfce7',
                border: '1px solid #86efac',
                color: '#15803d',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                marginTop: '6px',
                marginBottom: '20px'
              }}>
                ● Supabase Synced Member
              </span>

              {/* Wallet Card */}
              <div style={{
                background: 'linear-gradient(135deg, #000080 0%, #000040 100%)',
                borderRadius: '18px',
                padding: '20px',
                color: '#ffffff',
                marginBottom: '18px',
                boxShadow: '0 10px 25px rgba(0, 0, 128, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Total Balance</span>
                    <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                      ₹{(profile?.wallet_balance ?? 0).toFixed(2)}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Reward Points</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                      {profile?.reward_points ?? 100} pts
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={() => alert('Deposit portal will open here.')}
                    style={{
                      background: 'linear-gradient(90deg, #FF9933, #ea580c)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i> Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Withdrawal request submitted.')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                      padding: '10px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fas fa-arrow-circle-up" style={{ marginRight: '6px' }}></i> Withdraw
                  </button>
                </div>
              </div>

              {/* Account Details Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px',
                textAlign: 'left',
                fontSize: '13px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Mobile:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{profile?.phone || 'Not provided'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Invite Code:</span>
                  <span style={{ fontWeight: 800, color: '#FF9933' }}>{profile?.invite_code || 'VIP100'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Member ID:</span>
                  <span style={{ fontWeight: 600, color: '#64748b', fontSize: '11px' }}>{user.id.slice(0, 16)}...</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-sign-out-alt" style={{ marginRight: '6px' }}></i> Log Out
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <button
            type="button"
            className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
          >
            <i className="fas fa-home"></i>
            <span>Home</span>
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={handleDownloadAPK}
          >
            <i className="fas fa-download"></i>
            <span>Download</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
            onClick={() => setCurrentView('team')}
          >
            <i className="fas fa-users"></i>
            <span>Team</span>
          </button>

          <button
            type="button"
            className={`nav-item ${currentView === 'auth' || currentView === 'profile' ? 'active' : ''}`}
            onClick={() => {
              if (user) {
                setCurrentView('profile')
              } else {
                setAuthTab('login')
                setCurrentView('auth')
              }
            }}
          >
            <i className="fas fa-user"></i>
            <span>{user ? 'Profile' : 'Account'}</span>
          </button>
        </nav>
      </div>
    </>
  )
}
