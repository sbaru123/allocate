import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Distribution from '@/components/ExpenseBreakdown'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

type Category = 'food' | 'transport' | 'entertainment' | 'housing' | 'other'

const CATEGORIES: { value: Category; label: string; color: string; chartColor: string }[] = [
  { value: 'food', label: 'Food & Dining', color: 'bg-orange-400', chartColor: '#fb923c' },
  { value: 'transport', label: 'Transport', color: 'bg-blue-400', chartColor: '#60a5fa' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-purple-400', chartColor: '#c084fc' },
  { value: 'housing', label: 'Housing', color: 'bg-yellow-400', chartColor: '#facc15' },
  { value: 'other', label: 'Other', color: 'bg-gray-400', chartColor: '#9ca3af' },
]

type Expense = {
  id: string
  amount: number
  category: Category
  note: string
  created_at: string
}

type Budget = {
  weekly_limit: number
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

  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const endLabel = weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `${startLabel} - ${endLabel}`
}

function getDaysInPeriod(period: Period, start: Date) {
  if (period === 'week') return 7
  return new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [totalIncome, setTotalIncome] = useState(0)
  const [period, setPeriod] = useState<Period>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState('')

  const fetchData = useCallback(async function () {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start, end } = getPeriodRange(period, anchorDate)

    const [expensesRes, budgetRes, paychecksRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('budgets')
        .select('weekly_limit')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('paychecks')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString()),
    ])

    if (expensesRes.data) setExpenses(expensesRes.data)
    if (budgetRes.data) setBudget(budgetRes.data)
    if (paychecksRes.data) {
      const total = paychecksRes.data.reduce((sum, p) => sum + p.amount, 0)
      setTotalIncome(total)
    }
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
    })

    if (!error) {
      setAmount('')
      setNote('')
      setCategory('food')
      setShowForm(false)
      fetchData()
    }

    setSubmitting(false)
  }

  const periodRange = getPeriodRange(period, anchorDate)
  const periodLabel = formatPeriodLabel(period, periodRange.start, periodRange.end)
  const periodName = period === 'week' ? 'week' : 'month'
  const daysInPeriod = getDaysInPeriod(period, periodRange.start)

  const periodTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const weeklyLimit = budget?.weekly_limit ?? 0
  const periodLimit = period === 'week' ? weeklyLimit : weeklyLimit * (daysInPeriod / 7)
  const remaining = periodLimit - periodTotal
  const progress = periodLimit > 0 ? Math.min((periodTotal / periodLimit) * 100, 100) : 0

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
  }))

  const netBalance = totalIncome - periodTotal

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 px-4 py-6'>
        <div className='mx-auto max-w-5xl space-y-4'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>
              {userName ? `Hello, ${userName.split(' ')[0]}` : 'Hello there!'}
            </h1>
            <p className='text-sm text-gray-500'>Here's your {periodName} so far.</p>
          </div>

          <div className='bg-white rounded-2xl border border-gray-200 p-3 shadow-sm space-y-3'>
            <div className='grid grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={() => setPeriod('week')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${
                  period === 'week' ? 'bg-sky-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                type='button'
                onClick={() => setPeriod('month')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${
                  period === 'month' ? 'bg-sky-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
            </div>

            <div className='flex items-center justify-between gap-2'>
              <button
                type='button'
                onClick={() => movePeriod(-1)}
                className='h-9 w-9 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500 transition-[transform,background-color] duration-150 hover:bg-gray-50 active:scale-[0.95]'
                aria-label={`Previous ${periodName}`}
              >
                &lt;
              </button>
              <button
                type='button'
                onClick={goToCurrentPeriod}
                className='min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 transition-[transform,background-color] duration-150 hover:bg-gray-50 active:scale-[0.97]'
              >
                {periodLabel}
              </button>
              <button
                type='button'
                onClick={() => movePeriod(1)}
                className='h-9 w-9 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500 transition-[transform,background-color] duration-150 hover:bg-gray-50 active:scale-[0.95]'
                aria-label={`Next ${periodName}`}
              >
                &gt;
              </button>
            </div>
          </div>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)] lg:items-start'>
            <div className='space-y-4'>
              <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
                <div className='flex justify-between items-start mb-3'>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wide'>Spent this {periodName}</p>
                    <p className='text-3xl font-bold text-gray-900'>${periodTotal.toFixed(2)}</p>
                    {periodLimit > 0 && (
                      <p className={`text-sm mt-0.5 ${remaining < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over budget` : `$${remaining.toFixed(2)} remaining`}
                      </p>
                    )}
                  </div>
                  {periodLimit > 0 && (
                    <div className='text-right'>
                      <p className='text-xs text-gray-400'>{period === 'week' ? 'Weekly limit' : 'Month limit'}</p>
                      <p className='text-sm font-semibold text-gray-700'>${periodLimit.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {periodLimit > 0 && (
                  <div className='w-full bg-gray-100 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full transition-[width,background-color] duration-500 ${progress > 90 ? 'bg-red-400' : 'bg-sky-400'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {periodLimit === 0 && (
                  <p className='text-xs text-gray-400'>
                    <Link to='/paycheck' className='text-sky-600 hover:underline'>Set a weekly budget</Link> to track your progress.
                  </p>
                )}
              </div>

              {/* Recent expenses */}
              <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
                <div className='flex justify-between items-center mb-3'>
                  <p className='text-sm font-semibold text-gray-700'>Recent expenses</p>
                  <Link to='/history' className='text-xs text-sky-600 hover:underline'>See all</Link>
                </div>
                {expenses.length === 0 ? (
                  <p className='text-sm text-gray-400'>No expenses logged this {periodName} yet.</p>
                ) : (
                  <div className='space-y-2'>
                    {expenses.slice(0, 5).map((exp, index) => {
                      const cat = CATEGORIES.find(c => c.value === exp.category)
                      return (
                        <div
                          key={exp.id}
                          className='expense-item flex items-center gap-3'
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`w-2 h-2 rounded-full ${cat?.color ?? 'bg-gray-300'} flex-shrink-0`} />
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm text-gray-800 truncate'>{exp.note || cat?.label}</p>
                            <p className='text-xs text-gray-400'>{cat?.label} · {new Date(exp.created_at).toLocaleDateString()}</p>
                          </div>
                          <p className='text-sm font-semibold text-gray-900'>${exp.amount.toFixed(2)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Net balance */}
              {totalIncome > 0 && (
                <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex justify-between items-center'>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wide'>Net balance</p>
                    <p className={`text-2xl font-bold ${netBalance < 0 ? 'text-red-500' : 'text-sky-700'}`}>
                      ${netBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-gray-400'>Income this {periodName}</p>
                    <p className='text-sm font-semibold text-gray-700'>${totalIncome.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            <Distribution
              items={byCategory}
              periodName={periodName}
              total={periodTotal}
              budgetLimit={periodLimit}
              remaining={remaining}
            />
          </div>
        </div>
      </main>

      {/* Quick add button */}
      <button
        onClick={() => setShowForm(true)}
        className='fixed bottom-6 right-6 bg-sky-600 hover:bg-sky-700 text-white rounded-full w-14 h-14 text-2xl shadow-lg shadow-sky-200 flex items-center justify-center transition-[transform,background-color,box-shadow] duration-150 [@media(hover:hover)]:hover:scale-105 active:scale-[0.95]'
      >
        +
      </button>

      {/* Quick add modal */}
      {showForm && (
        <div className='modal-backdrop fixed inset-0 bg-black/40 flex items-center justify-center z-50' onClick={() => setShowForm(false)}>
          <div className='modal-content bg-white w-full max-w-md rounded-2xl p-6' onClick={e => e.stopPropagation()}>
            <h2 className='text-lg font-bold text-gray-900 mb-4'>Log an expense</h2>
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
                  onChange={e => setAmount(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='0.00'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Category</label>
                <div className='grid grid-cols-3 gap-2'>
                  {CATEGORIES.map(cat => (
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
                  ))}
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Note (optional)</label>
                <input
                  type='text'
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='e.g. Chipotle, Metro card...'
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
