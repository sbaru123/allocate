import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import HeroBackground from '@/components/landing/HeroBackground'
import Logo from '@/components/landing/Logo'
import AllocationCard from '@/components/landing/AllocationCard'
import ProjectionCard from '@/components/landing/ProjectionCard'
import SafeToSpendCard from '@/components/landing/SafeToSpendCard'
import SavedTickerCard from '@/components/landing/SavedTickerCard'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(function () {
    supabase.auth.getSession().then(function ({ data: { session } }) {
      if (session) navigate('/home', { replace: true })
    })
  }, [navigate])

  return (
    <div className='relative min-h-screen overflow-hidden'>
      <HeroBackground />

      {/* ── Navbar ── */}
      <nav className='relative z-20 flex items-center justify-between px-8 py-5'>
        <Logo />

        {/* Center links — md+ */}
        <div className='hidden md:flex items-center gap-7'>
          {['Features', 'How it works', 'Pricing'].map(function (label) {
            return (
              <a
                key={label}
                href='#'
                className='text-sm font-medium transition-colors hover:text-sky-700'
                style={{ color: 'rgba(15,38,68,0.62)' }}
              >
                {label}
              </a>
            )
          })}
        </div>

        {/* Right CTAs */}
        <div className='flex items-center gap-2.5'>
          <Link
            to='/login'
            className='text-sm font-semibold px-4 py-1.5 rounded-full border transition-all hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
            style={{
              color: 'rgb(15,38,68)',
              borderColor: 'rgba(15,38,68,0.16)',
              backgroundColor: 'rgba(255,255,255,0.60)',
            }}
          >
            Log in
          </Link>
          <Link
            to='/signup'
            className='flex items-center gap-2 text-sm font-semibold px-4 py-1.5 rounded-full bg-sky-600 text-white hover:bg-sky-700 transition-all hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
          >
            Get Started
            <span className='w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
              <svg width='8' height='8' viewBox='0 0 8 8' fill='none' aria-hidden='true'>
                <path d='M1.5 6.5 L6.5 1.5 M3 1.5 H6.5 V5' stroke='white' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </span>
          </Link>
        </div>
      </nav>

      {/* ── Floating product cards (lg+) ── */}
      <div className='hidden lg:block'>
        <div className='card-reveal-tl absolute top-20 left-10 xl:left-16 z-10' style={{ animationDelay: '0.55s' }}>
          <div className='card-bob' style={{ animationDelay: '0.5s' }}>
            <ProjectionCard />
          </div>
        </div>
        <div className='card-reveal-tr absolute top-20 right-10 xl:right-16 z-10' style={{ animationDelay: '0.75s' }}>
          <div className='card-bob' style={{ animationDelay: '1.2s' }}>
            <AllocationCard />
          </div>
        </div>
        <div className='card-reveal-bl absolute bottom-10 left-10 xl:left-16 z-10' style={{ animationDelay: '0.65s' }}>
          <div className='card-bob' style={{ animationDelay: '2.5s' }}>
            <SafeToSpendCard />
          </div>
        </div>
        <div className='card-reveal-br absolute bottom-10 right-10 xl:right-16 z-10' style={{ animationDelay: '0.85s' }}>
          <div className='card-bob' style={{ animationDelay: '1.8s' }}>
            <SavedTickerCard />
          </div>
        </div>
      </div>

      {/* ── Hero center content ── */}
      <div className='relative z-20 flex flex-col items-center justify-center text-center px-6 gap-5 min-h-[calc(100vh-72px)]'>
        {/* Badge */}
        <div
          className='reveal-up flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border'
          style={{
            animationDelay: '0.15s',
            color: 'rgb(15,38,68)',
            backgroundColor: 'rgba(255,255,255,0.70)',
            borderColor: 'rgba(15,38,68,0.10)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width='13' height='13' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
            <path d='M7 1 L8.2 5.8 L13 7 L8.2 8.2 L7 13 L5.8 8.2 L1 7 L5.8 5.8 Z' fill='#0284c7' />
          </svg>
          Built-in AllocateAI · your wealth assistant
        </div>

        {/* Headline */}
        <h1
          className='reveal-up font-bold tracking-tight leading-[1.06] text-4xl sm:text-5xl xl:text-[64px]'
          style={{ animationDelay: '0.28s', color: 'rgb(15,38,68)' }}
        >
          Every dollar,<br />working for you.
        </h1>

        {/* Subhead */}
        <p
          className='reveal-up text-base sm:text-lg max-w-xl leading-relaxed'
          style={{ animationDelay: '0.42s', color: 'rgba(15,38,68,0.62)' }}
        >
          Allocate splits every paycheck into the goals that build real wealth — investing, savings, and the life you want — automatically.
        </p>

        {/* CTAs */}
        <div className='reveal-up flex flex-col sm:flex-row items-center gap-3' style={{ animationDelay: '0.55s' }}>
          <Link
            to='/signup'
            className='flex items-center gap-2.5 px-6 py-3 rounded-full bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 shadow-md shadow-sky-200/70 transition-all hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
          >
            Get Started — it&apos;s free
            <span className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
              <svg width='9' height='9' viewBox='0 0 9 9' fill='none' aria-hidden='true'>
                <path d='M2 7 L7 2 M3.5 2 H7 V5.5' stroke='white' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </span>
          </Link>
          <Link
            to='/login'
            className='px-6 py-3 rounded-full text-sm font-semibold border transition-all hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
            style={{
              color: 'rgb(15,38,68)',
              backgroundColor: 'rgba(255,255,255,0.75)',
              borderColor: 'rgba(15,38,68,0.15)',
            }}
          >
            Log in
          </Link>
        </div>

        {/* Trust line */}
        <p
          className='reveal-up text-xs'
          style={{ animationDelay: '0.68s', color: 'rgba(15,38,68,0.42)' }}
        >
          No fees · Bank-grade security · Join 20,000+ students
        </p>
      </div>
    </div>
  )
}
