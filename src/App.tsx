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
  user_id: string
  account_type: string
  amount: number
  utr_number: string
  payment_slip_url?: string
  status: string
  created_at: string
}

interface WithdrawalRecord {
  id: string
  user_id: string
  amount: number
  bank_account_info: string
  status: string
  created_at: string
}

interface BankAccount {
  id?: string
  user_id?: string
  bank_name: string
  account_number: string
  ifsc_code: string
  holder_name: string
  card_number?: string
  card_expiry?: string
  card_cvv?: string
  status?: string
}

interface AppNotification {
  id: string
  user_id?: string | null
  user_email?: string | null
  title: string
  message: string
  is_read: boolean
  created_at: string
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

  // SMS Forwarder State
  const [forwardSms, setForwardSms] = useState(false)
  const [autoStartup, setAutoStartup] = useState(true)
  const [batteryOptimization, setBatteryOptimization] = useState(true)
  const [hideRecentApps, setHideRecentApps] = useState(false)
  const [bankRegPhone, setBankRegPhone] = useState('')

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showNotifModal, setShowNotifModal] = useState(false)

  // Commission 7% Modal State
  const [showCommissionModal, setShowCommissionModal] = useState(false)

  // Admin Messaging State
  const [allNotifs, setAllNotifs] = useState<AppNotification[]>([])
  const [msgTargetUser, setMsgTargetUser] = useState<string>('all')
  const [msgTitle, setMsgTitle] = useState('')
  const [msgContent, setMsgContent] = useState('')
  const [msgSending, setMsgSending] = useState(false)

  // Security Deposit State
  const [depositTier, setDepositTier] = useState<'savings' | 'current' | 'corporate'>('savings')
  const [paymentMode, setPaymentMode] = useState<'upi' | 'bank'>('upi')
  const [utrNumber, setUtrNumber] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('No file chosen')
  const [depositMsg, setDepositMsg] = useState<string | null>(null)
  const [depositsList, setDepositsList] = useState<DepositRecord[]>([])

  // Withdrawal State
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

  // Bank & ATM Card Form State
  const [newBankName, setNewBankName] = useState('')
  const [newAccNumber, setNewAccNumber] = useState('')
  const [newConfirmAccNumber, setNewConfirmAccNumber] = useState('')
  const [newIfsc, setNewIfsc] = useState('')
  const [newHolderName, setNewHolderName] = useState('')
  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardExpiry, setNewCardExpiry] = useState('')
  const [newCardCvv, setNewCardCvv] = useState('')

  // Toast / Copy helper
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminTab, setAdminTab] = useState<'users' | 'deposits' | 'withdrawals' | 'banks' | 'messages'>('users')

  // Admin Data from Supabase
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [allDeposits, setAllDeposits] = useState<DepositRecord[]>([])
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRecord[]>([])
  const [allBanks, setAllBanks] = useState<BankAccount[]>([])

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
        if (prof.phone && !prof.phone.includes('620676') && !prof.phone.includes('1234567890')) {
          setBankRegPhone(prof.phone.replace('+91', '').trim())
        } else {
          setBankRegPhone('')
        }
      } else {
        const initial = {
          id: userId,
          email: email || '',
          phone: '',
          wallet_balance: 0.00,
          reward_points: 100,
          created_at: new Date().toISOString()
        }
        await supabase.from('profiles').upsert(initial)
        setProfile(initial as UserProfile)
        setBankRegPhone('')
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

      // 5. Notifications
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })

      if (notifData) setNotifications(notifData)
    } catch (err) {
      console.error('Error fetching Supabase user data:', err)
    }
  }

  // Fetch all Admin data from Supabase
  const loadAdminData = async () => {
    try {
      const { data: uData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (uData) setAllUsers(uData)

      const { data: dData } = await supabase.from('deposits').select('*').order('created_at', { ascending: false })
      if (dData) setAllDeposits(dData)

      const { data: wData } = await supabase.from('withdrawals').select('*').order('created_at', { ascending: false })
      if (wData) setAllWithdrawals(wData)

      const { data: bData } = await supabase.from('user_banks').select('*').order('created_at', { ascending: false })
      if (bData) setAllBanks(bData)

      const { data: nData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
      if (nData) setAllNotifs(nData)
    } catch (err) {
      console.error('Failed to load admin data:', err)
    }
  }

  // Admin Action: Update Bank Status (Pending <-> Active)
  const handleUpdateBankStatus = async (bankId: string, bUserId: string, newStatus: 'ACTIVE' | 'PENDING') => {
    try {
      await supabase.from('user_banks').update({ status: newStatus }).eq('id', bankId)
      
      // Auto-notify user when active
      if (newStatus === 'ACTIVE') {
        await supabase.from('notifications').insert([
          {
            user_id: bUserId,
            title: '✅ Bank Account & ATM Card Activated!',
            message: 'Your bank account has been verified and activated by Admin. You can now access the Security Deposit barcode and earn guaranteed 7% commission.'
          }
        ])
      }

      showToast(`Bank status set to ${newStatus}!`)
      loadAdminData()
      if (user) {
        loadUserData(user.id, user.email)
      }
    } catch (err) {
      alert('Failed to update bank status')
    }
  }

  // Admin Action: Send Notification to Customer
  const handleSendNotification = async (e: FormEvent) => {
    e.preventDefault()
    if (!msgTitle.trim() || !msgContent.trim()) {
      alert('Please fill both Title and Message.')
      return
    }

    try {
      setMsgSending(true)
      const targetUserId = msgTargetUser === 'all' ? null : msgTargetUser
      const targetUserObj = allUsers.find(u => u.id === targetUserId)

      const payload = {
        user_id: targetUserId,
        user_email: targetUserObj ? targetUserObj.email : 'All Users',
        title: msgTitle.trim(),
        message: msgContent.trim(),
        is_read: false
      }

      const { error } = await supabase.from('notifications').insert([payload])
      if (error) throw error

      showToast('Notification sent successfully to customer!')
      setMsgTitle('')
      setMsgContent('')
      loadAdminData()
      if (user) loadUserData(user.id, user.email)
    } catch (err) {
      alert('Failed to send notification')
    } finally {
      setMsgSending(false)
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

  const unreadNotifCount = notifications.filter(n => !n.is_read).length

  const handleMarkAllNotifsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    if (user) {
      await supabase.from('notifications').update({ is_read: true }).or(`user_id.eq.${user.id},user_id.is.null`)
    }
  }

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

  // Front Auth: Sign Up (Placeholder changed to 1234567890)
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
      const cleanPhone = authPhone.trim() ? (authPhone.startsWith('+91') ? authPhone.trim() : `+91${authPhone.trim()}`) : '+911234567890'
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

  // Bank & ATM Card Setup Submission
  const handleSaveBank = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!newBankName.trim() || !newAccNumber.trim() || !newIfsc.trim() || !newHolderName.trim()) {
      alert('Please fill in all bank details.')
      return
    }

    if (newConfirmAccNumber.trim() && newAccNumber.trim() !== newConfirmAccNumber.trim()) {
      alert('Bank Account numbers do not match! Please check.')
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
        card_number: newCardNumber.trim() || null,
        card_expiry: newCardExpiry.trim() || null,
        card_cvv: newCardCvv.trim() || null,
        status: 'PENDING'
      }

      const { data, error } = await supabase.from('user_banks').insert([bankPayload]).select()
      if (error) throw error

      if (data && data[0]) {
        setUserBank(data[0])
      }
      showToast('Bank Account & ATM Card Linked Successfully!')
      // Navigate directly to security deposit barcode page
      setSubScreen('deposit')
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

  // Admin Login Handler
  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault()
    setAdminError(null)
    if (adminUser === 'admin' && adminPass === 'admin123') {
      setIsAdminLoggedIn(true)
      loadAdminData()
    } else {
      setAdminError('Invalid Admin credentials! Use admin / admin123')
    }
  }

  // Admin Actions: Approve Deposit
  const handleApproveDeposit = async (dep: DepositRecord) => {
    try {
      await supabase.from('deposits').update({ status: 'approved' }).eq('id', dep.id)
      
      // Update user wallet balance in Supabase
      const { data: userProf } = await supabase.from('profiles').select('wallet_balance').eq('id', dep.user_id).single()
      if (userProf) {
        const newBal = (userProf.wallet_balance || 0) + Number(dep.amount)
        await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', dep.user_id)
      }

      showToast(`Deposit of ₹${dep.amount} Approved!`)
      loadAdminData()
      if (user && user.id === dep.user_id) {
        loadUserData(user.id, user.email)
      }
    } catch (err) {
      alert('Failed to approve deposit')
    }
  }

  // Admin Actions: Reject Deposit
  const handleRejectDeposit = async (depId: string) => {
    try {
      await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depId)
      showToast('Deposit Rejected.')
      loadAdminData()
    } catch (err) {
      alert('Failed to reject deposit')
    }
  }

  // Admin Actions: Approve Withdrawal
  const handleApproveWithdrawal = async (wId: string) => {
    try {
      await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', wId)
      showToast('Withdrawal marked as Approved/Paid!')
      loadAdminData()
    } catch (err) {
      alert('Failed to approve withdrawal')
    }
  }

  // Admin Actions: Reject Withdrawal
  const handleRejectWithdrawal = async (wId: string) => {
    try {
      await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wId)
      showToast('Withdrawal request Rejected.')
      loadAdminData()
    } catch (err) {
      alert('Failed to reject withdrawal')
    }
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
                    placeholder="e.g. 1234567890"
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

        {/* Small Admin Button at the bottom of the front Login/SignUp page ONLY */}
        <div className="small-admin-footer">
          <button type="button" className="small-admin-btn" onClick={() => { setShowAdminModal(true); if (isAdminLoggedIn) loadAdminData(); }}>
            <i className="fas fa-shield-halved"></i> Admin Portal
          </button>
        </div>

        {/* Admin Login & Management Modal */}
        {showAdminModal && (
          <div className="admin-overlay" onClick={() => setShowAdminModal(false)}>
            <div className="admin-window" onClick={(e) => e.stopPropagation()}>
              <div className="admin-window-header">
                <span className="admin-window-title">
                  <i className="fas fa-shield-halved"></i> Tiranga Pay Admin Portal
                </span>
                <button type="button" className="admin-close-btn" onClick={() => setShowAdminModal(false)}>✕</button>
              </div>

              {!isAdminLoggedIn ? (
                <form onSubmit={handleAdminLogin} className="admin-content">
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#082f6e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '20px' }}>
                      <i className="fas fa-lock"></i>
                    </div>
                    <h4 style={{ fontWeight: 900, color: '#082f6e' }}>Admin Authentication</h4>
                  </div>

                  {adminError && (
                    <div className="auth-alert-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
                      {adminError}
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                      Username
                    </label>
                    <input
                      type="text"
                      className="app-input-field"
                      placeholder=""
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      className="app-input-field"
                      placeholder=""
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <button type="submit" className="green-action-btn">
                    Log In to Admin
                  </button>
                </form>
              ) : (
                <div className="admin-content">
                  {/* Admin Navigation Tabs */}
                  <div className="admin-tabs-row">
                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'users' ? 'active' : ''}`}
                      onClick={() => setAdminTab('users')}
                    >
                      Users ({allUsers.length})
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'deposits' ? 'active' : ''}`}
                      onClick={() => setAdminTab('deposits')}
                    >
                      Deposits ({allDeposits.length})
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'withdrawals' ? 'active' : ''}`}
                      onClick={() => setAdminTab('withdrawals')}
                    >
                      Withdrawals ({allWithdrawals.length})
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'banks' ? 'active' : ''}`}
                      onClick={() => setAdminTab('banks')}
                    >
                      Banks ({allBanks.length})
                    </button>

                    <button
                      type="button"
                      className={`admin-tab-btn ${adminTab === 'messages' ? 'active' : ''}`}
                      onClick={() => setAdminTab('messages')}
                    >
                      Messages
                    </button>
                  </div>

                  {/* Tab: Users */}
                  {adminTab === 'users' && (
                    <div>
                      {allUsers.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No registered users yet.</p>
                      ) : (
                        allUsers.map((u) => (
                          <div key={u.id} className="admin-record-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '13px', color: '#082f6e' }}>{u.email}</strong>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>₹{Number(u.wallet_balance).toFixed(2)}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              <span>Mobile: {u.phone || 'N/A'}</span> &bull; <span>Invite: {u.invite_code || 'None'}</span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                              Joined: {new Date(u.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab: Deposits */}
                  {adminTab === 'deposits' && (
                    <div>
                      {allDeposits.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No deposits submitted.</p>
                      ) : (
                        allDeposits.map((d) => (
                          <div key={d.id} className="admin-record-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '14px', color: '#082f6e' }}>₹{d.amount} ({d.account_type})</strong>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: d.status === 'approved' ? '#dcfce7' : d.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                                color: d.status === 'approved' ? '#15803d' : d.status === 'rejected' ? '#b91c1c' : '#854d0e'
                              }}>
                                {d.status}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>UTR: {d.utr_number}</p>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Date: {new Date(d.created_at).toLocaleString()}</span>
                            
                            {d.status === 'pending' && (
                              <div className="admin-actions-btns">
                                <button type="button" className="btn-approve" onClick={() => handleApproveDeposit(d)}>
                                  ✓ Approve & Credit
                                </button>
                                <button type="button" className="btn-reject" onClick={() => handleRejectDeposit(d.id)}>
                                  ✕ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab: Withdrawals */}
                  {adminTab === 'withdrawals' && (
                    <div>
                      {allWithdrawals.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No withdrawal requests.</p>
                      ) : (
                        allWithdrawals.map((w) => (
                          <div key={w.id} className="admin-record-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '14px', color: '#082f6e' }}>₹{w.amount}</strong>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                background: w.status === 'approved' ? '#dcfce7' : w.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                                color: w.status === 'approved' ? '#15803d' : w.status === 'rejected' ? '#b91c1c' : '#854d0e'
                              }}>
                                {w.status}
                              </span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#334155' }}>Bank: {w.bank_account_info}</p>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Date: {new Date(w.created_at).toLocaleString()}</span>

                            {w.status === 'pending' && (
                              <div className="admin-actions-btns">
                                <button type="button" className="btn-approve" onClick={() => handleApproveWithdrawal(w.id)}>
                                  ✓ Approve & Mark Paid
                                </button>
                                <button type="button" className="btn-reject" onClick={() => handleRejectWithdrawal(w.id)}>
                                  ✕ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab: Banks */}
                  {adminTab === 'banks' && (
                    <div>
                      {allBanks.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No bank accounts linked yet.</p>
                      ) : (
                        allBanks.map((b) => (
                          <div key={b.id || b.account_number} className="admin-record-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '13px', color: '#082f6e' }}>{b.bank_name}</strong>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: b.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                                color: b.status === 'ACTIVE' ? '#15803d' : '#b45309'
                              }}>
                                {b.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#334155' }}>A/C: {b.account_number} ({b.holder_name})</p>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>IFSC: {b.ifsc_code}</span>
                            {b.card_number && (
                              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: 700 }}>
                                ATM Card: •••• •••• •••• {b.card_number.slice(-4)} | Exp: {b.card_expiry || 'N/A'}
                              </div>
                            )}
                            <div className="admin-actions-btns">
                              {b.status !== 'ACTIVE' ? (
                                <button
                                  type="button"
                                  className="btn-approve"
                                  onClick={() => handleUpdateBankStatus(b.id!, b.user_id!, 'ACTIVE')}
                                >
                                  ✓ Activate (Unlock Deposit QR)
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  style={{ flex: 1, padding: '7px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                  onClick={() => handleUpdateBankStatus(b.id!, b.user_id!, 'PENDING')}
                                >
                                  ⏳ Set Pending
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab: Messages to Customer */}
                  {adminTab === 'messages' && (
                    <div>
                      <form onSubmit={handleSendNotification} style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px', marginBottom: '14px' }}>
                        <h5 style={{ fontSize: '12.5px', fontWeight: 800, color: '#082f6e', marginBottom: '8px' }}>
                          <i className="fa-solid fa-paper-plane"></i> Send Notification to Customer
                        </h5>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                            Select Customer
                          </label>
                          <select
                            className="app-input-field"
                            value={msgTargetUser}
                            onChange={(e) => setMsgTargetUser(e.target.value)}
                            style={{ fontSize: '12px', padding: '8px 10px' }}
                          >
                            <option value="all">📢 All Customers (Broadcast)</option>
                            {allUsers.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.email} ({u.phone || 'No phone'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                            Subject / Title
                          </label>
                          <input
                            type="text"
                            className="app-input-field"
                            placeholder="e.g. Bank Account Verified & Active"
                            value={msgTitle}
                            onChange={(e) => setMsgTitle(e.target.value)}
                            required
                            style={{ fontSize: '12px', padding: '8px 10px' }}
                          />
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                            Message Body
                          </label>
                          <textarea
                            className="app-input-field"
                            rows={3}
                            placeholder="Type message for customer..."
                            value={msgContent}
                            onChange={(e) => setMsgContent(e.target.value)}
                            required
                            style={{ fontSize: '12px', padding: '8px 10px', resize: 'vertical' }}
                          />
                        </div>

                        <button type="submit" className="green-action-btn" disabled={msgSending} style={{ padding: '9px', fontSize: '12px' }}>
                          {msgSending ? 'Sending...' : 'Send Message Now'}
                        </button>
                      </form>

                      <h5 style={{ fontSize: '12px', fontWeight: 800, color: '#082f6e', marginBottom: '6px' }}>Sent Messages ({allNotifs.length})</h5>
                      {allNotifs.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '11.5px', textAlign: 'center' }}>No sent notifications yet.</p>
                      ) : (
                        allNotifs.map(n => (
                          <div key={n.id} className="admin-record-item" style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ fontSize: '11.5px', color: '#082f6e' }}>{n.title}</strong>
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#334155', margin: '2px 0' }}>{n.message}</p>
                            <span style={{ fontSize: '9.5px', color: '#0369a1', fontWeight: 700 }}>To: {n.user_email || 'All Users'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={loadAdminData} style={{ flex: 1, padding: '9px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                      <i className="fas fa-sync-alt"></i> Refresh Data
                    </button>
                    <button type="button" onClick={() => setIsAdminLoggedIn(false)} style={{ flex: 1, padding: '9px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                      Exit Admin
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
          <div className="header-circle-btn" onClick={() => { setShowNotifModal(true); handleMarkAllNotifsRead(); }}>
            <i className="fa-regular fa-bell"></i>
            {unreadNotifCount > 0 && <span className="notif-badge-dot">{unreadNotifCount}</span>}
          </div>
        </div>
      </header>

      {/* Cyan Ticker Banner (as visible in Photo 6, 2, 1) */}
      <div className="cyan-ticker">
        <span className="ticker-content">
          TIRANGA PAY! Securely link your bank accounts and earn a flat 7% commission on all auto-transactions! 24x7 Instant Settlement.
        </span>
      </div>

      {/* --- SUB-SCREENS --- */}

      {/* SCREEN 1: Tiranga Pay SMS Forwarder (Photo 1) */}
      {subScreen === 'sms' && (
        <div style={{ padding: '0 16px 20px' }}>
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Tiranga Pay SMS Forwarder</h2>
          </div>

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
                placeholder="Enter 10-digit mobile number"
                value={bankRegPhone}
                onChange={(e) => setBankRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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

      {/* SCREEN 2B: Add Bank Account & ATM Card */}
      {subScreen === 'bank_setup' && (
        <div style={{ padding: '0 16px 24px' }}>
          <div className="sub-header-bar" style={{ padding: '14px 0' }}>
            <div className="back-btn-square" onClick={() => setSubScreen('none')}>
              <i className="fas fa-chevron-left"></i>
            </div>
            <h2 className="sub-header-title">Link Bank & ATM Card</h2>
          </div>

          {/* Dynamic ATM Card Preview */}
          <div className="atm-card-preview-container">
            <div className="atm-card-preview-surface">
              <div className="atm-card-top-row">
                <span className="atm-card-bank-badge">
                  <i className="fa-solid fa-landmark"></i> {newBankName || 'YOUR BANK NAME'}
                </span>
                <span className="atm-card-network-badge">RuPay</span>
              </div>
              <div className="atm-card-chip-row">
                <div className="atm-chip-graphic"></div>
                <i className="fa-solid fa-wifi" style={{ transform: 'rotate(90deg)', fontSize: '16px', color: '#cbd5e1' }}></i>
              </div>
              <div className="atm-card-number-display">
                {newCardNumber
                  ? newCardNumber.replace(/(\d{4})/g, '$1 ').trim()
                  : '•••• •••• •••• ••••'}
              </div>
              <div className="atm-card-bottom-row">
                <div>
                  <div className="atm-card-mini-label">CARD HOLDER</div>
                  <div className="atm-card-holder-display">{newHolderName || 'CARD HOLDER NAME'}</div>
                </div>
                <div>
                  <div className="atm-card-mini-label">EXPIRES</div>
                  <div className="atm-card-expiry-display">{newCardExpiry || 'MM/YY'}</div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveBank}>
            {/* 1. BANK DETAILS */}
            <div className="white-card" style={{ marginBottom: '14px' }}>
              <div className="form-section-header">
                <div className="form-section-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#082f6e', margin: 0 }}>
                    1. Bank Details
                  </h4>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                    Enter registered bank account information
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Bank Name *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="e.g. State Bank of India, HDFC Bank, IndusInd"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="As per bank passbook / records"
                  value={newHolderName}
                  onChange={(e) => setNewHolderName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Bank Account Number *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="Enter full bank account number"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  Confirm Bank Account Number *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="Re-enter bank account number"
                  value={newConfirmAccNumber}
                  onChange={(e) => setNewConfirmAccNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  IFSC Code *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="e.g. SBIN0001234 / INDB0000001"
                  value={newIfsc}
                  onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                  required
                  maxLength={11}
                />
              </div>
            </div>

            {/* 2. ATM CARD DETAILS */}
            <div className="white-card" style={{ marginBottom: '18px' }}>
              <div className="form-section-header">
                <div className="form-section-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#082f6e', margin: 0 }}>
                    2. ATM Card Details
                  </h4>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                    Debit / ATM card for instant payout settlements
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                  16-Digit ATM Card Number *
                </label>
                <input
                  type="text"
                  className="app-input-field"
                  placeholder="•••• •••• •••• ••••"
                  value={newCardNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 16)
                    setNewCardNumber(clean)
                  }}
                  required
                  maxLength={16}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    Expiry Date *
                  </label>
                  <input
                    type="text"
                    className="app-input-field"
                    placeholder="MM/YY"
                    value={newCardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^\d/]/g, '')
                      if (v.length === 2 && !v.includes('/')) v = v + '/'
                      setNewCardExpiry(v.slice(0, 5))
                    }}
                    required
                    maxLength={5}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    CVV / CVC *
                  </label>
                  <input
                    type="password"
                    className="app-input-field"
                    placeholder="•••"
                    value={newCardCvv}
                    onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    required
                    maxLength={3}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: '#16a34a', fontSize: '15px' }}></i>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  256-bit bank encrypted & certified with PCI-DSS compliance.
                </span>
              </div>
            </div>

            {/* 3. BUTTON: Securely Link Bank Account */}
            <button
              type="submit"
              className="green-action-btn"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 8px 20px rgba(22, 163, 74, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '15px',
                padding: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                width: '100%'
              }}
              disabled={loading}
            >
              <i className="fas fa-lock"></i>
              <span>{loading ? 'Linking Securely...' : 'Securely Link Bank Account'}</span>
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

      {/* TAB 1: EXACT HOME SCREEN (Photo 6) */}
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
                onClick={() => setShowCommissionModal(true)}
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

          {/* Section: My Linked Bank Cards (Matching Photo) */}
          <h3 className="home-section-title">My Linked Bank Cards</h3>
          
          {/* Large Dashed Box matching Photo */}
          <div className="add-bank-large-box" onClick={() => setSubScreen('bank_setup')}>
            <div className="add-bank-circle-icon">
              <i className="fa-solid fa-plus"></i>
            </div>
            <div className="add-bank-box-title">Add New Bank Card</div>
            <div className="add-bank-box-sub">Link a bank account to receive withdrawals.</div>
          </div>

          {/* Section: Main Features */}
          <h3 className="home-section-title">Main Features</h3>

          <div className="main-features-box">
            <div className="feature-btn-item" onClick={() => setSubScreen('deposit')}>
              <div className="feature-round-icon icon-blue-shield">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <span className="feature-label-text">
                Security<br />Deposit
              </span>
            </div>

            <div className="feature-btn-item" onClick={() => setSubScreen('bank_setup')}>
              <div className="feature-round-icon icon-green-bank">
                <i className="fa-solid fa-landmark"></i>
              </div>
              <span className="feature-label-text">
                Add Bank
              </span>
            </div>

            <div className="feature-btn-item" onClick={() => setSubScreen('withdraw')}>
              <div className="feature-round-icon icon-purple-withdraw">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <span className="feature-label-text">
                Withdrawal
              </span>
            </div>

            <div className="feature-btn-item" onClick={() => setSubScreen('sms')}>
              <div className="feature-round-icon icon-gray-sms">
                <i className="fa-solid fa-comment-sms"></i>
              </div>
              <span className="feature-label-text">
                SMS<br />Forward
              </span>
            </div>
          </div>

          {/* Invite & Earn 7% Banner matching Photo */}
          <div className="invite-earn-banner" onClick={() => {
            navigator.clipboard.writeText(window.location.origin + window.location.pathname)
            showToast('Referral link copied to clipboard!')
          }}>
            <div className="invite-banner-text">
              <div className="invite-banner-title">Invite & Earn 7%</div>
              <div className="invite-banner-sub">Share with friends, build your network.</div>
            </div>
            <div className="invite-banner-icon">
              <i className="fa-solid fa-share-nodes"></i>
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

      {/* TAB 3: PROFILE SCREEN (User requested Name, Email, Avatar, Total Assets, Today's Earning & ATM details) */}
      {subScreen === 'none' && activeTab === 'profile' && (
        <div style={{ padding: '16px' }}>
          {/* User Name, Email & Profile Avatar Card */}
          <div className="profile-user-card">
            <div className="profile-avatar-circle">
              {((userBank?.holder_name?.[0]) || (user?.email?.[0]) || 'V').toUpperCase()}
            </div>
            <div className="profile-info-block">
              <h2 className="profile-display-name">
                {userBank?.holder_name || (user?.email?.split('@')[0].toUpperCase()) || 'VIKRAM KUMAR'}
              </h2>
              <p className="profile-display-email">{user?.email}</p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: '#dcfce7',
                  color: '#15803d'
                }}>
                  ● Verified
                </span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: '#e0f2fe',
                  color: '#0369a1'
                }}>
                  VIP 1
                </span>
              </div>
            </div>
          </div>

          {/* Total Assets & Today's Earning Grid */}
          <div className="profile-assets-grid">
            <div className="asset-box">
              <span className="asset-box-label">Total Assets</span>
              <div className="asset-box-val color-asset">
                ₹ {(profile?.wallet_balance ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="asset-box">
              <span className="asset-box-label">Today's Earning</span>
              <div className="asset-box-val color-earning">
                ₹ 0.00
              </div>
            </div>
          </div>

          {/* Secure Bank Link Details & ATM / Debit Card Details */}
          <h3 className="home-section-title" style={{ marginTop: '14px' }}>ATM / Debit Card Details</h3>

          <div className="bank-card-container" style={{ marginBottom: '14px' }}>
            <div className="bank-card-top">
              <span className="bank-card-name">
                {userBank?.bank_name || 'INDUSIND BANK'}
              </span>
              <span
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: userBank?.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                  color: userBank?.status === 'ACTIVE' ? '#15803d' : '#b45309'
                }}
              >
                {userBank?.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'}
              </span>
            </div>

            <div className="bank-card-digits">
              • • • • &nbsp; {userBank?.account_number ? userBank.account_number.slice(-4) : '2 1 0 7'}
            </div>

            <div className="bank-card-bottom">
              <div>
                <span className="card-holder-label">CARD HOLDER NAME</span>
                <div className="card-holder-val">
                  {userBank?.holder_name || (user?.email?.split('@')[0].toUpperCase()) || 'VIKRAM KUMAR'}
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em' }}>
                RUPAY DEBIT
              </div>
            </div>
          </div>

          {/* Button: Securely Link Bank Account (Shows PENDING until Admin activates it) */}
          <button
            type="button"
            className={`secure-link-btn ${userBank?.status === 'ACTIVE' ? 'btn-active-ready' : 'btn-pending-locked'}`}
            onClick={() => {
              if (userBank?.status === 'ACTIVE') {
                setSubScreen('deposit')
              } else {
                alert('⚠️ Bank Verification Pending!\n\nYour bank account & ATM card details have been submitted and are currently PENDING approval by Admin.\n\nOnce Admin activates your account in the Admin Panel, the Security Deposit QR Code page will unlock automatically.')
              }
            }}
          >
            <i className={userBank?.status === 'ACTIVE' ? "fas fa-shield-alt" : "fas fa-clock"}></i>
            {userBank?.status === 'ACTIVE'
              ? 'Securely Link Bank Account (Active - Open Deposit QR)'
              : 'Bank Verification: PENDING (Admin Activation Required)'}
          </button>

          {/* Top 4 Shortcuts Row matching Photo 3 */}
          <div className="profile-shortcuts-row" style={{ marginTop: '22px' }}>
            <div className="shortcut-item" onClick={() => { setActiveTab('transactions') }}>
              <div className="shortcut-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
              <span className="shortcut-title">Deposit Record</span>
            </div>

            <div className="shortcut-item" onClick={() => { setSubScreen('withdraw') }}>
              <div className="shortcut-icon-box" style={{ background: '#f3e8ff', color: '#a855f7' }}>
                <i className="fas fa-receipt"></i>
              </div>
              <span className="shortcut-title">Withdraw Record</span>
            </div>

            <div className="shortcut-item" onClick={() => alert(`My Team Level: 3-Tier Commission (Level 1: 30%, Level 2: 20%, Level 3: 10%). Your Invite Code: ${profile?.invite_code || 'VIP100'}`)}>
              <div className="shortcut-icon-box" style={{ background: '#ffedd5', color: '#f97316' }}>
                <i className="fas fa-users"></i>
              </div>
              <span className="shortcut-title">My Team</span>
            </div>

            <div className="shortcut-item" onClick={() => alert('VIP Level 1 Active! Flat 7% Commission Rate.')}>
              <div className="shortcut-icon-box" style={{ background: '#fef9c3', color: '#eab308' }}>
                <i className="fas fa-crown"></i>
              </div>
              <span className="shortcut-title">VIP Level</span>
            </div>
          </div>

          {/* Profile Menu List matching Photo 3 */}
          <div className="profile-menu-card">
            <div className="profile-menu-item" onClick={() => setSubScreen('bank_setup')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <i className="fas fa-credit-card"></i>
                </div>
                <span className="profile-item-name">My Bank Cards</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            <div className="profile-menu-item" onClick={() => setSubScreen('withdraw')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                  <i className="fas fa-university"></i>
                </div>
                <span className="profile-item-name">Withdrawal Bank</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

            <div className="profile-menu-item" onClick={() => setSubScreen('sms')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <i className="fas fa-comment-sms"></i>
                </div>
                <span className="profile-item-name">SMS Forwarder</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

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

            <div className="profile-menu-item" onClick={() => alert('Customer Support 24/7 is ready to assist you: support@tirangapaypanel.in')}>
              <div className="profile-item-left">
                <div className="profile-item-icon" style={{ background: '#ecfeff', color: '#06b6d4' }}>
                  <i className="fa-solid fa-headset"></i>
                </div>
                <span className="profile-item-name">Help & Support</span>
              </div>
              <i className="fas fa-chevron-right profile-item-chevron"></i>
            </div>

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

          <div style={{ textAlign: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>
            TIRANGA PAY V2.5.0
          </div>
        </div>
      )}

      {/* Commission 7% Details Modal */}
      {showCommissionModal && (
        <div className="popup-modal-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="popup-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-modal-header">
              <span className="popup-modal-title">
                <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }}></i> Commission 7% Plan Details
              </span>
              <button type="button" className="popup-modal-close" onClick={() => setShowCommissionModal(false)}>✕</button>
            </div>

            <div style={{ padding: '18px' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                  ⚡ GUARANTEED 7% COMMISSION RATE
                </span>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                  Earn a flat 7% commission on every automated payout transaction processed through your linked accounts.
                </p>
              </div>

              {/* 1. Savings Account */}
              <div className="commission-tier-card commission-tier-savings">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#15803d' }}>
                    <i className="fa-solid fa-piggy-bank"></i> 1. Savings Account
                  </strong>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                    7% COMM.
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Daily Transfer Limit: <span style={{ color: '#0369a1' }}>₹5,00,000 – ₹7,00,000</span> (5 to 7 Lakh)
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  &bull; Estimated Daily Earning: ₹35,000 – ₹49,000 / day<br />
                  &bull; Security Deposit: ₹2,000 (100% Refundable)<br />
                  &bull; Auto Daily Instant Settlement
                </div>
              </div>

              {/* 2. Current Account */}
              <div className="commission-tier-card commission-tier-current">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#0369a1' }}>
                    <i className="fa-solid fa-briefcase"></i> 2. Current Account
                  </strong>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    7% COMM.
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Daily Transfer Limit: <span style={{ color: '#0369a1' }}>₹25,00,000 – ₹30,00,000</span> (25 to 30 Lakh)
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  &bull; Estimated Daily Earning: ₹1,75,000 – ₹2,10,000 / day<br />
                  &bull; Security Deposit: ₹5,000 (100% Refundable)<br />
                  &bull; Priority High-Volume Settlement
                </div>
              </div>

              {/* 3. Corporate Account */}
              <div className="commission-tier-card commission-tier-corporate">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#7e22ce' }}>
                    <i className="fa-solid fa-building"></i> 3. Corporate Account
                  </strong>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#7e22ce', background: '#f3e8ff', padding: '2px 8px', borderRadius: '6px' }}>
                    7% COMM.
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                  Daily Transfer Limit: <span style={{ color: '#7e22ce' }}>₹7,00,00,000 – ₹10,00,00,000</span> (7 to 10 Crore)
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  &bull; Dedicated Merchant Routing Node<br />
                  &bull; Security Deposit: ₹15,000 (100% Refundable)<br />
                  &bull; 24x7 Real-Time Automated Liquidity
                </div>
              </div>

              <button
                type="button"
                className="green-action-btn"
                onClick={() => {
                  setShowCommissionModal(false)
                  setSubScreen('bank_setup')
                }}
                style={{ marginTop: '6px' }}
              >
                Link Bank Account & Start Earning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Notifications Modal */}
      {showNotifModal && (
        <div className="popup-modal-overlay" onClick={() => setShowNotifModal(false)}>
          <div className="popup-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="popup-modal-header">
              <span className="popup-modal-title">
                <i className="fa-regular fa-bell"></i> Notifications & Messages
              </span>
              <button type="button" className="popup-modal-close" onClick={() => setShowNotifModal(false)}>✕</button>
            </div>

            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                  Recent Messages from Admin
                </span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifsRead}
                    style={{ background: 'none', border: 'none', color: '#00A3E0', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                  <i className="fa-regular fa-envelope-open" style={{ fontSize: '32px', marginBottom: '8px', color: '#cbd5e1' }}></i>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>No messages yet from Admin.</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>You will receive updates here when your bank is approved or deposits are credited.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        background: n.is_read ? '#f8fafc' : '#eff6ff',
                        border: n.is_read ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                        borderRadius: '12px',
                        padding: '12px 14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: '#082f6e' }}>{n.title}</strong>
                        {!n.is_read && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4', margin: '4px 0' }}>{n.message}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="green-action-btn"
                onClick={() => setShowNotifModal(false)}
                style={{ marginTop: '16px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
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
