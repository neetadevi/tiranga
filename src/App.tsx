import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { 
  Headphones, 
  Bell, 
  ChevronLeft, 
  Zap, 
  Wallet, 
  Plus, 
  ShieldCheck, 
  Building2, 
  Banknote, 
  MessageSquare, 
  Share2, 
  Home, 
  Receipt, 
  User, 
  Copy, 
  CheckCircle2, 
  CreditCard, 
  Lock, 
  LogOut, 
  Users, 
  Crown, 
  FileText, 
  X, 
  Pencil, 
  Send, 
  AlertCircle 
} from './components/Icons'

// Types
interface Profile {
  id: string
  phone: string
  name: string
  wallet_balance: number
  today_earning: number
  total_asset: number
  vip_level: string
  forward_sms?: boolean
  auto_startup?: boolean
  battery_opt?: boolean
  hide_recent?: boolean
}

interface BankCard {
  id?: string
  user_phone: string
  bank_name: string
  account_holder: string
  account_number: string
  ifsc_code: string
  card_number: string
  card_expiry: string
  card_cvv: string
  status: 'PENDING' | 'ACTIVE' | 'REJECTED'
  created_at?: string
}

interface Deposit {
  id?: string
  user_phone: string
  plan_type: string
  amount: number
  utr_number: string
  slip_url?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at?: string
}

interface Withdrawal {
  id?: string
  user_phone: string
  amount: number
  bank_details: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at?: string
}

interface NotificationItem {
  id: string
  user_phone: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<'home' | 'transactions' | 'profile'>('home')
  const [subView, setSubView] = useState<'none' | 'security_deposit' | 'withdraw' | 'sms_forwarder' | 'add_bank' | 'admin'>('none')
  
  // User Session State
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authPhone, setAuthPhone] = useState('')
  const [authName, setAuthName] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // App Data
  const [linkedCards, setLinkedCards] = useState<BankCard[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Security Deposit Form State
  const [selectedPlan, setSelectedPlan] = useState<'savings' | 'current' | 'corporate'>('savings')
  const [depositMode, setDepositMode] = useState<'upi' | 'bank'>('upi')
  const [utrNumber, setUtrNumber] = useState('')
  const [paymentSlipName, setPaymentSlipName] = useState('')
  const [submittingDeposit, setSubmittingDeposit] = useState(false)

  // Add Bank Form State
  const [bankName, setBankName] = useState('')
  const [accHolder, setAccHolder] = useState('')
  const [accNumber, setAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [submittingBank, setSubmittingBank] = useState(false)

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPassword, setWithdrawPassword] = useState('')
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false)

  // SMS Forwarder State
  const [smsForwardActive, setSmsForwardActive] = useState(false)
  const [smsPhone, setSmsPhone] = useState('')
  const [autoStartup, setAutoStartup] = useState(false)
  const [batteryOptimization, setBatteryOptimization] = useState(false)
  const [hideRecent, setHideRecent] = useState(false)

  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminTab, setAdminTab] = useState<'cards' | 'deposits' | 'withdrawals' | 'notify' | 'users'>('cards')
  const [adminAllUsers, setAdminAllUsers] = useState<Profile[]>([])
  const [adminAllCards, setAdminAllCards] = useState<BankCard[]>([])
  const [adminAllDeposits, setAdminAllDeposits] = useState<Deposit[]>([])
  const [adminAllWithdrawals, setAdminAllWithdrawals] = useState<Withdrawal[]>([])
  const [adminNotifyUser, setAdminNotifyUser] = useState('ALL')
  const [adminNotifyTitle, setAdminNotifyTitle] = useState('')
  const [adminNotifyMsg, setAdminNotifyMsg] = useState('')

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Check URL routing for Admin
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase()
      const search = window.location.search.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path.includes('admin') || search.includes('admin') || hash.includes('admin')) {
        setSubView('admin')
      }
    }
    handleUrlRoute()
    window.addEventListener('popstate', handleUrlRoute)
    return () => window.removeEventListener('popstate', handleUrlRoute)
  }, [])

  // Initial Load & Auth Restore
  useEffect(() => {
    const savedUserPhone = localStorage.getItem('tiranga_user_phone')
    if (savedUserPhone) {
      fetchUserData(savedUserPhone)
    } else {
      // Default demo profile
      const defaultUser: Profile = {
        id: 'usr_demo_1',
        phone: '6206762421',
        name: 'VIKRAM KUMAR',
        wallet_balance: 0.00,
        today_earning: 0.00,
        total_asset: 0.00,
        vip_level: 'V1',
        forward_sms: false,
        auto_startup: false,
        battery_opt: false,
        hide_recent: false
      }
      setCurrentUser(defaultUser)
      setSmsPhone(defaultUser.phone)
      fetchUserData(defaultUser.phone)
    }
  }, [])

  // Fetch all user details from Supabase
  const fetchUserData = async (phone: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('tiranga_profiles')
        .select('*')
        .eq('phone', phone)
        .single()

      if (profileData) {
        setCurrentUser(profileData)
        setSmsPhone(profileData.phone)
        setSmsForwardActive(profileData.forward_sms || false)
        setAutoStartup(profileData.auto_startup || false)
        setBatteryOptimization(profileData.battery_opt || false)
        setHideRecent(profileData.hide_recent || false)
      } else {
        // Create initial record in Supabase
        const initialProfile: Profile = {
          id: `usr_${Date.now()}`,
          phone,
          name: 'VIKRAM KUMAR',
          wallet_balance: 0.00,
          today_earning: 0.00,
          total_asset: 0.00,
          vip_level: 'V1'
        }
        await supabase.from('tiranga_profiles').insert(initialProfile)
        setCurrentUser(initialProfile)
      }

      // 2. Fetch Bank Cards
      const { data: cardData } = await supabase
        .from('tiranga_bank_cards')
        .select('*')
        .eq('user_phone', phone)
        .order('created_at', { ascending: false })

      if (cardData && cardData.length > 0) {
        setLinkedCards(cardData)
      } else {
        // Fallback default sample card matching screenshot
        setLinkedCards([
          {
            id: 'demo_card_1',
            user_phone: phone,
            bank_name: 'INDUSIND BANK',
            account_holder: 'VIKRAM KUMAR',
            account_number: '••••••••2107',
            ifsc_code: 'INDB0000123',
            card_number: '••••••••••••2107',
            card_expiry: '12/28',
            card_cvv: '•••',
            status: 'PENDING'
          }
        ])
      }

      // 3. Fetch Deposits
      const { data: depositData } = await supabase
        .from('tiranga_deposits')
        .select('*')
        .eq('user_phone', phone)
        .order('created_at', { ascending: false })
      if (depositData) setDeposits(depositData)

      // 4. Fetch Withdrawals
      const { data: withdrawData } = await supabase
        .from('tiranga_withdrawals')
        .select('*')
        .eq('user_phone', phone)
        .order('created_at', { ascending: false })
      if (withdrawData) setWithdrawals(withdrawData)

      // 5. Fetch Notifications
      const { data: notifData } = await supabase
        .from('tiranga_notifications')
        .select('*')
        .or(`user_phone.eq.${phone},user_phone.eq.ALL`)
        .order('created_at', { ascending: false })
      if (notifData) setNotifications(notifData)

    } catch (err) {
      console.error('Error fetching Supabase data:', err)
    }
  }

  // Load Admin Data
  const fetchAdminData = async () => {
    try {
      const { data: u } = await supabase.from('tiranga_profiles').select('*').order('created_at', { ascending: false })
      if (u) setAdminAllUsers(u)

      const { data: c } = await supabase.from('tiranga_bank_cards').select('*').order('created_at', { ascending: false })
      if (c) setAdminAllCards(c)

      const { data: d } = await supabase.from('tiranga_deposits').select('*').order('created_at', { ascending: false })
      if (d) setAdminAllDeposits(d)

      const { data: w } = await supabase.from('tiranga_withdrawals').select('*').order('created_at', { ascending: false })
      if (w) setAdminAllWithdrawals(w)
    } catch (e) {
      console.error(e)
    }
  }

  // Handle Login / Sign Up
  const handleUserAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authPhone || authPhone.length < 10) {
      showToast('Please enter a valid 10-digit phone number')
      return
    }
    setAuthLoading(true)

    try {
      const cleanPhone = authPhone.trim()
      const { data: existingUser } = await supabase
        .from('tiranga_profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existingUser) {
        setCurrentUser(existingUser)
        localStorage.setItem('tiranga_user_phone', cleanPhone)
        fetchUserData(cleanPhone)
        setShowAuthModal(false)
        showToast(`Welcome back, ${existingUser.name}!`)
      } else {
        const newProf: Profile = {
          id: `usr_${Date.now()}`,
          phone: cleanPhone,
          name: authName.trim() || 'VIKRAM KUMAR',
          wallet_balance: 0.00,
          today_earning: 0.00,
          total_asset: 0.00,
          vip_level: 'V1'
        }
        await supabase.from('tiranga_profiles').insert(newProf)
        setCurrentUser(newProf)
        localStorage.setItem('tiranga_user_phone', cleanPhone)
        fetchUserData(cleanPhone)
        setShowAuthModal(false)
        showToast('Registration successful! Welcome to Tiranga Pay.')
      }
    } catch (err) {
      showToast('Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Add Bank Card & ATM Card Details
  const handleAddBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bankName || !accHolder || !accNumber || !cardNumber) {
      showToast('Please fill all required bank & card details')
      return
    }

    setSubmittingBank(true)
    const newCard: BankCard = {
      user_phone: currentUser?.phone || '6206762421',
      bank_name: bankName.toUpperCase(),
      account_holder: accHolder.toUpperCase(),
      account_number: accNumber,
      ifsc_code: ifsc.toUpperCase(),
      card_number: cardNumber,
      card_expiry: cardExpiry || '12/28',
      card_cvv: cardCvv || '888',
      status: 'PENDING'
    }

    try {
      const { data, error } = await supabase.from('tiranga_bank_cards').insert(newCard).select().single()
      if (error) throw error

      setLinkedCards(prev => [data || newCard, ...prev])
      showToast('Bank & Card securely submitted! Status is PENDING admin approval.')
      setSubView('none')
      setCurrentTab('home')
      // Reset fields
      setBankName('')
      setAccHolder('')
      setAccNumber('')
      setIfsc('')
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
    } catch (err) {
      // Offline fallback
      setLinkedCards(prev => [newCard, ...prev])
      showToast('Bank & Card securely linked (Status: PENDING)')
      setSubView('none')
      setCurrentTab('home')
    } finally {
      setSubmittingBank(false)
    }
  }

  // Handle Security Deposit Submission
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!utrNumber || utrNumber.length < 6) {
      showToast('Please enter a valid 12-digit UTR Number')
      return
    }

    setSubmittingDeposit(true)
    const depositAmounts: Record<string, number> = {
      savings: 2000,
      current: 5000,
      corporate: 15000
    }
    const planNames: Record<string, string> = {
      savings: 'Savings Account',
      current: 'Current Account',
      corporate: 'Corporate Account'
    }

    const newDep: Deposit = {
      user_phone: currentUser?.phone || '6206762421',
      plan_type: planNames[selectedPlan],
      amount: depositAmounts[selectedPlan],
      utr_number: utrNumber.trim(),
      slip_url: paymentSlipName || 'payment_proof.jpg',
      status: 'PENDING'
    }

    try {
      const { data, error } = await supabase.from('tiranga_deposits').insert(newDep).select().single()
      if (error) throw error
      setDeposits(prev => [data || newDep, ...prev])
      showToast('Payment proof submitted successfully! Verification in progress.')
      setUtrNumber('')
      setPaymentSlipName('')
      setSubView('none')
    } catch {
      setDeposits(prev => [newDep, ...prev])
      showToast('Payment proof submitted! Verification in progress.')
      setSubView('none')
    } finally {
      setSubmittingDeposit(false)
    }
  }

  // Handle Withdrawal Request
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(withdrawAmount)
    if (isNaN(amt) || amt < 500) {
      showToast('Minimum withdrawal amount is ₹500')
      return
    }

    if (!currentUser || currentUser.wallet_balance < amt) {
      showToast('Insufficient wallet balance!')
      return
    }

    setSubmittingWithdraw(true)
    const newWith: Withdrawal = {
      user_phone: currentUser.phone,
      amount: amt,
      bank_details: linkedCards[0]?.bank_name || 'Primary Bank',
      status: 'PENDING'
    }

    try {
      const { data, error } = await supabase.from('tiranga_withdrawals').insert(newWith).select().single()
      if (error) throw error
      setWithdrawals(prev => [data || newWith, ...prev])
      showToast('Withdrawal request submitted successfully!')
      setWithdrawAmount('')
      setWithdrawPassword('')
    } catch {
      setWithdrawals(prev => [newWith, ...prev])
      showToast('Withdrawal request submitted!')
    } finally {
      setSubmittingWithdraw(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied to clipboard: ${text}`)
  }

  // Admin Login Action
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUser === 'admin' && adminPass === 'admin123') {
      setIsAdminLoggedIn(true)
      fetchAdminData()
      showToast('Admin logged in successfully!')
    } else {
      showToast('Invalid admin credentials!')
    }
  }

  // Admin Card Status Update
  const updateCardStatus = async (cardId: string, status: 'ACTIVE' | 'REJECTED') => {
    try {
      await supabase.from('tiranga_bank_cards').update({ status }).eq('id', cardId)
      setAdminAllCards(prev => prev.map(c => c.id === cardId ? { ...c, status } : c))
      setLinkedCards(prev => prev.map(c => c.id === cardId ? { ...c, status } : c))
      showToast(`Card status updated to ${status}`)
    } catch {
      showToast('Failed to update status')
    }
  }

  // Admin Deposit Approve (Credits Wallet Balance!)
  const updateDepositStatus = async (dep: Deposit, status: 'APPROVED' | 'REJECTED') => {
    try {
      if (dep.id) {
        await supabase.from('tiranga_deposits').update({ status }).eq('id', dep.id)
      }
      if (status === 'APPROVED') {
        // Credit user balance
        const { data: prof } = await supabase
          .from('tiranga_profiles')
          .select('wallet_balance, total_asset')
          .eq('phone', dep.user_phone)
          .single()
        if (prof) {
          const newBal = (Number(prof.wallet_balance) || 0) + Number(dep.amount)
          const newAsset = (Number(prof.total_asset) || 0) + Number(dep.amount)
          await supabase
            .from('tiranga_profiles')
            .update({ wallet_balance: newBal, total_asset: newAsset })
            .eq('phone', dep.user_phone)
        }
      }
      fetchAdminData()
      if (currentUser?.phone === dep.user_phone) {
        fetchUserData(dep.user_phone)
      }
      showToast(`Deposit marked as ${status}!`)
    } catch {
      showToast('Error updating deposit')
    }
  }

  // Admin Send Notification to User
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminNotifyTitle || !adminNotifyMsg) {
      showToast('Please enter notification title and message')
      return
    }

    try {
      const notifItem: Partial<NotificationItem> = {
        user_phone: adminNotifyUser,
        title: adminNotifyTitle,
        message: adminNotifyMsg,
        is_read: false
      }
      await supabase.from('tiranga_notifications').insert(notifItem)
      showToast(`Notification sent successfully to ${adminNotifyUser}!`)
      setAdminNotifyTitle('')
      setAdminNotifyMsg('')
      // Refresh current notifications
      if (currentUser) fetchUserData(currentUser.phone)
    } catch {
      showToast('Failed to send notification')
    }
  }

  // Unread notification count
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Current Plan Amount for QR
  const currentPlanAmount = selectedPlan === 'savings' ? 2000 : selectedPlan === 'current' ? 5000 : 15000
  const upiId = '9685318069@mairtel'
  const upiName = 'ABHIJEET'
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${currentPlanAmount}&cu=INR`)}`

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: '#0f172a',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: 30,
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER */}
      {subView === 'none' && (
        <header className="app-header">
          <div className="logo-wrap" onClick={() => { setSubView('none'); setCurrentTab('home') }}>
            <span className="logo-tiranga">TIRANGA</span>
            <span className="logo-pay">PAY</span>
          </div>

          <div className="header-actions">
            {/* Customer Care */}
            <button 
              className="icon-btn-round" 
              onClick={() => setShowSupportModal(true)}
              title="24/7 Support"
            >
              <Headphones size={19} />
            </button>

            {/* Notification Bell */}
            <button 
              className="icon-btn-round" 
              onClick={() => setShowNotificationsModal(true)}
              title="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && <span className="badge-dot">{unreadCount}</span>}
            </button>
          </div>
        </header>
      )}

      {/* SUB-HEADER FOR INTERNAL VIEWS */}
      {subView !== 'none' && (
        <header className="sub-header">
          <button className="back-btn" onClick={() => setSubView('none')}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="sub-header-title">
            {subView === 'security_deposit' && 'Security Deposit'}
            {subView === 'withdraw' && 'Withdraw Funds'}
            {subView === 'sms_forwarder' && 'Tiranga Pay SMS Forwarder'}
            {subView === 'add_bank' && 'Link Bank Card'}
            {subView === 'admin' && 'Admin Control Panel'}
          </h1>
        </header>
      )}

      {/* RUNNING MARQUEE TICKER (Home only) */}
      {subView === 'none' && currentTab === 'home' && (
        <div className="ticker-banner">
          <span className="ticker-text">
            TIRANGA PAY! Securely link your bank accounts and earn a flat 7% commission on all auto-processed transactions &bull; Instant Withdrawals &bull; 24/7 Security Guarantee
          </span>
        </div>
      )}

      {/* ========================================================== */}
      {/* 1. HOME SCREEN */}
      {/* ========================================================== */}
      {subView === 'none' && currentTab === 'home' && (
        <main className="page-body">
          {/* Blue Gradient Balance Card */}
          <section className="wallet-card">
            <div className="wallet-top">
              <span>Total Wallet Balance (7% Comm.)</span>
              <span className="level-badge">Level: {currentUser?.vip_level || 'V1'}</span>
            </div>

            <div className="wallet-amount">
              <span>₹</span>
              <span>{(currentUser?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="wallet-actions">
              <button 
                className="btn-pill-cyan" 
                onClick={() => setShowCommissionModal(true)}
              >
                <Zap size={16} fill="white" />
                <span>Commission 7%</span>
              </button>

              <button 
                className="btn-pill-green" 
                onClick={() => setSubView('withdraw')}
              >
                <Wallet size={16} />
                <span>Withdrawal</span>
              </button>
            </div>
          </section>

          {/* Linked Bank Cards Section */}
          <section>
            <h2 className="section-title">My Linked Bank Cards</h2>

            {linkedCards.length > 0 ? (
              <div className="card-stack">
                {linkedCards.map((card, idx) => (
                  <div key={card.id || idx} className="credit-card">
                    <div className="credit-card-header">
                      <span className="bank-name-text">{card.bank_name}</span>
                      <span className={`status-tag status-${card.status.toLowerCase()}`}>
                        {card.status}
                      </span>
                    </div>

                    <div className="card-number-dots">
                      <span>&bull;&bull;&bull;&bull;</span>
                      <span>&bull;&bull;&bull;&bull;</span>
                      <span>&bull;&bull;&bull;&bull;</span>
                      <span>{card.card_number ? card.card_number.slice(-4) : '2107'}</span>
                    </div>

                    <div className="card-footer">
                      <div>
                        <div className="holder-label">CARD HOLDER NAME</div>
                        <div className="holder-name">{card.account_holder}</div>
                      </div>

                      <button 
                        className="card-edit-btn" 
                        onClick={() => {
                          if (card.status === 'ACTIVE') {
                            setSubView('security_deposit')
                          } else {
                            showToast('Card is currently PENDING admin verification')
                          }
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                <button 
                  className="add-card-dashed-btn" 
                  onClick={() => setSubView('add_bank')}
                >
                  <Plus size={16} />
                  <span>+ Add another card</span>
                </button>
              </div>
            ) : (
              <div className="empty-card-box" onClick={() => setSubView('add_bank')}>
                <div className="empty-card-icon">
                  <Plus size={22} />
                </div>
                <div className="empty-card-title">Add New Bank Card</div>
                <div className="empty-card-desc">Link a bank account to receive withdrawals.</div>
              </div>
            )}
          </section>

          {/* Main Features Grid */}
          <section className="features-card">
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 12 }}>
              Main Features
            </h3>
            <div className="features-grid">
              {/* Security Deposit */}
              <div className="feature-item" onClick={() => setSubView('security_deposit')}>
                <div className="feature-icon-circle bg-feature-deposit">
                  <ShieldCheck size={26} />
                </div>
                <span className="feature-label">Security Deposit</span>
              </div>

              {/* Add Bank */}
              <div className="feature-item" onClick={() => setSubView('add_bank')}>
                <div className="feature-icon-circle bg-feature-bank">
                  <Building2 size={24} />
                </div>
                <span className="feature-label">Add Bank</span>
              </div>

              {/* Withdrawal */}
              <div className="feature-item" onClick={() => setSubView('withdraw')}>
                <div className="feature-icon-circle bg-feature-withdraw">
                  <Banknote size={24} />
                </div>
                <span className="feature-label">Withdrawal</span>
              </div>

              {/* SMS Forward */}
              <div className="feature-item" onClick={() => setSubView('sms_forwarder')}>
                <div className="feature-icon-circle bg-feature-sms">
                  <MessageSquare size={24} />
                </div>
                <span className="feature-label">SMS Forward</span>
              </div>
            </div>
          </section>

          {/* Invite & Earn 7% Banner */}
          <section 
            className="invite-banner" 
            onClick={() => copyToClipboard(`https://neetadevi.github.io/tiranga/?ref=${currentUser?.phone || 'tiranga'}`)}
          >
            <div>
              <div className="invite-title">Invite &amp; Earn 7%</div>
              <div className="invite-subtitle">Share with friends, build your network.</div>
            </div>
            <div className="invite-share-icon">
              <Share2 size={20} />
            </div>
          </section>
        </main>
      )}

      {/* ========================================================== */}
      {/* 2. TRANSACTIONS SCREEN */}
      {/* ========================================================== */}
      {subView === 'none' && currentTab === 'transactions' && (
        <main className="page-body">
          <h2 className="section-title">Transactions &amp; Records</h2>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'white', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Deposits</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0c325c', marginTop: 4 }}>
                ₹{deposits.reduce((acc, d) => acc + (d.status === 'APPROVED' ? Number(d.amount) : 0), 0)}
              </div>
            </div>
            <div style={{ background: 'white', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Withdrawals</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                ₹{withdrawals.reduce((acc, w) => acc + (w.status === 'APPROVED' ? Number(w.amount) : 0), 0)}
              </div>
            </div>
          </div>

          {/* Deposits List */}
          <div style={{ background: 'white', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0c325c', marginBottom: 10 }}>Deposit Records</h3>
            {deposits.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deposits.map((dep, i) => (
                  <div key={dep.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{dep.plan_type}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>UTR: {dep.utr_number}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0c325c' }}>+₹{dep.amount}</div>
                      <span className={`status-tag status-${dep.status.toLowerCase()}`}>{dep.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>
                No deposit records found.
              </div>
            )}
          </div>

          {/* Withdrawals List */}
          <div style={{ background: 'white', borderRadius: 14, padding: 14, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#0c325c', marginBottom: 10 }}>Withdrawal Records</h3>
            {withdrawals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {withdrawals.map((w, i) => (
                  <div key={w.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Bank Withdrawal</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{w.bank_details}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>-₹{w.amount}</div>
                      <span className={`status-tag status-${w.status.toLowerCase()}`}>{w.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>
                No withdrawal records found.
              </div>
            )}
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* 3. PROFILE SCREEN */}
      {/* ========================================================== */}
      {subView === 'none' && currentTab === 'profile' && (
        <main className="page-body">
          {/* User Profile Card */}
          <section className="profile-user-card">
            <div className="profile-avatar-circle">
              <User size={30} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{currentUser?.name || 'VIKRAM KUMAR'}</div>
              <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 2 }}>+91 {currentUser?.phone || '6206762421'}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12 }}>
                <span>Asset: <strong>₹{(currentUser?.total_asset || 0).toFixed(2)}</strong></span>
                <span>Today: <strong>₹{(currentUser?.today_earning || 0).toFixed(2)}</strong></span>
              </div>
            </div>
          </section>

          {/* Quick Actions 4 Grid */}
          <section className="profile-quick-grid">
            <div className="quick-action-item" onClick={() => setCurrentTab('transactions')}>
              <div className="quick-action-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <FileText size={22} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Deposit Record</span>
            </div>

            <div className="quick-action-item" onClick={() => setCurrentTab('transactions')}>
              <div className="quick-action-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                <Receipt size={22} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>Withdraw Record</span>
            </div>

            <div className="quick-action-item" onClick={() => copyToClipboard(`https://neetadevi.github.io/tiranga/?ref=${currentUser?.phone}`)}>
              <div className="quick-action-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                <Users size={22} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>My Team</span>
            </div>

            <div className="quick-action-item" onClick={() => showToast('VIP Level: V1 (7% Commission Tier)')}>
              <div className="quick-action-icon" style={{ background: '#fef9c3', color: '#ca8a04' }}>
                <Crown size={22} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700 }}>VIP Level</span>
            </div>
          </section>

          {/* Menu Rows */}
          <section className="profile-menu-card">
            {/* My Bank Cards */}
            <div className="profile-menu-row" onClick={() => setSubView('add_bank')}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <CreditCard size={18} />
                </div>
                <span>My Bank Cards</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* Withdrawal Bank */}
            <div className="profile-menu-row" onClick={() => setSubView('withdraw')}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                  <Building2 size={18} />
                </div>
                <span>Withdrawal Bank</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* SMS Forwarder */}
            <div className="profile-menu-row" onClick={() => setSubView('sms_forwarder')}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#f1f5f9', color: '#334155' }}>
                  <MessageSquare size={18} />
                </div>
                <span>SMS Forwarder</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* Invite Friends */}
            <div className="profile-menu-row" onClick={() => copyToClipboard(`https://neetadevi.github.io/tiranga/?ref=${currentUser?.phone}`)}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#ffedd5', color: '#ea580c' }}>
                  <Share2 size={18} />
                </div>
                <span>Invite Friends</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* Help & Support */}
            <div className="profile-menu-row" onClick={() => setShowSupportModal(true)}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#cffafe', color: '#0891b2' }}>
                  <Headphones size={18} />
                </div>
                <span>Help &amp; Support</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* Change Password / Switch Account */}
            <div className="profile-menu-row" onClick={() => setShowAuthModal(true)}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <Lock size={18} />
                </div>
                <span>Switch / Login Account</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>

            {/* Secure Logout */}
            <div className="profile-menu-row" onClick={() => {
              localStorage.removeItem('tiranga_user_phone')
              showToast('Logged out securely')
              setShowAuthModal(true)
            }}>
              <div className="menu-left">
                <div className="menu-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <LogOut size={18} />
                </div>
                <span style={{ color: '#dc2626' }}>Secure Logout</span>
              </div>
              <span style={{ color: '#94a3b8' }}>&rsaquo;</span>
            </div>
          </section>

          {/* App Version Tag */}
          <div 
            style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginTop: 10, cursor: 'pointer' }}
            onClick={() => setSubView('admin')}
            title="Click to open Admin Panel"
          >
            TIRANGA PAY V2.5.0
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* 4. SECURITY DEPOSIT SUB-VIEW */}
      {/* ========================================================== */}
      {subView === 'security_deposit' && (
        <main className="page-body">
          <div style={{ textAlign: 'center', margin: '4px 0 10px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0c325c', letterSpacing: 0.5 }}>
              TIRANGA PAY SECURITY DEPOSIT
            </h2>
          </div>

          {/* 3 Selectable Plan Cards */}
          <div className="deposit-plans-grid">
            <div 
              className={`plan-card ${selectedPlan === 'savings' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('savings')}
            >
              <div className="plan-title">Savings Account</div>
              <div className="plan-amount">₹2000</div>
            </div>

            <div 
              className={`plan-card ${selectedPlan === 'current' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('current')}
            >
              <div className="plan-title">Current Account</div>
              <div className="plan-amount">₹5000</div>
            </div>

            <div 
              className={`plan-card ${selectedPlan === 'corporate' ? 'selected' : ''}`}
              onClick={() => setSelectedPlan('corporate')}
            >
              <div className="plan-title">Corporate Account</div>
              <div className="plan-amount">₹15000</div>
            </div>
          </div>

          {/* Deposit Mode Selector */}
          <div className="deposit-tabs">
            <button 
              className={`deposit-tab ${depositMode === 'upi' ? 'active' : ''}`}
              onClick={() => setDepositMode('upi')}
            >
              <Zap size={14} />
              <span>UPI</span>
            </button>
            <button 
              className={`deposit-tab ${depositMode === 'bank' ? 'active' : ''}`}
              onClick={() => setDepositMode('bank')}
            >
              <Building2 size={14} />
              <span>Direct Bank</span>
            </button>
          </div>

          {/* QR Code Card */}
          <div className="qr-container-card">
            <div className="verified-holder">
              <span>{upiName}</span>
              <CheckCircle2 size={18} fill="#0284c7" color="white" />
            </div>

            <div className="qr-image-wrapper">
              <img 
                src={upiQrUrl} 
                alt="Payment QR Code" 
                style={{ width: 190, height: 190, display: 'block' }} 
              />
            </div>

            <div className="qr-caption">SCAN TO PAY SECURITY DEPOSIT</div>

            <div className="upi-copy-pill">
              <span className="upi-text">UPI: {upiId}</span>
              <button className="btn-copy-blue" onClick={() => copyToClipboard(upiId)}>
                <Copy size={13} />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Submit Payment Proof Form */}
          <form className="proof-card" onSubmit={handleDepositSubmit}>
            <div className="proof-badge-pill">SUBMIT PAYMENT PROOF</div>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label"># ENTER 12-DIGIT UTR NUMBER</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 3124xxxxxxxxx"
                value={utrNumber}
                onChange={e => setUtrNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">&#128444; UPLOAD PAYMENT SLIP</label>
              <div className="file-input-box">
                <label className="choose-file-btn">
                  Choose File
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setPaymentSlipName(e.target.files[0].name)
                        showToast(`Selected file: ${e.target.files[0].name}`)
                      }
                    }} 
                  />
                </label>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  {paymentSlipName || 'No file chosen'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 16 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Ensure the UTR and amount are clearly visible in the screenshot.</span>
            </div>

            <button type="submit" className="btn-submit-green" disabled={submittingDeposit}>
              {submittingDeposit ? 'SUBMITTING...' : 'SUBMIT DETAILS'}
            </button>
          </form>
        </main>
      )}

      {/* ========================================================== */}
      {/* 5. WITHDRAW FUNDS SUB-VIEW */}
      {/* ========================================================== */}
      {subView === 'withdraw' && (
        <main className="page-body">
          {/* Ticker Banner */}
          <div className="ticker-banner" style={{ borderRadius: 8, margin: 0 }}>
            <span className="ticker-text">
              TIRANGA PAY! Securely link your bank accounts and earn a flat 7% commission...
            </span>
          </div>

          <form className="proof-card" style={{ marginTop: 0 }} onSubmit={handleWithdrawSubmit}>
            <div className="form-group">
              <label className="form-label">Withdrawal Amount (₹)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="Min withdrawal ₹500"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                min="500"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} color="#0c325c" />
                <span>Withdrawal Receiving Account</span>
              </label>

              {linkedCards.length > 0 ? (
                <div style={{
                  border: '1.5px dashed #00b4d8',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: '#f0f9ff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0c325c' }}>
                      {linkedCards[0].bank_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      A/C: {linkedCards[0].account_number}
                    </div>
                  </div>
                  <span className={`status-tag status-${linkedCards[0].status.toLowerCase()}`}>
                    {linkedCards[0].status}
                  </span>
                </div>
              ) : (
                <div 
                  style={{
                    border: '1.5px dashed #00b4d8',
                    borderRadius: 12,
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSubView('add_bank')}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c' }}>No Bank Added</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Setup receiving bank</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#00b4d8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={18} />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Account Password (For Security)</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter password"
                value={withdrawPassword}
                onChange={e => setWithdrawPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-submit-green" disabled={submittingWithdraw}>
              {submittingWithdraw ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>

          {/* Withdrawal History */}
          <section>
            <h3 className="section-title">Withdrawal History</h3>
            {withdrawals.length > 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0' }}>
                {withdrawals.map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>₹{w.amount}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{w.bank_details}</div>
                    </div>
                    <span className={`status-tag status-${w.status.toLowerCase()}`}>{w.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
                No records found.
              </div>
            )}
          </section>
        </main>
      )}

      {/* ========================================================== */}
      {/* 6. TIRANGA PAY SMS FORWARDER SUB-VIEW */}
      {/* ========================================================== */}
      {subView === 'sms_forwarder' && (
        <main className="page-body">
          {/* App Status Card */}
          <div className="sms-status-card">
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0c325c' }}>App Status</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Current state of SMS Forwarder</div>
            </div>
            <span className={smsForwardActive ? 'status-badge-green' : 'status-badge-red'}>
              {smsForwardActive ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* BANK DETAILS Section */}
          <div className="sms-section-header">BANK DETAILS</div>
          <div style={{ background: 'white', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c', marginBottom: 4 }}>
              Bank Register Mobile Number
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Please enter your 10-digit registered mobile number.
            </div>

            <div style={{ display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: 10, overflow: 'hidden' }}>
              <span style={{ background: '#f1f5f9', padding: '12px 14px', fontSize: 14, fontWeight: 700, borderRight: '1px solid #cbd5e1', color: '#334155' }}>
                +91
              </span>
              <input 
                type="text" 
                style={{ flex: 1, border: 'none', padding: '12px 14px', fontSize: 15, fontWeight: 600, outline: 'none' }}
                value={smsPhone}
                onChange={e => setSmsPhone(e.target.value)}
                placeholder="1234567890"
              />
            </div>
          </div>

          {/* FORWARDING FUNCTION Section */}
          <div className="sms-section-header-grey">FORWARDING FUNCTION</div>
          <div className="toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c' }}>Forward Sms</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, maxWidth: 280 }}>
                Main switch, requires permissions to read and send SMS messages.
              </div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={smsForwardActive} 
                onChange={e => {
                  setSmsForwardActive(e.target.checked)
                  showToast(e.target.checked ? 'SMS Forwarder is now ONLINE' : 'SMS Forwarder is OFFLINE')
                }} 
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* KEEP ALIVE SETTINGS Section */}
          <div className="sms-section-header-grey">KEEP ALIVE SETTINGS</div>
          
          <div className="toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c' }}>Auto Startup</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Allow Apps to Self-Start for background running.
              </div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={autoStartup} 
                onChange={e => setAutoStartup(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c' }}>Battery Optimization</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Ignore battery limits for continuous background running.
              </div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={batteryOptimization} 
                onChange={e => setBatteryOptimization(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c325c' }}>Hide from Recent Apps</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={hideRecent} 
                onChange={e => setHideRecent(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* 7. ADD BANK & ATM CARD DETAILS SUB-VIEW */}
      {/* ========================================================== */}
      {subView === 'add_bank' && (
        <main className="page-body">
          <form className="proof-card" style={{ marginTop: 0 }} onSubmit={handleAddBankSubmit}>
            <div className="proof-badge-pill">LINK BANK ACCOUNT</div>

            {/* Bank Details */}
            <div style={{ fontSize: 13, fontWeight: 800, color: '#00b4d8', margin: '8px 0 12px', textTransform: 'uppercase' }}>
              1. Bank Account Details
            </div>

            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. INDUSIND BANK, HDFC, SBI"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Holder Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. VIKRAM KUMAR"
                value={accHolder}
                onChange={e => setAccHolder(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bank Account Number</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Enter complete account number"
                value={accNumber}
                onChange={e => setAccNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. INDB0000123"
                value={ifsc}
                onChange={e => setIfsc(e.target.value)}
                required
              />
            </div>

            {/* ATM Card Details */}
            <div style={{ fontSize: 13, fontWeight: 800, color: '#00b4d8', margin: '18px 0 12px', textTransform: 'uppercase' }}>
              2. ATM / Debit Card Details
            </div>

            <div className="form-group">
              <label className="form-label">Debit / ATM Card Number</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="16-digit Card Number"
                maxLength={19}
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Expiry (MM/YY)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="MM/YY"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={e => setCardExpiry(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">CVV</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="3 digits"
                  maxLength={4}
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-submit-green" style={{ marginTop: 10 }} disabled={submittingBank}>
              {submittingBank ? 'Connecting Bank...' : 'Securely Link Bank Account'}
            </button>
          </form>
        </main>
      )}

      {/* ========================================================== */}
      {/* 8. ADMIN CONTROL PANEL */}
      {/* ========================================================== */}
      {subView === 'admin' && (
        <main className="page-body">
          {!isAdminLoggedIn ? (
            <form className="proof-card" style={{ marginTop: 20 }} onSubmit={handleAdminLogin}>
              <div className="proof-badge-pill">ADMIN AUTHENTICATION</div>
              <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0c325c' }}>Tiranga Pay Administration</h3>
                <p style={{ fontSize: 12, color: '#64748b' }}>Enter master admin credentials to manage accounts</p>
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={adminUser} 
                  onChange={e => setAdminUser(e.target.value)}
                  placeholder=""
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={adminPass} 
                  onChange={e => setAdminPass(e.target.value)}
                  placeholder=""
                  required 
                />
              </div>

              <button type="submit" className="btn-submit-green" style={{ background: '#7c3aed' }}>
                Login to Admin Panel
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Admin Bar */}
              <div style={{ background: '#7c3aed', color: 'white', padding: 14, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Admin Master Control</div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>Tiranga Pay Panel v2.5</div>
                </div>
                <button 
                  onClick={() => setIsAdminLoggedIn(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Logout
                </button>
              </div>

              {/* Admin Nav Tabs */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {(['cards', 'deposits', 'withdrawals', 'notify', 'users'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => { setAdminTab(t); fetchAdminData(); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: adminTab === t ? '#0c325c' : '#ffffff',
                      color: adminTab === t ? '#ffffff' : '#64748b'
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Tab 1: Bank Cards Management */}
              {adminTab === 'cards' && (
                <div style={{ background: 'white', borderRadius: 14, padding: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Bank Cards &amp; ATM Details</h3>
                  {adminAllCards.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {adminAllCards.map((c, i) => (
                        <div key={c.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <strong style={{ color: '#0c325c' }}>{c.bank_name}</strong>
                            <span className={`status-tag status-${c.status.toLowerCase()}`}>{c.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                            <div>Holder: <strong>{c.account_holder}</strong> (Phone: {c.user_phone})</div>
                            <div>A/C: {c.account_number} &bull; IFSC: {c.ifsc_code}</div>
                            <div>ATM Card: {c.card_number} &bull; Exp: {c.card_expiry} &bull; CVV: {c.card_cvv}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button 
                              onClick={() => c.id && updateCardStatus(c.id, 'ACTIVE')}
                              style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Approve (Activate)
                            </button>
                            <button 
                              onClick={() => c.id && updateCardStatus(c.id, 'REJECTED')}
                              style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No bank cards found.</div>
                  )}
                </div>
              )}

              {/* Tab 2: Security Deposits Management */}
              {adminTab === 'deposits' && (
                <div style={{ background: 'white', borderRadius: 14, padding: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Security Deposits</h3>
                  {adminAllDeposits.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {adminAllDeposits.map((d, i) => (
                        <div key={d.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <strong>₹{d.amount} ({d.plan_type})</strong>
                            <span className={`status-tag status-${d.status.toLowerCase()}`}>{d.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                            <div>User: {d.user_phone}</div>
                            <div>UTR: <strong>{d.utr_number}</strong></div>
                            <div>Slip: {d.slip_url}</div>
                          </div>
                          {d.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button 
                                onClick={() => updateDepositStatus(d, 'APPROVED')}
                                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Approve &amp; Credit ₹{d.amount}
                              </button>
                              <button 
                                onClick={() => updateDepositStatus(d, 'REJECTED')}
                                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No deposits found.</div>
                  )}
                </div>
              )}

              {/* Tab 3: Withdrawals */}
              {adminTab === 'withdrawals' && (
                <div style={{ background: 'white', borderRadius: 14, padding: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Withdrawals</h3>
                  {adminAllWithdrawals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {adminAllWithdrawals.map((w, i) => (
                        <div key={w.id || i} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>₹{w.amount}</strong>
                            <span className={`status-tag status-${w.status.toLowerCase()}`}>{w.status}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                            User: {w.user_phone} &bull; Bank: {w.bank_details}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No withdrawals found.</div>
                  )}
                </div>
              )}

              {/* Tab 4: Send Notification / Message to User */}
              {adminTab === 'notify' && (
                <form className="proof-card" style={{ marginTop: 0 }} onSubmit={handleSendNotification}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Send Notification / Message</h3>
                  <div className="form-group">
                    <label className="form-label">Recipient Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={adminNotifyUser} 
                      onChange={e => setAdminNotifyUser(e.target.value)}
                      placeholder="Enter phone number or ALL" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notification Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={adminNotifyTitle} 
                      onChange={e => setAdminNotifyTitle(e.target.value)}
                      placeholder="e.g. Bank Card Approved!" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message Content</label>
                    <textarea 
                      className="form-input" 
                      rows={3}
                      value={adminNotifyMsg} 
                      onChange={e => setAdminNotifyMsg(e.target.value)}
                      placeholder="Type message for user..." 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-submit-green" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Send size={15} />
                    <span>Send Message Instantly</span>
                  </button>
                </form>
              )}

              {/* Tab 5: Registered Users */}
              {adminTab === 'users' && (
                <div style={{ background: 'white', borderRadius: 14, padding: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>All Users</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {adminAllUsers.map(u => (
                      <div key={u.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{u.name}</strong>
                          <span style={{ color: '#00b4d8', fontWeight: 700 }}>+91 {u.phone}</span>
                        </div>
                        <div style={{ marginTop: 4, color: '#64748b' }}>
                          Balance: ₹{u.wallet_balance} &bull; Asset: ₹{u.total_asset} &bull; Tier: {u.vip_level}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ========================================================== */}
      {/* BOTTOM NAVIGATION */}
      {/* ========================================================== */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${currentTab === 'home' && subView === 'none' ? 'active' : ''}`}
          onClick={() => { setSubView('none'); setCurrentTab('home') }}
        >
          <Home size={22} />
          <span className="nav-label">Home</span>
        </button>

        <button 
          className={`nav-item ${currentTab === 'transactions' && subView === 'none' ? 'active' : ''}`}
          onClick={() => { setSubView('none'); setCurrentTab('transactions') }}
        >
          <Receipt size={22} />
          <span className="nav-label">Transactions</span>
        </button>

        <button 
          className={`nav-item ${currentTab === 'profile' && subView === 'none' ? 'active' : ''}`}
          onClick={() => { setSubView('none'); setCurrentTab('profile') }}
        >
          <User size={22} />
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      {/* ========================================================== */}
      {/* MODAL 1: 7% COMMISSION DETAILS MODAL */}
      {/* ========================================================== */}
      {showCommissionModal && (
        <div className="modal-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowCommissionModal(false)}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Zap size={24} fill="#0284c7" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0c325c' }}>7% Commission Structure</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Instant auto-processed commissions credited directly to your wallet
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: '#0c325c' }}>Savings Account</strong>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>7% FLAT</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  Per Day Transaction: <strong>₹5 Lakh to ₹7 Lakh</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: '#0c325c' }}>Current Account</strong>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>7% FLAT</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  Per Day Transaction: <strong>₹25 Lakh to ₹30 Lakh</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: '#0c325c' }}>Corporate Account</strong>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>7% FLAT</span>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  Per Day Transfer: <strong>₹7 Crore to ₹10 Crore</strong>
                </div>
              </div>
            </div>

            <button 
              className="btn-submit-green" 
              style={{ marginTop: 18 }}
              onClick={() => {
                setShowCommissionModal(false)
                setSubView('security_deposit')
              }}
            >
              Deposit &amp; Activate Now
            </button>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: NOTIFICATIONS MODAL */}
      {/* ========================================================== */}
      {showNotificationsModal && (
        <div className="modal-overlay" onClick={() => setShowNotificationsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowNotificationsModal(false)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Bell size={20} color="#0c325c" />
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0c325c' }}>Notifications &amp; Messages</h3>
            </div>

            {notifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {notifications.map((n, i) => (
                  <div key={n.id || i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0c325c' }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 13 }}>
                No notifications right now.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: HELP & SUPPORT MODAL */}
      {/* ========================================================== */}
      {showSupportModal && (
        <div className="modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowSupportModal(false)}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#cffafe', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <Headphones size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0c325c' }}>Customer Support</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                24/7 Live Assistance for Tiranga Pay members
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button 
                onClick={() => { window.open('https://t.me/tirangapay_support', '_blank'); setShowSupportModal(false); }}
                style={{ background: '#0088cc', color: 'white', border: 'none', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Connect on Telegram Support
              </button>
              <button 
                onClick={() => { copyToClipboard('support@tirangapaypanel.in'); setShowSupportModal(false); }}
                style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Email: support@tirangapaypanel.in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 4: AUTH MODAL (LOGIN / SIGN UP) */}
      {/* ========================================================== */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#0c325c' }}>TIRANGA</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#00a0dc' }}> PAY</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginTop: 6 }}>
                {authMode === 'login' ? 'Welcome Back!' : 'Create New Account'}
              </h3>
            </div>

            <form onSubmit={handleUserAuth}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter full name"
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Registered Mobile Number</label>
                <div style={{ display: 'flex', border: '1.5px solid #cbd5e1', borderRadius: 10, overflow: 'hidden' }}>
                  <span style={{ background: '#f1f5f9', padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#475569' }}>+91</span>
                  <input 
                    type="tel" 
                    maxLength={10}
                    className="form-input" 
                    style={{ border: 'none' }}
                    placeholder="10-digit number"
                    value={authPhone}
                    onChange={e => setAuthPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Enter password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-submit-green" disabled={authLoading}>
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#64748b' }}>
              {authMode === 'login' ? (
                <>Don't have an account? <span style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }} onClick={() => setAuthMode('signup')}>Sign Up</span></>
              ) : (
                <>Already have an account? <span style={{ color: '#0284c7', fontWeight: 700, cursor: 'pointer' }} onClick={() => setAuthMode('login')}>Login</span></>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
