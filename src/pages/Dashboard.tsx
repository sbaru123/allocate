import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Expense, Allocation } from '@/types'
import Distribution from '@/components/ExpenseBreakdown'
import SevenDayChart from '@/components/SevenDayChart'
import PaycheckAllocation from '@/components/PaycheckAllocation'
import RecentActivity from '@/components/RecentActivity'
import ExpensePopup from '@/components/ExpensePopup'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const CATEGORIES: { value: string; label: string; color: string; chartColor: string }[] = [
  { value: 'food',          label: 'Food & Dining',  color: 'bg-orange-400', chartColor: '#fb923c' },
  { value: 'transport',     label: 'Transport',       color: 'bg-blue-400',   chartColor: '#60a5fa' },
  { value: 'entertainment', label: 'Entertainment',   color: 'bg-purple-400', chartColor: '#c084fc' },
  { value: 'housing',       label: 'Housing',         color: 'bg-yellow-400', chartColor: '#facc15' },
  { value: 'other',         label: 'Other',           color: 'bg-gray-400',   chartColor: '#9ca3af' },
]

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

type Period = 'week' | 'month'

type DashboardData = {
  expenses: Expense[]
  chartExpenses: Expense[]
  budget: Budget | null
  paychecks: Paycheck[]
  allocations: Allocation[]
  latestPaycheckRecord: Paycheck | null
}

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
  const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const e = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} – ${e}`
}

function getDaysInPeriod(period: Period, start: Date) {
  if (period === 'week') return 7
  return new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchDashboardData(period: Period, periodStart: Date): Promise<DashboardData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { start, end } = getPeriodRange(period, periodStart)
  const today = new Date()
  const chartEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const chartStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const [expensesRes, chartExpensesRes, budgetRes, paychecksRes, allocationsRes, latestPaycheckRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', user.id)
      .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('user_id', user.id)
      .gte('created_at', chartStart.toISOString()).lt('created_at', chartEnd.toISOString()),
    supabase.from('budgets').select('pay_frequency').eq('user_id', user.id).single(),
    supabase.from('paychecks').select('*').eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.from('paychecks').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).single(),
  ])

  return {
    expenses: expensesRes.data ?? [],
    chartExpenses: chartExpensesRes.data ?? [],
    budget: budgetRes.data ?? null,
    paychecks: paychecksRes.data ?? [],
    allocations: allocationsRes.data ?? [],
    latestPaycheckRecord: latestPaycheckRes.data ?? null,
  }
}

export default function Dashboard() {
  const navigate = useNavigate()

  // UI state
  const [period, setPeriod] = useState<Period>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [userName, setUserName] = useState('')

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  useEffect(function () {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { navigate('/login'); return }
      setUserName(data.user.user_metadata?.name ?? '')
    }
    loadUser()
  }, [navigate])

  const periodRange = getPeriodRange(period, anchorDate)
  const periodStartStr = localDateStr(periodRange.start)

  const { data: dashData } = useQuery({
    queryKey: ['dashboard', period, periodStartStr],
    queryFn: function () { return fetchDashboardData(period, periodRange.start) },
    staleTime: 5 * 60 * 1000,
  })

  const expenses = dashData?.expenses ?? []
  const chartExpenses = dashData?.chartExpenses ?? []
  const budget = dashData?.budget ?? null
  const paychecks = dashData?.paychecks ?? []
  const allocations = dashData?.allocations ?? []
  const latestPaycheckRecord = dashData?.latestPaycheckRecord ?? null

  function movePeriod(direction: -1 | 1) {
    setAnchorDate(function (prev) {
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

  function closeModal() {
    setShowForm(false)
    setEditingExpense(null)
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const periodLabel = formatPeriodLabel(period, periodRange.start, periodRange.end)
  const periodName = period === 'week' ? 'week' : 'month'
  const daysInPeriod = getDaysInPeriod(period, periodRange.start)

  const periodTotal = expenses.reduce(function (sum, e) { return sum + e.amount }, 0)
  const byCategory = CATEGORIES.map(function (cat) {
    return {
      ...cat,
      total: expenses
        .filter(function (e) { return e.category === cat.value })
        .reduce(function (sum, e) { return sum + e.amount }, 0),
    }
  })

  const incomeThisMonth = paychecks.reduce(function (sum, p) { return sum + p.amount }, 0)
  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)
  const latestPaycheckAmt = latestPaycheckRecord?.amount ?? 0

  const weeksPerPeriod = budget?.pay_frequency === 'weekly' ? 1 : budget?.pay_frequency === 'monthly' ? 4 : 2
  const unallocatedFraction = Math.max(100 - totalAllocated, 0) / 100
  const weeklyBudget = latestPaycheckAmt > 0 ? (latestPaycheckAmt * unallocatedFraction) / weeksPerPeriod : 0
  const periodLimit = period === 'week' ? weeklyBudget : weeklyBudget * (daysInPeriod / 7)
  const remaining = periodLimit - periodTotal
  const progress = periodLimit > 0 ? Math.min((periodTotal / periodLimit) * 100, 100) : 0

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
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Log a paycheck →</Link>
                </>
              )}
            </div>

            <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-1'>Income This Month</p>
              {incomeThisMonth > 0 ? (
                <>
                  <p className='text-2xl font-bold text-gray-900'>${incomeThisMonth.toFixed(2)}</p>
                  <p className='text-xs text-gray-400 mt-1'>Last paycheck: ${latestPaycheckAmt.toFixed(2)}</p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Log a paycheck →</Link>
                </>
              )}
            </div>

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
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Add allocations →</Link>
                </>
              )}
            </div>
          </div>

          {/* AllocateAI insight strip */}
          <div className='bg-sky-50 border border-sky-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <span className='text-lg flex-shrink-0'>💡</span>
              <p className='text-sm text-sky-800 font-medium leading-snug'>{getAiInsight()}</p>
            </div>
            <button
              type='button'
              disabled
              className='flex-shrink-0 text-xs font-semibold text-sky-400 border border-sky-200 bg-white rounded-lg px-3 py-1.5 cursor-not-allowed opacity-60 whitespace-nowrap'
            >
              Ask AllocateAI
            </button>
          </div>

          {/* Two-column main grid */}
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start'>

            {/* ── Left column ── */}
            <div className='space-y-4'>
              <SevenDayChart chartExpenses={chartExpenses} />
              <PaycheckAllocation
                allocations={allocations}
                latestPaycheckAmt={latestPaycheckAmt}
                totalAllocated={totalAllocated}
              />
              <RecentActivity
                expenses={expenses}
                periodName={periodName}
                onExpenseClick={setEditingExpense}
              />
            </div>

            {/* ── Right column ── */}
            <div className='space-y-4'>
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

      {/* FAB */}
      <button
        onClick={function () { setShowForm(true) }}
        className='group fixed bottom-6 right-6 flex items-center justify-center bg-sky-600 hover:bg-sky-700 text-white rounded-full h-14 px-4 shadow-lg shadow-sky-200 overflow-hidden transition-[width,background-color] duration-300 ease-in-out w-14 hover:w-52 active:scale-[0.97]'
      >
        <span className='text-lg font-bold leading-none flex-shrink-0 flex items-center'>+</span>
        <span className='text-sm font-semibold whitespace-nowrap max-w-0 overflow-hidden group-hover:max-w-xs group-hover:pl-2 transition-[max-width,padding] duration-300 delay-75 flex items-center'>
          Log an Expense
        </span>
      </button>

      <ExpensePopup
        key={editingExpense?.id ?? (showForm ? 'new' : 'closed')}
        open={showForm || !!editingExpense}
        onClose={closeModal}
        expense={editingExpense}
      />
    </div>
  )
}
