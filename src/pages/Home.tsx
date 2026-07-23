import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Expense, Allocation } from '@/types'
import Distribution from '@/components/ExpenseBreakdown'
import SevenDayChart from '@/components/SevenDayChart'
import PaycheckAllocation from '@/components/PaycheckAllocation'
import RecentActivity from '@/components/RecentActivity'
import ExpensePopup from '@/components/ExpensePopup'
import WeekPicker from '@/components/WeekPicker'
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
  weekly_budget: number | null
}

type Paycheck = {
  id: string
  amount: number
  note: string
  created_at: string
  period_start?: string | null
  period_weeks?: number | null
}

function weeksPerPeriodFor(freq: PayFrequency | undefined) {
  if (freq === 'weekly') return 1
  if (freq === 'monthly') return 4
  return 2
}

// The paycheck whose coverage window contains the given week. When windows
// overlap, the one that starts latest (most recent) wins.
function paycheckForWeek(weekStartMs: number, paychecks: Paycheck[], defaultWeeks: number): Paycheck | null {
  let best: Paycheck | null = null
  let bestStart = -Infinity
  for (const p of paychecks) {
    const anchor = p.period_start ? new Date(`${p.period_start}T00:00:00`) : new Date(p.created_at)
    const ps = getWeekStart(anchor).getTime()
    const weeks = p.period_weeks ?? defaultWeeks
    const pe = ps + weeks * 7 * 86400000
    if (weekStartMs >= ps && weekStartMs < pe && ps > bestStart) {
      best = p
      bestStart = ps
    }
  }
  return best
}

type Period = 'week' | 'month'

type SlimExpense = {
  amount: number
  created_at: string
}

type DashboardData = {
  expenses: Expense[]
  chartExpenses: Expense[]
  allExpenses: SlimExpense[]
  budget: Budget | null
  paychecks: Paycheck[]
  coveragePaychecks: Paycheck[]
  allocations: Allocation[]
  latestPaycheckRecord: Paycheck | null
  firstPaycheckAt: string | null
  rolloverStart: string | null
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

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setHours(0, 0, 0, 0)
  start.setDate(diff)
  return start
}

/**
 * Rollover fund as of a given week: every week completed *before* that week
 * contributes whatever was left of its weekly budget (negative if overspent).
 * The viewed week itself only draws the fund down when its spending exceeds
 * the weekly budget (i.e. Safe to Spend is used up). So the fund is different
 * for every week: $20 left in week 1 → week 2 shows $20; $40 more left in
 * week 2 → week 3 shows $60, and so on.
 */
function computeLeftoverFund(
  weekBudgetOf: (weekStartMs: number) => number,
  hasBudget: boolean,
  allExpenses: SlimExpense[],
  firstPaycheckAt: string | null,
  rolloverStart: string | null,
  asOf: Date,
) {
  if (!hasBudget) return { fund: 0, completedWeeks: 0 }

  let startWeek: Date
  if (rolloverStart) {
    // User-chosen start: weeks and expenses before it don't count.
    // Date columns come back as 'YYYY-MM-DD'; anchor to local midnight to
    // avoid the UTC-parse shifting it into the previous day.
    startWeek = getWeekStart(new Date(`${rolloverStart}T00:00:00`))
  } else {
    // Default: earliest activity — first paycheck or first expense
    const candidates: Date[] = []
    if (firstPaycheckAt) candidates.push(new Date(firstPaycheckAt))
    if (allExpenses.length > 0) candidates.push(new Date(allExpenses[0].created_at))
    if (candidates.length === 0) return { fund: 0, completedWeeks: 0 }
    startWeek = getWeekStart(new Date(Math.min(...candidates.map(function (d) { return d.getTime() }))))
  }

  const currentWeekStart = getWeekStart(asOf)
  if (currentWeekStart < startWeek) return { fund: 0, completedWeeks: 0 }

  // Bucket spending by week
  const spentByWeek = new Map<number, number>()
  for (const e of allExpenses) {
    const key = getWeekStart(new Date(e.created_at)).getTime()
    spentByWeek.set(key, (spentByWeek.get(key) ?? 0) + e.amount)
  }

  let fund = 0
  let completedWeeks = 0
  const cursor = new Date(startWeek)
  while (cursor < currentWeekStart) {
    fund += weekBudgetOf(cursor.getTime()) - (spentByWeek.get(cursor.getTime()) ?? 0)
    completedWeeks += 1
    cursor.setDate(cursor.getDate() + 7)
  }

  // Current week only taps the fund once its own budget is exhausted
  const spentThisWeek = spentByWeek.get(currentWeekStart.getTime()) ?? 0
  fund -= Math.max(0, spentThisWeek - weekBudgetOf(currentWeekStart.getTime()))

  // Can go negative — overspending beyond what past weeks saved up
  return { fund, completedWeeks }
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

  const [expensesRes, chartExpensesRes, allExpensesRes, budgetRes, profileRes, paychecksRes, allocationsRes, firstPaycheckRes] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', user.id)
      .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').eq('user_id', user.id)
      .gte('created_at', chartStart.toISOString()).lt('created_at', chartEnd.toISOString()),
    supabase.from('expenses').select('amount, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.from('budgets').select('pay_frequency, weekly_budget').eq('user_id', user.id).single(),
    supabase.from('profiles').select('pay_frequency, weekly_budget, rollover_start').eq('id', user.id).single(),
    supabase.from('paychecks').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(100),
    supabase.from('allocations').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase.from('paychecks').select('created_at').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ])

  // Filter to the current month client-side. Server-side ISO ranges can drop
  // paychecks near month boundaries because of timezone drift.
  const allPaychecks: Paycheck[] = paychecksRes.data ?? []
  const monthPaychecks = allPaychecks.filter(function (p) {
    const d = new Date(p.created_at)
    return d >= monthStart && d < monthEnd
  })

  // Prefer budgets, but fall back to profiles — accounts that onboarded
  // before the budgets table (or its weekly_budget column) existed only
  // have these values on their profile row.
  const budgetRow = budgetRes.data
  const profileRow = profileRes.data
  const budget: Budget | null = (budgetRow || profileRow)
    ? {
        pay_frequency: (budgetRow?.pay_frequency ?? profileRow?.pay_frequency ?? 'biweekly') as PayFrequency,
        weekly_budget: budgetRow?.weekly_budget ?? profileRow?.weekly_budget ?? null,
      }
    : null

  return {
    expenses: expensesRes.data ?? [],
    chartExpenses: chartExpensesRes.data ?? [],
    allExpenses: allExpensesRes.data ?? [],
    budget,
    paychecks: monthPaychecks,
    coveragePaychecks: allPaychecks,
    allocations: allocationsRes.data ?? [],
    latestPaycheckRecord: allPaychecks[0] ?? null,
    firstPaycheckAt: firstPaycheckRes.data?.created_at ?? null,
    rolloverStart: profileRow?.rollover_start ?? null,
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // UI state
  const [period, setPeriod] = useState<Period>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [userName, setUserName] = useState('')

  // Rollover start editor state
  const [editingRollover, setEditingRollover] = useState(false)
  const [rolloverInput, setRolloverInput] = useState('')

  // Week picker popup
  const [showWeekPicker, setShowWeekPicker] = useState(false)

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const saveRolloverStartMutation = useMutation({
    mutationFn: async function (date: string) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const res = await supabase
        .from('profiles')
        .upsert({ id: user.id, rollover_start: date }, { onConflict: 'id' })
      if (res.error) throw res.error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      setEditingRollover(false)
    },
  })

  function openRolloverEditor() {
    setRolloverInput(dashData?.rolloverStart ?? '')
    setEditingRollover(true)
  }

  useEffect(function () {
    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { navigate('/login'); return }
      const meta = data.user.user_metadata ?? {}
      setUserName(meta.full_name || meta.name || data.user.email?.split('@')[0] || '')
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

  const weeklyBudget = (budget?.weekly_budget != null && budget.weekly_budget > 0)
    ? budget.weekly_budget
    : 0

  // Per-week budget: each week is funded by the paycheck that covers it, scaled
  // to the same spending fraction the global budget implies. This keeps past
  // weeks anchored to their own paycheck instead of the latest one.
  const coveragePaychecks = dashData?.coveragePaychecks ?? []
  const defaultWeeks = weeksPerPeriodFor(budget?.pay_frequency)
  const spendingRate = (weeklyBudget > 0 && latestPaycheckAmt > 0)
    ? weeklyBudget / latestPaycheckAmt
    : 0

  function weekBudgetOf(weekStartMs: number) {
    if (weeklyBudget <= 0) return 0
    const covering = paycheckForWeek(weekStartMs, coveragePaychecks, defaultWeeks)
    if (covering && spendingRate > 0) return covering.amount * spendingRate
    return weeklyBudget
  }

  // Default date for new expenses: the date of the last logged expense
  const allExpensesList = dashData?.allExpenses ?? []
  const lastExpenseDate = allExpensesList.length > 0
    ? localDateStr(new Date(allExpensesList[allExpensesList.length - 1].created_at))
    : null

  // The fund is week-specific: navigating the period selector shows the fund
  // as it stands entering that week. Month view uses today's week.
  const { fund: leftoverFund, completedWeeks } = computeLeftoverFund(
    weekBudgetOf,
    weeklyBudget > 0,
    dashData?.allExpenses ?? [],
    dashData?.firstPaycheckAt ?? null,
    dashData?.rolloverStart ?? null,
    period === 'week' ? periodRange.start : new Date(),
  )

  // Period spending limit: for a week, the covering paycheck's budget; for a
  // month, the sum of each covered week's budget.
  let periodLimit: number
  if (period === 'week') {
    periodLimit = weekBudgetOf(getWeekStart(periodRange.start).getTime())
  } else {
    let sum = 0
    const wk = getWeekStart(periodRange.start)
    while (wk < periodRange.end) {
      sum += weekBudgetOf(wk.getTime())
      wk.setDate(wk.getDate() + 7)
    }
    periodLimit = sum
  }
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
    <div className='min-h-screen bg-gray-50 dark:bg-[#06101f]'>
      <Sidebar />

      <main className='ml-56 px-6 py-6'>
        <div className='mx-auto max-w-7xl space-y-5'>

          {/* Header + period toggle */}
          <div className='flex items-end justify-between'>
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-slate-100'>
                {userName ? `Hello, ${userName.split(' ')[0]} 👋` : 'Hello there 👋'}
              </h1>
              <p className='text-sm text-gray-500 dark:text-slate-400'>Here's your overview for the {periodName}.</p>
            </div>
            <div className='flex items-center gap-1 bg-white dark:bg-[#0e1f38] border border-gray-200 dark:border-[#1e3354] rounded-xl p-1 shadow-sm'>
              <button
                type='button'
                onClick={() => setPeriod('week')}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === 'week' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-[#152238]'
                }`}
              >
                Week
              </button>
              <button
                type='button'
                onClick={() => setPeriod('month')}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === 'month' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-[#152238]'
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
              className='h-7 w-7 rounded-lg border border-gray-200 dark:border-[#1e3354] text-base text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-[#0e1f38] hover:text-gray-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center'
              aria-label={`Previous ${periodName}`}
            >
              ‹
            </button>
            <div className='relative'>
              <button
                type='button'
                onClick={function () {
                  if (period === 'week') {
                    setShowWeekPicker(function (prev) { return !prev })
                  } else {
                    goToCurrentPeriod()
                  }
                }}
                className='text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors px-2 py-0.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20'
              >
                {periodLabel}
              </button>
              {showWeekPicker && period === 'week' && (
                <WeekPicker
                  anchorDate={anchorDate}
                  onClose={function () { setShowWeekPicker(false) }}
                  onSelect={function (weekStart) {
                    setAnchorDate(weekStart)
                    setShowWeekPicker(false)
                  }}
                />
              )}
            </div>
            <button
              type='button'
              onClick={() => movePeriod(1)}
              className='h-7 w-7 rounded-lg border border-gray-200 dark:border-[#1e3354] text-base text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-[#0e1f38] hover:text-gray-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center'
              aria-label={`Next ${periodName}`}
            >
              ›
            </button>
          </div>

          {/* 4-up KPI row */}
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
            <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
              <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1'>Spent this {periodName}</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>${periodTotal.toFixed(2)}</p>
              {periodLimit > 0 ? (
                <div className='mt-2.5'>
                  <div className='w-full bg-gray-100 dark:bg-[#0a1628] rounded-full h-1.5 overflow-hidden'>
                    <div
                      className={`h-1.5 rounded-full transition-[width,background-color] duration-500 ${progress > 90 ? 'bg-red-400' : 'bg-sky-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>{Math.round(progress)}% of ${periodLimit.toFixed(0)} limit</p>
                </div>
              ) : (
                <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>No budget set</p>
              )}
            </div>

            <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
              <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1'>Safe to Spend</p>
              {periodLimit > 0 ? (
                <>
                  <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {remaining < 0 ? '-' : ''}${Math.abs(remaining).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${remaining < 0 ? 'text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {remaining < 0 ? 'over budget' : `remaining this ${periodName}`}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300 dark:text-slate-600'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Log a paycheck →</Link>
                </>
              )}
            </div>

            <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
              <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1'>Income This Month</p>
              {latestPaycheckRecord ? (
                <>
                  <p className='text-2xl font-bold text-gray-900 dark:text-slate-100'>${incomeThisMonth.toFixed(2)}</p>
                  <p className='text-xs text-gray-400 dark:text-slate-500 mt-1'>Last paycheck: ${latestPaycheckAmt.toFixed(2)}</p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300 dark:text-slate-600'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Log a paycheck →</Link>
                </>
              )}
            </div>

            <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
              <div className='flex items-center justify-between mb-1'>
                <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide'>Leftover Spending</p>
                {weeklyBudget > 0 && !editingRollover && (
                  <button
                    type='button'
                    onClick={openRolloverEditor}
                    title='Set the week the rollover starts counting from'
                    className='text-[10px] font-semibold text-gray-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap'
                  >
                    ✎ Edit Start Rollover
                  </button>
                )}
              </div>
              {editingRollover ? (
                <div className='mt-1'>
                  <input
                    type='date'
                    value={rolloverInput}
                    onChange={function (e) { setRolloverInput(e.target.value) }}
                    className='w-full rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] px-2 py-1.5 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40'
                  />
                  <div className='flex gap-2 mt-1.5'>
                    <button
                      type='button'
                      onClick={function () { if (rolloverInput) saveRolloverStartMutation.mutate(rolloverInput) }}
                      disabled={saveRolloverStartMutation.isPending || !rolloverInput}
                      className='flex-1 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors'
                    >
                      {saveRolloverStartMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type='button'
                      onClick={function () { setEditingRollover(false) }}
                      className='flex-1 py-1 rounded-lg border border-gray-200 dark:border-[#1e3354] text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] transition-colors'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : weeklyBudget > 0 ? (
                <>
                  <p className={`text-2xl font-bold ${leftoverFund < 0 ? 'text-red-500' : 'text-gray-900 dark:text-slate-100'}`}>
                    {leftoverFund < 0 ? '-' : ''}${Math.abs(leftoverFund).toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${leftoverFund < 0 ? 'text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                    {leftoverFund < 0
                      ? 'overdrawn — spending exceeded past rollovers'
                      : completedWeeks > 0
                        ? `rolled over from ${completedWeeks} week${completedWeeks !== 1 ? 's' : ''}`
                        : 'starts rolling over next week'}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-2xl font-bold text-gray-300 dark:text-slate-600'>—</p>
                  <Link to='/paycheck' className='text-xs text-sky-600 hover:underline mt-1 block'>Set a weekly budget →</Link>
                </>
              )}
            </div>
          </div>

          {/* AllocateAI insight strip */}
          <div className='bg-sky-50 dark:bg-blue-950/40 border border-sky-100 dark:border-blue-900/50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <span className='text-lg flex-shrink-0'>💡</span>
              <p className='text-sm text-sky-800 dark:text-sky-300 font-medium leading-snug'>{getAiInsight()}</p>
            </div>
            <button
              type='button'
              disabled
              className='flex-shrink-0 text-xs font-semibold text-sky-400 border border-sky-200 dark:border-sky-800 bg-white dark:bg-[#0e1f38] rounded-lg px-3 py-1.5 cursor-not-allowed opacity-60 whitespace-nowrap'
            >
              Ask AllocateAI
            </button>
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start'>

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
        defaultDate={lastExpenseDate}
      />
    </div>
  )
}
