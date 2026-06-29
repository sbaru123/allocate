import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import HeroBackground from '@/components/landing/HeroBackground'
import Logo from '@/components/landing/Logo'
import SegBar from '@/components/SegBar'
import type { SegBucket } from '@/components/SegBar'
import { useCountUp } from '@/hooks/useCountUp'

// ── Types ─────────────────────────────────────────────────────
type PayFrequency = 'weekly' | 'biweekly' | 'monthly'

interface BreakdownItem {
  name: string
  amount: number
}

interface ProfilePayload {
  id: string
  onboarding_step: number
  onboarding_completed: boolean
  pay_frequency: PayFrequency
  paycheck_amount: number
  buckets: SegBucket[]
  weekly_budget: number
  weekly_breakdown: BreakdownItem[]
  goal: { name: string; amount: number; month: number; year: number } | null
}

// ── Constants ─────────────────────────────────────────────────
const DEFAULT_BUCKETS: SegBucket[] = [
  { name: 'Investing', color: '#0284c7', percent: 40 },
  { name: 'Savings',   color: '#34d399', percent: 25 },
  { name: 'Lifestyle', color: '#a78bfa', percent: 20 },
  { name: 'Giving',    color: '#fb923c', percent: 15 },
]

const DEFAULT_BREAKDOWN: BreakdownItem[] = [
  { name: 'Food',          amount: 0 },
  { name: 'Transport',     amount: 0 },
  { name: 'Entertainment', amount: 0 },
  { name: 'Other',         amount: 0 },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const FREQ_SUBLABELS: Record<PayFrequency, string> = {
  weekly: 'each week',
  biweekly: 'each pay period',
  monthly: 'each month',
}

const FREQ_MULTIPLIERS: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
}

const TOTAL_STEPS = 4

// ── Helpers ───────────────────────────────────────────────────
function sumPct(buckets: SegBucket[]): number {
  return buckets.reduce(function (s, b) { return s + b.percent }, 0)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ── Sub-components ────────────────────────────────────────────

function Spinner() {
  return (
    <svg className='animate-spin' width='16' height='16' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' strokeOpacity='0.25' />
      <path d='M12 2a10 10 0 0 1 10 10' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
    </svg>
  )
}

function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className='flex items-center gap-1.5' aria-hidden='true'>
      {Array.from({ length: total }, function (_, i) {
        const done = i < step - 1
        const active = i === step - 1
        return (
          <div
            key={i}
            className='h-1.5 rounded-full transition-all duration-500'
            style={{
              width: active ? '24px' : '8px',
              backgroundColor: done || active ? '#0284c7' : 'rgba(15,38,68,0.12)',
            }}
          />
        )
      })}
    </div>
  )
}

// Step 1
function Step1({
  payFrequency,
  paycheckAmount,
  onFreqChange,
  onAmountChange,
}: {
  payFrequency: PayFrequency
  paycheckAmount: string
  onFreqChange: (v: PayFrequency) => void
  onAmountChange: (v: string) => void
}) {
  const freqs: Array<{ value: PayFrequency; label: string }> = [
    { value: 'weekly',   label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly',  label: 'Monthly' },
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <p className='text-xs font-semibold mb-2.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
          Pay frequency
        </p>
        <div
          className='flex rounded-full p-1 gap-1'
          style={{ backgroundColor: 'rgba(15,38,68,0.06)' }}
          role='group'
          aria-label='Pay frequency'
        >
          {freqs.map(function (f) {
            const sel = payFrequency === f.value
            return (
              <button
                key={f.value}
                type='button'
                onClick={function () { onFreqChange(f.value) }}
                className='flex-1 rounded-full py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                style={{
                  backgroundColor: sel ? 'white' : 'transparent',
                  color: sel ? 'rgb(15,38,68)' : 'rgba(15,38,68,0.50)',
                  boxShadow: sel ? '0 1px 4px rgba(15,38,68,0.14)' : 'none',
                }}
                aria-pressed={sel}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className='text-xs font-semibold mb-2.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
          Net paycheck (after tax)
        </p>
        <div
          className='flex items-center rounded-2xl border px-5 py-4 gap-2 transition-all focus-within:ring-4 focus-within:ring-sky-100 focus-within:border-sky-400'
          style={{ borderColor: 'rgba(15,38,68,0.16)' }}
        >
          <span className='text-2xl font-bold select-none' style={{ color: 'rgba(15,38,68,0.28)' }}>$</span>
          <input
            type='number'
            min='1'
            placeholder='0'
            value={paycheckAmount}
            onChange={function (e) { onAmountChange(e.target.value) }}
            className='flex-1 text-2xl font-bold bg-transparent focus:outline-none'
            style={{ color: 'rgb(15,38,68)' }}
            aria-label='Net paycheck amount'
          />
        </div>
        <p className='text-xs mt-2' style={{ color: 'rgba(15,38,68,0.42)' }}>
          What you take home {FREQ_SUBLABELS[payFrequency]}
        </p>
      </div>
    </div>
  )
}

// Step 2
function Step2({
  buckets,
  onNameChange,
  onPercentChange,
}: {
  buckets: SegBucket[]
  onNameChange: (i: number, v: string) => void
  onPercentChange: (i: number, delta: number) => void
}) {
  const total = sumPct(buckets)
  const exact = total === 100

  return (
    <div className='flex flex-col gap-4'>
      {/* Live allocation bar */}
      <div>
        <SegBar buckets={buckets} />
        <p
          className='text-xs font-semibold mt-1.5 text-right transition-colors'
          style={{ color: exact ? '#22c55e' : '#ef4444' }}
        >
          {total}% of 100%
        </p>
      </div>

      {/* Bucket rows */}
      <div className='flex flex-col gap-2'>
        {buckets.map(function (b, i) {
          return (
            <div key={i} className='flex items-center gap-2.5'>
              <div className='w-3 h-3 rounded-full flex-shrink-0' style={{ backgroundColor: b.color }} />
              <input
                type='text'
                value={b.name}
                onChange={function (e) { onNameChange(i, e.target.value) }}
                className='flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition-all'
                style={{ borderColor: 'rgba(15,38,68,0.14)', color: 'rgb(15,38,68)' }}
                aria-label={`Bucket ${i + 1} name`}
              />
              <div className='flex items-center gap-1 flex-shrink-0'>
                <button
                  type='button'
                  onClick={function () { onPercentChange(i, -5) }}
                  className='w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-all hover:scale-[1.06] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  style={{ backgroundColor: 'rgba(15,38,68,0.06)', color: 'rgb(15,38,68)' }}
                  aria-label={`Decrease ${b.name} by 5%`}
                >
                  −
                </button>
                <input
                  type='number'
                  value={b.percent}
                  onChange={function (e) {
                    const v = clamp(parseInt(e.target.value) || 0, 0, 100)
                    onPercentChange(i, v - b.percent)
                  }}
                  className='w-12 text-center rounded-lg border px-1 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400'
                  style={{ borderColor: 'rgba(15,38,68,0.14)', color: 'rgb(15,38,68)' }}
                  min='0'
                  max='100'
                  aria-label={`${b.name} percentage`}
                />
                <button
                  type='button'
                  onClick={function () { onPercentChange(i, 5) }}
                  className='w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-all hover:scale-[1.06] active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
                  style={{ backgroundColor: 'rgba(15,38,68,0.06)', color: 'rgb(15,38,68)' }}
                  aria-label={`Increase ${b.name} by 5%`}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {!exact && (
        <p
          className='text-xs px-3 py-2 rounded-xl'
          style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#b45309' }}
        >
          {total > 100
            ? `${total - 100}% over — reduce a bucket to reach 100%`
            : `${100 - total}% remaining — add it to a bucket to continue`}
        </p>
      )}
    </div>
  )
}

// Step 3
function Step3({
  weeklyBudget,
  showBreakdown,
  breakdown,
  onBudgetChange,
  onToggleBreakdown,
  onBreakdownNameChange,
  onBreakdownAmountChange,
}: {
  weeklyBudget: string
  showBreakdown: boolean
  breakdown: BreakdownItem[]
  onBudgetChange: (v: string) => void
  onToggleBreakdown: () => void
  onBreakdownNameChange: (i: number, v: string) => void
  onBreakdownAmountChange: (i: number, v: string) => void
}) {
  const budget = parseFloat(weeklyBudget) || 0
  const bdTotal = breakdown.reduce(function (s, b) { return s + b.amount }, 0)
  const bdDiff = bdTotal - budget

  return (
    <div className='flex flex-col gap-5'>
      {/* Big budget input */}
      <div
        className='flex items-center rounded-2xl border px-5 py-4 gap-2 transition-all focus-within:ring-4 focus-within:ring-sky-100 focus-within:border-sky-400'
        style={{ borderColor: 'rgba(15,38,68,0.16)' }}
      >
        <span className='text-2xl font-bold select-none' style={{ color: 'rgba(15,38,68,0.28)' }}>$</span>
        <input
          type='number'
          min='1'
          placeholder='0'
          value={weeklyBudget}
          onChange={function (e) { onBudgetChange(e.target.value) }}
          className='flex-1 text-2xl font-bold bg-transparent focus:outline-none'
          style={{ color: 'rgb(15,38,68)' }}
          aria-label='Weekly spending budget'
        />
        <span className='text-sm font-medium' style={{ color: 'rgba(15,38,68,0.35)' }}>/week</span>
      </div>

      {/* Quick-pick chips */}
      <div className='flex gap-2'>
        {(['150', '250', '400'] as const).map(function (v) {
          const sel = weeklyBudget === v
          return (
            <button
              key={v}
              type='button'
              onClick={function () { onBudgetChange(v) }}
              className='flex-1 rounded-full py-2 text-sm font-semibold border transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              style={{
                backgroundColor: sel ? '#0284c7' : 'rgba(255,255,255,0.80)',
                color: sel ? 'white' : 'rgb(15,38,68)',
                borderColor: sel ? '#0284c7' : 'rgba(15,38,68,0.14)',
              }}
            >
              ${v}
            </button>
          )
        })}
      </div>

      {/* Optional breakdown */}
      <div>
        <button
          type='button'
          onClick={onToggleBreakdown}
          className='text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded'
        >
          {showBreakdown ? '− Hide category breakdown' : '+ Add category breakdown'}
        </button>

        {showBreakdown && (
          <div className='mt-3 flex flex-col gap-2'>
            {breakdown.map(function (item, i) {
              return (
                <div key={i} className='flex items-center gap-2'>
                  <input
                    type='text'
                    value={item.name}
                    onChange={function (e) { onBreakdownNameChange(i, e.target.value) }}
                    className='flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400'
                    style={{ borderColor: 'rgba(15,38,68,0.14)', color: 'rgb(15,38,68)' }}
                    aria-label={`Category ${i + 1} name`}
                  />
                  <div className='flex items-center gap-1 border rounded-lg px-3 py-2' style={{ borderColor: 'rgba(15,38,68,0.14)' }}>
                    <span className='text-sm select-none' style={{ color: 'rgba(15,38,68,0.35)' }}>$</span>
                    <input
                      type='number'
                      min='0'
                      value={item.amount || ''}
                      onChange={function (e) { onBreakdownAmountChange(i, e.target.value) }}
                      className='w-16 text-sm font-medium bg-transparent focus:outline-none'
                      style={{ color: 'rgb(15,38,68)' }}
                      aria-label={`${item.name} amount`}
                    />
                  </div>
                </div>
              )
            })}
            {budget > 0 && (
              <p
                className='text-xs font-semibold mt-1'
                style={{
                  color: Math.abs(bdDiff) < 0.01 ? '#22c55e' : bdDiff > 0 ? '#ef4444' : '#b45309',
                }}
              >
                Breakdown: ${bdTotal.toFixed(0)} of ${budget.toFixed(0)}
                {Math.abs(bdDiff) < 0.01 && ' — matches ✓'}
                {bdDiff > 0.01 && ` — $${bdDiff.toFixed(0)} over budget`}
                {bdDiff < -0.01 && ` — $${Math.abs(bdDiff).toFixed(0)} remaining`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Step 4
function Step4({
  goalName,
  goalAmount,
  goalMonth,
  goalYear,
  onNameChange,
  onAmountChange,
  onMonthChange,
  onYearChange,
}: {
  goalName: string
  goalAmount: string
  goalMonth: number
  goalYear: number
  onNameChange: (v: string) => void
  onAmountChange: (v: string) => void
  onMonthChange: (v: number) => void
  onYearChange: (v: number) => void
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, function (_, i) { return currentYear + i })

  return (
    <div className='flex flex-col gap-4'>
      <div>
        <label className='block text-xs font-semibold mb-1.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
          Goal name
        </label>
        <input
          type='text'
          placeholder='Emergency fund, Europe trip, new laptop…'
          value={goalName}
          onChange={function (e) { onNameChange(e.target.value) }}
          className='w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all'
          style={{ borderColor: 'rgba(15,38,68,0.16)', color: 'rgb(15,38,68)' }}
        />
      </div>

      <div>
        <label className='block text-xs font-semibold mb-1.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
          Target amount
        </label>
        <div
          className='flex items-center rounded-xl border px-4 py-3 gap-2 transition-all focus-within:ring-4 focus-within:ring-sky-100 focus-within:border-sky-400'
          style={{ borderColor: 'rgba(15,38,68,0.16)' }}
        >
          <span className='text-sm font-medium select-none' style={{ color: 'rgba(15,38,68,0.35)' }}>$</span>
          <input
            type='number'
            min='1'
            placeholder='5,000'
            value={goalAmount}
            onChange={function (e) { onAmountChange(e.target.value) }}
            className='flex-1 text-sm font-semibold bg-transparent focus:outline-none'
            style={{ color: 'rgb(15,38,68)' }}
          />
        </div>
      </div>

      <div>
        <label className='block text-xs font-semibold mb-1.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
          Target date
        </label>
        <div className='flex gap-2'>
          <select
            value={goalMonth}
            onChange={function (e) { onMonthChange(parseInt(e.target.value)) }}
            className='flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all cursor-pointer'
            style={{ borderColor: 'rgba(15,38,68,0.16)', color: 'rgb(15,38,68)' }}
          >
            {MONTHS.map(function (m, i) {
              return <option key={m} value={i + 1}>{m}</option>
            })}
          </select>
          <select
            value={goalYear}
            onChange={function (e) { onYearChange(parseInt(e.target.value)) }}
            className='w-28 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all cursor-pointer'
            style={{ borderColor: 'rgba(15,38,68,0.16)', color: 'rgb(15,38,68)' }}
          >
            {years.map(function (y) {
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      </div>
    </div>
  )
}

// Success screen
function SuccessScreen({
  firstName,
  projectedAmount,
  investBucket,
  onComplete,
  completing,
}: {
  firstName: string
  projectedAmount: number
  investBucket: SegBucket
  onComplete: () => void
  completing: boolean
}) {
  const counted = useCountUp(projectedAmount, 2000, 500)

  return (
    <div className='flex flex-col items-center text-center gap-6 py-4'>
      {/* Check + pulse ring */}
      <div className='relative w-20 h-20 flex items-center justify-center'>
        <div
          className='ring-pulse absolute inset-0 rounded-full'
          style={{ backgroundColor: 'rgba(52,211,153,0.22)' }}
        />
        <div
          className='popcheck relative w-20 h-20 rounded-full flex items-center justify-center'
          style={{ background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' }}
        >
          <svg width='36' height='36' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
            <path d='M5 12l5 5L19 7' stroke='white' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
      </div>

      <div>
        <h1 className='text-2xl font-bold mb-1.5' style={{ color: 'rgb(15,38,68)' }}>
          You&apos;re all set{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className='text-sm leading-relaxed' style={{ color: 'rgba(15,38,68,0.62)' }}>
          Your allocations are live. Every paycheck will now flow exactly where you told it to.
        </p>
      </div>

      {/* Projection card */}
      <div
        className='w-full rounded-2xl p-5 text-left'
        style={{ background: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)' }}
      >
        <p className='text-xs font-semibold uppercase tracking-wide mb-1' style={{ color: 'rgba(255,255,255,0.65)' }}>
          Projected in 5 years
        </p>
        <p className='text-3xl font-bold text-white'>
          ${counted.toLocaleString()}
        </p>
        <p className='text-xs mt-1' style={{ color: 'rgba(255,255,255,0.60)' }}>
          Based on {investBucket.percent}% toward {investBucket.name} each paycheck
        </p>
      </div>

      {/* CTA */}
      <button
        type='button'
        onClick={onComplete}
        disabled={completing}
        className='w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none'
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)',
          boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
          opacity: completing ? 0.8 : 1,
        }}
      >
        {completing ? (
          <Spinner />
        ) : (
          <>
            Go to my dashboard
            <span className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
              <svg width='9' height='9' viewBox='0 0 9 9' fill='none' aria-hidden='true'>
                <path d='M2 7L7 2M3.5 2H7V5.5' stroke='white' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            </span>
          </>
        )}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()

  // Auth
  const [userId, setUserId]     = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading]   = useState(true)

  // Wizard position
  const [step, setStep]     = useState(1)
  const [success, setSuccess] = useState(false)

  // Step 1
  const [payFrequency, setPayFrequency]       = useState<PayFrequency>('biweekly')
  const [paycheckAmount, setPaycheckAmount]   = useState('')

  // Step 2
  const [buckets, setBuckets] = useState<SegBucket[]>(DEFAULT_BUCKETS)

  // Step 3
  const [weeklyBudget, setWeeklyBudget]       = useState('')
  const [showBreakdown, setShowBreakdown]     = useState(false)
  const [breakdown, setBreakdown]             = useState<BreakdownItem[]>(DEFAULT_BREAKDOWN)

  // Step 4
  const [goalName, setGoalName]       = useState('')
  const [goalAmount, setGoalAmount]   = useState('')
  const [goalMonth, setGoalMonth]     = useState(new Date().getMonth() + 1)
  const [goalYear, setGoalYear]       = useState(new Date().getFullYear() + 1)

  // Completion
  const [completing, setCompleting] = useState(false)

  // Projection for success screen (calculated before hooks)
  const investBucket = buckets.find(function (b) { return b.name === 'Investing' }) || buckets[0]
  const annualPaychecks = FREQ_MULTIPLIERS[payFrequency]
  const annualInvesting = (parseFloat(paycheckAmount) || 0) * annualPaychecks * (investBucket.percent / 100)
  const fiveYearProjected = Math.round(annualInvesting * 5 * 1.35)

  // ── Hydrate saved progress ──────────────────────────────────
  function hydrateFromData(d: Record<string, unknown>) {
    if (d.pay_frequency) setPayFrequency(d.pay_frequency as PayFrequency)
    if (d.paycheck_amount) setPaycheckAmount(String(d.paycheck_amount))
    if (Array.isArray(d.buckets) && d.buckets.length > 0) setBuckets(d.buckets as SegBucket[])
    if (d.weekly_budget) setWeeklyBudget(String(d.weekly_budget))
    if (Array.isArray(d.weekly_breakdown) && d.weekly_breakdown.length > 0) {
      setBreakdown(d.weekly_breakdown as BreakdownItem[])
    }
    if (d.goal && typeof d.goal === 'object') {
      const g = d.goal as { name?: string; amount?: number; month?: number; year?: number }
      if (g.name)   setGoalName(g.name)
      if (g.amount) setGoalAmount(String(g.amount))
      if (g.month)  setGoalMonth(g.month)
      if (g.year)   setGoalYear(g.year)
    }
    if (typeof d.onboarding_step === 'number' && d.onboarding_step > 1) {
      setStep(d.onboarding_step)
    }
  }

  // ── Auth check + hydrate on mount ──────────────────────────
  useEffect(function () {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      const user = session.user
      setUserId(user.id)
      const fullName = (user.user_metadata?.full_name as string) || ''
      setFirstName(fullName.split(' ')[0] || '')

      // Try profiles table first
      let hydratedFromDb = false
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.onboarding_completed) {
          navigate('/home', { replace: true })
          return
        }
        hydrateFromData(profile as Record<string, unknown>)
        hydratedFromDb = true
      }

      // Fall back to localStorage
      if (!hydratedFromDb) {
        const lsRaw = localStorage.getItem(`allocate_ob_${user.id}`)
        if (lsRaw) {
          try {
            const lsData = JSON.parse(lsRaw) as Record<string, unknown>
            if (lsData.onboarding_completed) {
              navigate('/home', { replace: true })
              return
            }
            hydrateFromData(lsData)
          } catch {
            // Corrupt data — start fresh
          }
        }
      }

      setLoading(false)
    }

    init()
  }, [navigate])

  // ── Auto-save (debounced) ───────────────────────────────────
  useEffect(function () {
    if (!userId) return

    const timer = setTimeout(async function () {
      const payload: ProfilePayload = {
        id: userId,
        onboarding_step: step,
        onboarding_completed: false,
        pay_frequency: payFrequency,
        paycheck_amount: parseFloat(paycheckAmount) || 0,
        buckets,
        weekly_budget: parseFloat(weeklyBudget) || 0,
        weekly_breakdown: breakdown,
        goal: goalName
          ? { name: goalName, amount: parseFloat(goalAmount) || 0, month: goalMonth, year: goalYear }
          : null,
      }

      localStorage.setItem(`allocate_ob_${userId}`, JSON.stringify(payload))
      await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    }, 500)

    return function () { clearTimeout(timer) }
  }, [userId, step, payFrequency, paycheckAmount, buckets, weeklyBudget, breakdown, goalName, goalAmount, goalMonth, goalYear])

  // ── Handlers: Step 1 ───────────────────────────────────────
  function handleFreqChange(v: PayFrequency) { setPayFrequency(v) }
  function handleAmountChange(v: string)     { setPaycheckAmount(v) }

  // ── Handlers: Step 2 ───────────────────────────────────────
  function handleBucketNameChange(i: number, v: string) {
    setBuckets(function (prev) {
      const next = [...prev]
      next[i] = { ...next[i], name: v }
      return next
    })
  }

  function handleBucketPercentChange(i: number, delta: number) {
    setBuckets(function (prev) {
      const next = [...prev]
      next[i] = { ...next[i], percent: clamp(next[i].percent + delta, 0, 100) }
      return next
    })
  }

  // ── Handlers: Step 3 ───────────────────────────────────────
  function handleWeeklyBudgetChange(v: string)          { setWeeklyBudget(v) }
  function handleToggleBreakdown()                       { setShowBreakdown(function (p) { return !p }) }
  function handleBreakdownNameChange(i: number, v: string) {
    setBreakdown(function (prev) {
      const next = [...prev]
      next[i] = { ...next[i], name: v }
      return next
    })
  }
  function handleBreakdownAmountChange(i: number, v: string) {
    setBreakdown(function (prev) {
      const next = [...prev]
      next[i] = { ...next[i], amount: parseFloat(v) || 0 }
      return next
    })
  }

  // ── Handlers: Step 4 ───────────────────────────────────────
  function handleGoalNameChange(v: string)   { setGoalName(v) }
  function handleGoalAmountChange(v: string) { setGoalAmount(v) }
  function handleGoalMonthChange(v: number)  { setGoalMonth(v) }
  function handleGoalYearChange(v: number)   { setGoalYear(v) }

  // ── Validity ───────────────────────────────────────────────
  function isValid(s: number): boolean {
    if (s === 1) return parseFloat(paycheckAmount) > 0
    if (s === 2) return sumPct(buckets) === 100
    if (s === 3) return parseFloat(weeklyBudget) > 0
    return true
  }

  // ── Navigation ─────────────────────────────────────────────
  function handleBack() {
    if (step > 1) setStep(function (p) { return p - 1 })
  }

  function handleContinue() {
    if (!isValid(step)) return
    if (step < TOTAL_STEPS) {
      setStep(function (p) { return p + 1 })
    } else {
      setSuccess(true)
    }
  }

  function handleSkipGoal() {
    setGoalName('')
    setGoalAmount('')
    setSuccess(true)
  }

  async function handleComplete() {
    if (completing) return
    setCompleting(true)

    const amount = parseFloat(paycheckAmount) || 0

    const payload: ProfilePayload = {
      id: userId,
      onboarding_step: TOTAL_STEPS,
      onboarding_completed: true,
      pay_frequency: payFrequency,
      paycheck_amount: amount,
      buckets,
      weekly_budget: parseFloat(weeklyBudget) || 0,
      weekly_breakdown: breakdown,
      goal: goalName
        ? { name: goalName, amount: parseFloat(goalAmount) || 0, month: goalMonth, year: goalYear }
        : null,
    }

    localStorage.setItem(`allocate_ob_${userId}`, JSON.stringify(payload))

    // Save to profiles
    const profileRes = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (profileRes.error) console.error('[onboarding] profiles upsert:', profileRes.error)

    // Budgets — delete first then insert to avoid unique constraint issues
    const budgetDel = await supabase.from('budgets').delete().eq('user_id', userId)
    if (budgetDel.error) console.error('[onboarding] budgets delete:', budgetDel.error)

    const budgetIns = await supabase.from('budgets').insert({ user_id: userId, pay_frequency: payFrequency, weekly_budget: parseFloat(weeklyBudget) || 0 })
    if (budgetIns.error) console.error('[onboarding] budgets insert:', budgetIns.error)

    // Initial paycheck
    const paycheckIns = await supabase.from('paychecks').insert({ user_id: userId, amount, note: 'Initial paycheck' })
    if (paycheckIns.error) console.error('[onboarding] paychecks insert:', paycheckIns.error)

    // Allocations — delete then re-insert
    const allocDel = await supabase.from('allocations').delete().eq('user_id', userId)
    if (allocDel.error) console.error('[onboarding] allocations delete:', allocDel.error)

    const allocIns = await supabase.from('allocations').insert(
      buckets.map(function (b) {
        return { user_id: userId, label: b.name, percentage: b.percent }
      })
    )
    if (allocIns.error) console.error('[onboarding] allocations insert:', allocIns.error)

    navigate('/home', { replace: true })
  }

  // ── Step titles / subtitles ────────────────────────────────
  const STEP_TITLES: Record<number, string> = {
    1: "Let's start with your paycheck.",
    2: 'How do you want to split your money?',
    3: "What's your weekly spending budget?",
    4: 'What are you saving toward?',
  }

  const STEP_SUBS: Record<number, string> = {
    1: "We'll use this to calculate how much flows into each bucket every pay period.",
    2: "We'll divide every paycheck across these buckets automatically. You can rename and adjust any time.",
    3: 'This sets your weekly expense limit — food, transport, and daily life.',
    4: "Add a goal and we'll show your progress on the dashboard.",
  }

  // ── Loading splash ─────────────────────────────────────────
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: '#f4f7fb' }}>
        <div
          className='w-8 h-8 rounded-full border-2 border-t-transparent animate-spin'
          style={{ borderColor: '#0284c7', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className='relative min-h-screen overflow-hidden'>
      <HeroBackground />

      {/* Brand bar */}
      <nav className='relative z-10 flex items-center justify-between px-8 py-5'>
        <Logo />
        {!success && (
          <div
            className='flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border'
            style={{
              color: 'rgb(15,38,68)',
              backgroundColor: 'rgba(255,255,255,0.72)',
              borderColor: 'rgba(15,38,68,0.10)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width='12' height='12' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
              <path d='M7 1L8.2 5.8L13 7L8.2 8.2L7 13L5.8 8.2L1 7L5.8 5.8Z' fill='#0284c7' />
            </svg>
            Setting up your account
          </div>
        )}
      </nav>

      {/* Centered step-card */}
      <div className='relative z-10 flex items-center justify-center min-h-[calc(100vh-72px)] px-6 py-10'>
        <div
          key={success ? 'success' : step}
          className='reveal-up w-full max-w-[460px] rounded-3xl border border-white/60 shadow-2xl p-8'
          style={{ backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)' }}
        >
          {success ? (
            <SuccessScreen
              firstName={firstName}
              projectedAmount={fiveYearProjected}
              investBucket={investBucket}
              onComplete={handleComplete}
              completing={completing}
            />
          ) : (
            <>
              {/* Step header */}
              <div className='flex items-center justify-between mb-6'>
                <button
                  type='button'
                  onClick={handleBack}
                  disabled={step === 1}
                  className='flex items-center gap-1 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded disabled:opacity-0 disabled:pointer-events-none'
                  style={{ color: 'rgba(15,38,68,0.50)' }}
                  aria-label='Go back'
                >
                  <svg width='14' height='14' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
                    <path d='M10 3L5 8l5 5' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                  Back
                </button>

                <div className='flex items-center gap-2.5'>
                  <span className='sr-only'>Step {step} of {TOTAL_STEPS}</span>
                  <StepProgress step={step} total={TOTAL_STEPS} />
                  <span className='text-xs font-medium' style={{ color: 'rgba(15,38,68,0.38)' }}>
                    {step}/{TOTAL_STEPS}
                  </span>
                </div>
              </div>

              {/* Title + subtitle */}
              <div className='mb-6'>
                <h2 className='text-[22px] font-bold mb-1.5 leading-tight' style={{ color: 'rgb(15,38,68)' }}>
                  {STEP_TITLES[step]}
                </h2>
                <p className='text-sm leading-relaxed' style={{ color: 'rgba(15,38,68,0.60)' }}>
                  {STEP_SUBS[step]}
                </p>
              </div>

              {/* Step fields */}
              {step === 1 && (
                <Step1
                  payFrequency={payFrequency}
                  paycheckAmount={paycheckAmount}
                  onFreqChange={handleFreqChange}
                  onAmountChange={handleAmountChange}
                />
              )}
              {step === 2 && (
                <Step2
                  buckets={buckets}
                  onNameChange={handleBucketNameChange}
                  onPercentChange={handleBucketPercentChange}
                />
              )}
              {step === 3 && (
                <Step3
                  weeklyBudget={weeklyBudget}
                  showBreakdown={showBreakdown}
                  breakdown={breakdown}
                  onBudgetChange={handleWeeklyBudgetChange}
                  onToggleBreakdown={handleToggleBreakdown}
                  onBreakdownNameChange={handleBreakdownNameChange}
                  onBreakdownAmountChange={handleBreakdownAmountChange}
                />
              )}
              {step === 4 && (
                <Step4
                  goalName={goalName}
                  goalAmount={goalAmount}
                  goalMonth={goalMonth}
                  goalYear={goalYear}
                  onNameChange={handleGoalNameChange}
                  onAmountChange={handleGoalAmountChange}
                  onMonthChange={handleGoalMonthChange}
                  onYearChange={handleGoalYearChange}
                />
              )}

              {/* Bottom actions */}
              <div className='mt-7 flex flex-col gap-2'>
                <button
                  type='button'
                  onClick={handleContinue}
                  disabled={!isValid(step)}
                  className='w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
                  style={{
                    backgroundColor: isValid(step) ? '#0284c7' : '#9fb6cf',
                    boxShadow: isValid(step) ? '0 4px 14px rgba(2,132,199,0.35)' : 'none',
                    cursor: isValid(step) ? 'pointer' : 'not-allowed',
                  }}
                >
                  Continue
                  <span className='w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0'>
                    <svg width='9' height='9' viewBox='0 0 9 9' fill='none' aria-hidden='true'>
                      <path d='M2 7L7 2M3.5 2H7V5.5' stroke='white' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
                    </svg>
                  </span>
                </button>

                {step === 4 && (
                  <button
                    type='button'
                    onClick={handleSkipGoal}
                    className='w-full py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded'
                    style={{ color: 'rgba(15,38,68,0.42)' }}
                  >
                    Skip for now →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
