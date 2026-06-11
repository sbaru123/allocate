import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Distribution from '@/components/ExpenseBreakdown'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const CATEGORIES: { value: Category; label: string; color: string; chartColor: string }[] = [
  { value: 'food', label: 'Food & Dining', color: 'bg-orange-400', chartColor: '#fb923c' },
  { value: 'transport', label: 'Transport', color: 'bg-blue-400', chartColor: '#60a5fa' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-purple-400', chartColor: '#c084fc' },
  { value: 'housing', label: 'Housing', color: 'bg-yellow-400', chartColor: '#facc15' },
  { value: 'other', label: 'Other', color: 'bg-gray-400', chartColor: '#9ca3af' },
]

const PALETTE = [
  { hex: '#38bdf8' },
  { hex: '#a78bfa' },
  { hex: '#34d399' },
  { hex: '#fb923c' },
  { hex: '#f472b6' },
  { hex: '#facc15' },
  { hex: '#2dd4bf' },
  { hex: '#f87171' },
]

type Category = 'food' | 'transport' | 'entertainment' | 'housing' | 'other'

type Expense = {
  id: string
  amount: number
  category: Category
  note: string
  created_at: string
}

type PayFrequency = 'weekly' | 'biweekly' | 'monthly'

type Budget = {
  pay_frequency: PayFrequency
}

type Paycheck = {
  id: string
  amount: number
  note: string
  created_at: string
}

type Allocation = {
  id: string
  label: string
  percentage: number
}

type Period = 'week' | 'month'

function getPeriodRange(period: Period, anchorDate: Date) {
  if (period === 'month') {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
    return { start, end }
  }
  const start = new Date(anchorDate)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setHours(0, 0, 0, 0)
  start.setDate(diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return { start, end }
}

function formatPeriodLabel(period: Period, start: Date, end: Date) {
  if (period === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const weekEnd = new Date(end)
  weekEnd.setDate(end.getDate() - 1)
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

function getDaysInPeriod(period: Period, start: Date) {
  if (period === 'week') return 7
  return new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [chartExpenses, setChartExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [paychecks, setPaychecks] = useState<Paycheck[]>([])
  const [latestPaycheckRecord, setLatestPaycheckRecord] = useState<Paycheck | null>(null)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [note, setNote] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => localDateStr(new Date()))
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState('')

  const fetchData = useCallback(async function () {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start, end } = getPeriodRange(period, anchorDate)

    const today = new Date()
    const chartEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    const chartStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    const [expensesRes, chartExpensesRes, budgetRes, paychecksRes, allocationsRes, latestPaycheckRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', chartStart.toISOString())
        .lt('created_at', chartEnd.toISOString()),
      supabase
        .from('budgets')
        .select('pay_frequency')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('allocations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('paychecks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (expensesRes.data) setExpenses(expensesRes.data)
    if (chartExpensesRes.data) setChartExpenses(chartExpensesRes.data)
    if (budgetRes.data) setBudget(budgetRes.data)
    if (paychecksRes.data) setPaychecks(paychecksRes.data)
    if (allocationsRes.data) setAllocations(allocationsRes.data)
    if (latestPaycheckRes.data) setLatestPaycheckRecord(latestPaycheckRes.data)
  }, [period, anchorDate])

  useEffect(function () {
    async function loadDashboard() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        navigate('/login')
        return
      }
      setUserName(data.user.user_metadata?.name ?? '')
      fetchData()
    }
    loadDashboard()
  }, [navigate, fetchData])

  function movePeriod(direction: -1 | 1) {
    setAnchorDate(prev => {
      const next = new Date(prev)
      if (period === 'week') {
        next.setDate(prev.getDate() + direction * 7)
      } else {
        next.setMonth(prev.getMonth() + direction)
      }
      return next
    })
  }

  function goToCurrentPeriod() {
    setAnchorDate(new Date())
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitting(false)
      return
    }
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      amount: parseFloat(amount),
      category,
      note,
      created_at: new Date(expenseDate + 'T12:00:00').toISOString(),
    })
    if (!error) {
      setAmount('')
      setNote('')
      setCategory('food')
      setExpenseDate(localDateStr(new Date()))
      setShowForm(false)
      fetchData()
    }
    setSubmitting(false)
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const periodRange = getPeriodRange(period, anchorDate)
  const periodLabel = formatPeriodLabel(period, periodRange.start, periodRange.end)
  const periodName = period === 'week' ? 'week' : 'month'
  const daysInPeriod = getDaysInPeriod(period, periodRange.start)

  const periodTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
  }))

  const incomeThisMonth = paychecks.reduce((sum, p) => sum + p.amount, 0)
  const totalAllocated = allocations.reduce((s, a) => s + a.percentage, 0)

  // Budget formula: weeklyBudget = (paycheck × unallocated%) ÷ weeksPerPeriod
  // weekly=1, biweekly=2, monthly=4
  const today = new Date()
  const weeksPerPeriod = budget?.pay_frequency === 'weekly' ? 1 : budget?.pay_frequency === 'monthly' ? 4 : 2
  const latestPaycheckAmt = latestPaycheckRecord?.amount ?? 0
  const unallocatedFraction = Math.max(100 - totalAllocated, 0) / 100
  const weeklyBudget = latestPaycheckAmt > 0 ? (latestPaycheckAmt * unallocatedFraction) / weeksPerPeriod : 0
  const periodLimit = period === 'week' ? weeklyBudget : weeklyBudget * (daysInPeriod / 7)
  const remaining = periodLimit - periodTotal
  const progress = periodLimit > 0 ? Math.min((periodTotal / periodLimit) * 100, 100) : 0

  // 7-day bar chart (today already declared above)
  const sevenDays = Array.from({ length: 7 }, function (_, i) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i)
    return localDateStr(d)
  })
  const dayTotals = sevenDays.map(function (dateStr) {
    return {
      dateStr,
      label: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
      total: chartExpenses
        .filter(function (e) { return localDateStr(new Date(e.created_at)) === dateStr })
        .reduce(function (sum, e) { return sum + e.amount }, 0),
    }
  })
  const maxDayTotal = Math.max(...dayTotals.map(d => d.total), 1)
  const todayStr = localDateStr(today)
  const chartTotal7d = chartExpenses.reduce(function (s, e) { return s + e.amount }, 0)

  // AI insight (computed, non-AI)
  function getAiInsight() {
    if (periodLimit === 0) {
      return 'Log a paycheck and set up allocations on the Paycheck page to start tracking your spending budget.'
    }
    if (remaining < 0) {
      const topCat = [...byCategory].sort(function (a, b) { return b.total - a.total })[0]
      return `You\'re $${Math.abs(remaining).toFixed(0)} over budget this ${periodName}. Biggest category: ${topCat?.label ?? 'Other'}.`
    }
    if (progress > 75) {
      return `Heads up — you\'ve used ${Math.round(progress)}% of your ${periodName}ly budget. $${remaining.toFixed(0)} left.`
    }
    if (progress < 30 && periodTotal > 0) {
      return `Great start! Only $${periodTotal.toFixed(0)} spent so far this ${periodName}. You\'re well within budget.`
    }
    if (periodTotal === 0) {
      return `No expenses logged yet this ${periodName}. Hit the + button to get started.`
    }
    return `On track — $${remaining.toFixed(0)} remaining for the ${periodName}.`
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 px-6 py-6'>
        <div className='mx-auto max-w-7xl space-y-5'>

          {/* Header + period toggle */}
          <div className='flex items-end justify-between'>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>
                {userName ? `Hello, ${userName.split(' ')[0]} 👋` : 'Hello there 👋'}
              </h1>
              <p className='text-sm text-gray-500'>Here's your overview for the {periodName}.</p>
            </div>
            <div className='flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm'>
              <button
                type='button'
                onClick={() => setPeriod('week')}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === 'week' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
              <button
                type='button'
                onClick={() => setPeriod('month')}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === 'month' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Period navigator */}
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => movePeriod(-1)}
              className='h-7 w-7 rounded-lg border border-gray-200 text-base text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors flex items-center justify-center'
              aria-label={`Previous ${periodName}`}
            >
              ‹
            </button>
            <button
              type='button'
              onClick={goToCurrentPeriod}
              className='text-sm font-medium text-gray-600 hover:text-sky-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-sky-50'
            >
              {periodLabel}
            </button>
            <button
              type='button'
              onClick={() => movePeriod(1)}
              className='h-7 w-7 rounded-lg border border-gray-200 text-base text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors flex items-center justify-center'
              aria-label={`Next ${periodName}`}
            >
              ›
            </button>
          </div>

          {/* 4-up KPI row */}
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>

            {/* KPI 1: Spent this period */}
            <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Spent this {periodName}</p>
              <p className='text-2xl font-bold text-gray-900'>${periodTotal.toFixed(2)}</p>
              {periodLimit > 0 ? (
                <div className='mt-2.5'>
                  <div className='w-full bg-gray-100 rounded-full h-1.5 overflow-hidden'>
                    <div
                      className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${progress > 90 ? 'bg-red-400' : 'bg-sky-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>{Math.round(progress)}% of ${periodLimit.toFixed(0)} limit</p>
                </div>
              ) : (
                <p className='text-xs text-gray-400 mt-1'>No budget set</p>
              )}
            </div>

            {/* KPI 2: Safe to spend */}
            <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Safe to Spend</p>
              {periodLimit > 0 ? (
                <>
                  <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {remaining < 0 ? '-' : ''}${Math.abs(remaining).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${remaining < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {remaining < 0 ? 'over budget' : `remaining this ${periodName}`}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>
                    Log a paycheck →
                  </Link>
                </>
              )}
            </div>

            {/* KPI 3: Income this month */}
            <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Income This Month</p>
              {incomeThisMonth > 0 ? (
                <>
                  <p className='text-2xl font-bold text-gray-900'>${incomeThisMonth.toFixed(2)}</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    Last paycheck: ${latestPaycheckAmt.toFixed(2)}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>
                    Log a paycheck →
                  </Link>
                </>
              )}
            </div>

            {/* KPI 4: Allocated % */}
            <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Allocated</p>
              {allocations.length > 0 ? (
                <>
                  <p className='text-2xl font-bold text-gray-900'>{totalAllocated.toFixed(0)}%</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    {allocations.length} goal{allocations.length !== 1 ? 's' : ''} set up
                  </p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>
                    Add allocations →
                  </Link>
                </>
              )}
            </div>

          </div>

          {/* Terp AI insight strip */}
          <div className='bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <span className='text-lg flex-shrink-0'>💡</span>
              <p className='text-sm text-sky-800 font-medium leading-snug'>{getAiInsight()}</p>
            </div>
            {/* TODO: wire up to Terp AI when AI features are built */}
            <button
              type='button'
              disabled
              className='flex-shrink-0 text-xs font-semibold text-sky-400 border border-sky-200 bg-white rounded-lg px-3 py-1.5 cursor-not-allowed opacity-60 whitespace-nowrap'
            >
              Ask Terp AI
            </button>
          </div>

          {/* Two-column main grid */}
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start'>

            {/* ── Left column ── */}
            <div className='space-y-4'>

              {/* 7-day spending bar chart */}
              <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <p className='text-sm font-semibold text-gray-700'>7-Day Spending</p>
                    <p className='text-xs text-gray-400'>Rolling last 7 days</p>
                  </div>
                  <p className='text-sm font-semibold text-gray-900'>${chartTotal7d.toFixed(2)}</p>
                </div>

                <div className='flex items-end gap-1.5' style={{ height: '96px' }}>
                  {dayTotals.map(function (day) {
                    const barHeight = day.total > 0 ? Math.max((day.total / maxDayTotal) * 72, 4) : 0
                    const isToday = day.dateStr === todayStr
                    return (
                      <div key={day.dateStr} className='flex-1 flex flex-col items-center gap-1.5'>
                        <div className='w-full flex items-end justify-center' style={{ height: '72px' }}>
                          {barHeight > 0 ? (
                            <div
                              className='w-full rounded-t-md transition-[height] duration-500'
                              style={{
                                height: `${barHeight}px`,
                                backgroundColor: isToday ? '#0284c7' : '#7dd3fc',
                              }}
                              title={`$${day.total.toFixed(2)}`}
                            />
                          ) : (
                            <div className='w-full rounded-t-sm bg-gray-100' style={{ height: '3px' }} />
                          )}
                        </div>
                        <span className={`text-[10px] ${isToday ? 'text-sky-600 font-semibold' : 'text-gray-400'}`}>
                          {day.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Paycheck allocation breakdown (read-only) */}
              <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
                <div className='flex items-baseline justify-between mb-1'>
                  <p className='text-sm font-semibold text-gray-700'>Paycheck Allocation</p>
                  {latestPaycheckAmt > 0 && (
                    <span className='text-xs text-gray-400'>Based on ${latestPaycheckAmt.toFixed(2)}</span>
                  )}
                </div>
                <p className='text-xs text-gray-400 mb-4'>How your last paycheck is distributed.</p>

                {allocations.length === 0 ? (
                  <p className='text-sm text-gray-400'>
                    No allocations set up.{' '}
                    <Link to='/paycheck' className='text-sky-600 hover:underline'>
                      Add them on Paycheck →
                    </Link>
                  </p>
                ) : (
                  <>
                    {/* Segmented allocation bar */}
                    <div className='w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex mb-4'>
                      {allocations.map(function (a, i) {
                        return (
                          <div
                            key={a.id}
                            className='h-full transition-all duration-500'
                            style={{
                              width: `${Math.min(a.percentage, 100)}%`,
                              backgroundColor: PALETTE[i % PALETTE.length].hex,
                            }}
                          />
                        )
                      })}
                    </div>

                    {/* Allocation rows */}
                    <div className='space-y-2.5'>
                      {allocations.map(function (a, i) {
                        return (
                          <div key={a.id} className='flex items-center gap-2'>
                            <div
                              className='w-2 h-2 rounded-full flex-shrink-0'
                              style={{ backgroundColor: PALETTE[i % PALETTE.length].hex }}
                            />
                            <span className='text-sm text-gray-700 flex-1 truncate'>{a.label}</span>
                            <span className='text-xs text-gray-400 flex-shrink-0 w-10 text-right'>
                              {a.percentage}%
                            </span>
                            {latestPaycheckAmt > 0 && (
                              <span className='text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0'>
                                ${((a.percentage / 100) * latestPaycheckAmt).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className='mt-4 pt-3 border-t border-gray-100 flex justify-between items-center'>
                      <span className='text-xs text-gray-400'>{totalAllocated.toFixed(0)}% allocated</span>
                      <Link to='/paycheck' className='text-xs text-sky-600 hover:underline'>Edit allocations →</Link>
                    </div>
                  </>
                )}
              </div>

              {/* Recent activity */}
              <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
                <div className='flex justify-between items-center mb-3'>
                  <p className='text-sm font-semibold text-gray-700'>Recent Activity</p>
                  <Link to='/history' className='text-xs text-sky-600 hover:underline'>See all</Link>
                </div>
                {expenses.length === 0 ? (
                  <p className='text-sm text-gray-400'>No expenses logged this {periodName} yet.</p>
                ) : (
                  <div className='space-y-2.5'>
                    {expenses.slice(0, 5).map(function (exp) {
                      const cat = CATEGORIES.find(function (c) { return c.value === exp.category })
                      return (
                        <div key={exp.id} className='flex items-center gap-3'>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat?.color ?? 'bg-gray-300'}`} />
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm text-gray-800 truncate'>{exp.note || cat?.label}</p>
                            <p className='text-xs text-gray-400'>
                              {cat?.label} · {new Date(exp.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className='text-sm font-semibold text-gray-900'>${exp.amount.toFixed(2)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* ── Right column ── */}
            <div className='space-y-4'>

              {/* Expense distribution donut */}
              <Distribution
                items={byCategory}
                periodName={periodName}
                total={periodTotal}
                budgetLimit={periodLimit}
                remaining={remaining}
              />

            </div>
          </div>

        </div>
      </main>

      {/* FAB — expands to pill on hover */}
      <button
        onClick={() => setShowForm(true)}
        className='group fixed bottom-6 right-6 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white rounded-full h-14 px-4 shadow-lg shadow-sky-200 overflow-hidden transition-[width,background-color] duration-300 ease-in-out w-14 hover:w-52 active:scale-[0.97]'
      >
        <span className='text-lg font-bold leading-none flex-shrink-0 flex items-center'>+</span>
        <span className='text-sm font-semibold whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs group-hover:pl-2 transition-[max-width,padding] duration-300 delay-75 flex items-center'>
          Log an Expense
        </span>
      </button>

      {/* Log expense modal */}
      {showForm && (
        <div
          className='modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setShowForm(false)}
        >
          <div
            className='modal-content bg-white w-full max-w-md rounded-2xl p-6'
            onClick={function (e) { e.stopPropagation() }}
          >
            <h2 className='text-lg font-bold text-gray-900 mb-4 text-center'>Log an expense</h2>
            <form onSubmit={handleAddExpense} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Amount ($)</label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  required
                  autoFocus
                  value={amount}
                  onChange={function (e) { setAmount(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='0.00'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Category</label>
                <div className='grid grid-cols-3 gap-2'>
                  {CATEGORIES.map(function (cat) {
                    return (
                      <button
                        key={cat.value}
                        type='button'
                        onClick={() => setCategory(cat.value)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.97] ${
                          category === cat.value
                            ? 'border-sky-400 bg-sky-50 text-sky-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Note (optional)</label>
                <input
                  type='text'
                  value={note}
                  onChange={function (e) { setNote(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='e.g. Chipotle, Metro card...'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date</label>
                <input
                  type='date'
                  required
                  value={expenseDate}
                  max={localDateStr(new Date())}
                  onChange={function (e) { setExpenseDate(e.target.value) }}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                />
              </div>
              <div className='flex gap-2 pt-1'>
                <button
                  type='button'
                  onClick={() => setShowForm(false)}
                  className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium transition-[transform,background-color] duration-150 hover:bg-gray-50 active:scale-[0.97]'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97]'
                >
                  {submitting ? 'Saving...' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
