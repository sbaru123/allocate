import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import HeroBackground from '@/components/landing/HeroBackground'
import Logo from '@/components/landing/Logo'
import AllocationCard from '@/components/landing/AllocationCard'
import SavedTickerCard from '@/components/landing/SavedTickerCard'

// ── Eye icons ──────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='12' cy='12' r='3' stroke='currentColor' strokeWidth='1.6' />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
      <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
      <path d='M1 1l22 22' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
    </svg>
  )
}

// ── Google glyph ───────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' aria-hidden='true'>
      <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
      <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
      <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05' />
      <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
    </svg>
  )
}

// ── Spinner ────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className='animate-spin' width='16' height='16' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' strokeOpacity='0.25' />
      <path d='M12 2a10 10 0 0 1 10 10' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
    </svg>
  )
}

// ── Password strength ──────────────────────────────────────────
function getStrength(pwd: string): number {
  if (pwd.length === 0) return -1
  if (pwd.length < 8) return 0
  let score = 1
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

const STRENGTH_META = [
  { label: 'Too short', color: '#ef4444' },
  { label: 'Weak',      color: '#ef4444' },
  { label: 'Fair',      color: '#f97316' },
  { label: 'Good',      color: '#eab308' },
  { label: 'Strong',    color: '#22c55e' },
]

// ── Main Signup page ───────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate()

  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState('')
  const [confirmSent, setConfirmSent] = useState(false)

  useEffect(function () {
    supabase.auth.getSession().then(function ({ data: { session } }) {
      if (session) navigate('/home', { replace: true })
    })
  }, [navigate])

  const strength = getStrength(password)
  const meta = strength >= 0 ? STRENGTH_META[strength] : null

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canSubmit = name.trim().length > 0 && emailValid && password.length >= 8 && termsChecked

  // ── Handlers ────────────────────────────────────────────────
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value)
  }

  function handleTermsChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTermsChecked(e.target.checked)
  }

  function toggleShowPassword() {
    setShowPassword(function (prev) { return !prev })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    if (data.session) {
      // Email confirmation not required — go straight to onboarding
      navigate('/onboarding')
    } else {
      // Supabase sent a confirmation email
      setConfirmSent(true)
    }
  }

  async function handleGoogle() {
    if (googleLoading || loading) return
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    setGoogleLoading(false)
  }

  // ── Confirm-sent state ───────────────────────────────────────
  if (confirmSent) {
    return (
      <div className='relative min-h-screen overflow-hidden'>
        <HeroBackground />
        <nav className='relative z-10 flex items-center px-8 py-5'>
          <Logo />
        </nav>
        <div className='relative z-10 flex items-center justify-center min-h-[calc(100vh-72px)] px-6'>
          <div
            className='reveal-up w-full max-w-md rounded-3xl border border-white/60 shadow-2xl p-10 text-center'
            style={{ backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)' }}
          >
            <div className='w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto mb-5'>
              <svg width='28' height='28' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                <path d='M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z' stroke='#0284c7' strokeWidth='1.6' />
                <path d='M22 6l-10 7L2 6' stroke='#0284c7' strokeWidth='1.6' strokeLinecap='round' />
              </svg>
            </div>
            <h1 className='text-2xl font-bold mb-2' style={{ color: 'rgb(15,38,68)' }}>
              Check your inbox
            </h1>
            <p className='text-sm leading-relaxed mb-6' style={{ color: 'rgba(15,38,68,0.62)' }}>
              We sent a confirmation link to <strong style={{ color: 'rgb(15,38,68)' }}>{email}</strong>.
              Click it to verify your address and begin your Allocate onboarding.
            </p>
            <Link
              to='/login'
              className='text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors'
            >
              Back to log in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────────
  return (
    <div className='relative min-h-screen overflow-hidden'>
      <HeroBackground />

      {/* ── Navbar ── */}
      <nav className='relative z-10 flex items-center px-8 py-5'>
        <Logo />
      </nav>

      {/* ── Two-column body ── */}
      <div className='relative z-10 flex items-center justify-center min-h-[calc(100vh-72px)] px-6 py-10'>
        <div className='w-full max-w-5xl grid lg:grid-cols-2 items-center gap-12 lg:gap-20'>

          {/* ── Left: marketing column ── */}
          <div className='hidden lg:flex flex-col gap-7'>

            {/* Badge */}
            <div
              className='reveal-up self-start flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border'
              style={{
                animationDelay: '0.10s',
                color: 'rgb(15,38,68)',
                backgroundColor: 'rgba(255,255,255,0.72)',
                borderColor: 'rgba(15,38,68,0.10)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width='13' height='13' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
                <path d='M7 1 L8.2 5.8 L13 7 L8.2 8.2 L7 13 L5.8 8.2 L1 7 L5.8 5.8 Z' fill='#0284c7' />
              </svg>
              Join 18,000+ interns building wealth
            </div>

            {/* Headline */}
            <h2
              className='reveal-up font-bold leading-[1.08] tracking-tight'
              style={{ animationDelay: '0.20s', color: 'rgb(15,38,68)', fontSize: '40px' }}
            >
              Every dollar, working<br />for you from day one.
            </h2>

            {/* Subhead */}
            <p
              className='reveal-up text-base leading-relaxed max-w-sm'
              style={{ animationDelay: '0.30s', color: 'rgba(15,38,68,0.62)' }}
            >
              Set up your allocations once and Allocate splits every paycheck automatically — investing, savings, and the life you want.
            </p>

            {/* Floating product cards */}
            <div className='reveal-up relative h-[290px]' style={{ animationDelay: '0.42s' }}>
              <div className='card-bob absolute top-0 left-0' style={{ animationDelay: '0.3s' }}>
                <AllocationCard />
              </div>
              <div className='card-bob absolute top-[170px] left-[110px]' style={{ animationDelay: '1.5s' }}>
                <SavedTickerCard />
              </div>
            </div>
          </div>

          {/* ── Right: auth form card ── */}
          <div className='flex justify-center'>
            <div
              className='reveal-up w-full max-w-[420px] rounded-3xl border border-white/60 shadow-2xl p-8'
              style={{
                animationDelay: '0.15s',
                backgroundColor: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Heading */}
              <h1 className='text-2xl font-bold mb-1' style={{ color: 'rgb(15,38,68)' }}>
                Create Your Account
              </h1>
              <p className='text-sm mb-6' style={{ color: 'rgba(15,38,68,0.55)' }}>
                Start putting every dollar to work in two minutes.
              </p>

              {/* Error alert */}
              {error && (
                <div
                  role='alert'
                  className='mb-4 px-4 py-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700'
                >
                  {error}
                </div>
              )}

              {/* Google button */}
              <button
                type='button'
                onClick={handleGoogle}
                disabled={loading || googleLoading}
                className='w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed mb-5'
                style={{
                  color: 'rgb(15,38,68)',
                  borderColor: 'rgba(15,38,68,0.16)',
                  backgroundColor: 'rgba(255,255,255,0.90)',
                }}
              >
                {googleLoading ? <Spinner /> : <GoogleIcon />}
                Sign up with Google
              </button>

              {/* Divider */}
              <div className='flex items-center gap-3 mb-5'>
                <div className='flex-1 h-px' style={{ backgroundColor: 'rgba(15,38,68,0.10)' }} />
                <span className='text-xs font-medium' style={{ color: 'rgba(15,38,68,0.40)' }}>or</span>
                <div className='flex-1 h-px' style={{ backgroundColor: 'rgba(15,38,68,0.10)' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className='flex flex-col gap-4' noValidate>

                {/* Full name */}
                <div>
                  <label
                    htmlFor='signup-name'
                    className='block text-xs font-semibold mb-1.5'
                    style={{ color: 'rgb(15,38,68)' }}
                  >
                    Full name
                  </label>
                  <input
                    id='signup-name'
                    type='text'
                    autoComplete='name'
                    placeholder='Jane Smith'
                    value={name}
                    onChange={handleNameChange}
                    disabled={loading}
                    className='w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 disabled:opacity-50'
                    style={{ borderColor: 'rgba(15,38,68,0.18)', color: 'rgb(15,38,68)' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor='signup-email'
                    className='block text-xs font-semibold mb-1.5'
                    style={{ color: 'rgb(15,38,68)' }}
                  >
                    Email
                  </label>
                  <input
                    id='signup-email'
                    type='email'
                    autoComplete='email'
                    placeholder='example@gmail.com'
                    value={email}
                    onChange={handleEmailChange}
                    disabled={loading}
                    className='w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 disabled:opacity-50'
                    style={{ borderColor: 'rgba(15,38,68,0.18)', color: 'rgb(15,38,68)' }}
                  />
                </div>

                {/* Password + strength meter */}
                <div>
                  <label
                    htmlFor='signup-password'
                    className='block text-xs font-semibold mb-1.5'
                    style={{ color: 'rgb(15,38,68)' }}
                  >
                    Password
                  </label>
                  <div className='relative'>
                    <input
                      id='signup-password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      placeholder='At least 8 characters'
                      value={password}
                      onChange={handlePasswordChange}
                      disabled={loading}
                      className='w-full rounded-xl border px-4 py-3 pr-11 text-sm transition-all focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 disabled:opacity-50'
                      style={{ borderColor: 'rgba(15,38,68,0.18)', color: 'rgb(15,38,68)' }}
                    />
                    <button
                      type='button'
                      onClick={toggleShowPassword}
                      className='absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-colors'
                      style={{ color: 'rgba(15,38,68,0.45)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  {/* Strength meter — always reserves height to prevent layout shift */}
                  <div className='mt-2 h-[28px]'>
                    {strength >= 0 && meta && (
                      <div>
                        <div className='flex gap-1 mb-1'>
                          {[0, 1, 2, 3].map(function (i) {
                            const filled = strength === 0 ? false : i < strength
                            return (
                              <div
                                key={i}
                                className='flex-1 h-1 rounded-full transition-all duration-300'
                                style={{
                                  backgroundColor: filled ? meta.color : 'rgba(15,38,68,0.10)',
                                }}
                              />
                            )
                          })}
                        </div>
                        <p className='text-[11px] font-semibold transition-colors' style={{ color: meta.color }}>
                          {meta.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms checkbox */}
                <label className='flex items-start gap-3 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    checked={termsChecked}
                    onChange={handleTermsChange}
                    className='mt-0.5 w-4 h-4 rounded border accent-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer flex-shrink-0'
                  />
                  <span className='text-xs leading-relaxed' style={{ color: 'rgba(15,38,68,0.62)' }}>
                    I agree to Allocate&apos;s{' '}
                    <a href='#' className='font-semibold text-sky-600 hover:text-sky-700 transition-colors'>
                      Terms
                    </a>{' '}
                    and{' '}
                    <a href='#' className='font-semibold text-sky-600 hover:text-sky-700 transition-colors'>
                      Privacy Policy
                    </a>.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type='submit'
                  disabled={!canSubmit || loading}
                  className='w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-1'
                  style={{
                    backgroundColor: canSubmit && !loading ? '#0284c7' : '#9fb6cf',
                    boxShadow: canSubmit && !loading ? '0 4px 14px rgba(2,132,199,0.35)' : 'none',
                    cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create Account
                      <span className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                        <svg width='9' height='9' viewBox='0 0 9 9' fill='none' aria-hidden='true'>
                          <path d='M2 7 L7 2 M3.5 2 H7 V5.5' stroke='white' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <p className='text-center text-sm mt-6' style={{ color: 'rgba(15,38,68,0.52)' }}>
                Already have an account?{' '}
                <Link
                  to='/login'
                  className='font-semibold text-sky-600 hover:text-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded'
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
