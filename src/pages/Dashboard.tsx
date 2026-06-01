import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Category = 'food' | 'transport' | 'entertainment' | 'housing' | 'other'

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'food', label: 'Food & Dining', color: 'bg-orange-400' },
  { value: 'transport', label: 'Transport', color: 'bg-blue-400' },
  { value: 'entertainment', label: 'Entertainment', color: 'bg-purple-400' },
  { value: 'housing', label: 'Housing', color: 'bg-yellow-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-400' },
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [totalIncome, setTotalIncome] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(function () {
    checkAuth()
    fetchData()
  }, [])

  async function checkAuth() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      navigate('/login')
      return
    }
    setUserName(data.user.user_metadata?.name ?? '')
  }

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const weekStart = getWeekStart()

    const [expensesRes, budgetRes, paychecksRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('budgets')
        .select('weekly_limit')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('paychecks')
        .select('amount')
        .eq('user_id', user.id),
    ])

    if (expensesRes.data) setExpenses(expensesRes.data)
    if (budgetRes.data) setBudget(budgetRes.data)
    if (paychecksRes.data) {
      const total = paychecksRes.data.reduce((sum, p) => sum + p.amount, 0)
      setTotalIncome(total)
    }
  }

  function getWeekStart() {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const weeklyTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const weeklyLimit = budget?.weekly_limit ?? 0
  const remaining = weeklyLimit - weeklyTotal
  const progress = weeklyLimit > 0 ? Math.min((weeklyTotal / weeklyLimit) * 100, 100) : 0

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
  }))

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const netBalance = totalIncome - totalSpent

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Nav */}
      <nav className='bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between'>
        <span className='font-bold text-sky-700 text-lg tracking-tight'>Terp Budget</span>
        <div className='flex items-center gap-4'>
          <Link to='/history' className='text-sm text-gray-500 hover:text-gray-800'>History</Link>
          <Link to='/paycheck' className='text-sm text-gray-500 hover:text-gray-800'>Add Paycheck</Link>
          <button onClick={handleSignOut} className='text-sm text-gray-400 hover:text-gray-700'>Sign out</button>
        </div>
      </nav>

      <div className='max-w-xl mx-auto px-4 py-6 space-y-4'>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>
            {userName ? `Hello, ${userName.split(' ')[0]}` : 'Hello there!'}
          </h1>
          <p className='text-sm text-gray-500'>Here's your week so far.</p>
        </div>
        <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
          <div className='flex justify-between items-start mb-3'>
            <div>
              <p className='text-xs text-gray-500 uppercase tracking-wide'>Spent this week</p>
              <p className='text-3xl font-bold text-gray-900'>${weeklyTotal.toFixed(2)}</p>
              {weeklyLimit > 0 && (
                <p className={`text-sm mt-0.5 ${remaining < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {remaining < 0 ? `$${Math.abs(remaining).toFixed(2)} over budget` : `$${remaining.toFixed(2)} remaining`}
                </p>
              )}
            </div>
            {weeklyLimit > 0 && (
              <div className='text-right'>
                <p className='text-xs text-gray-400'>Weekly limit</p>
                <p className='text-sm font-semibold text-gray-700'>${weeklyLimit.toFixed(2)}</p>
              </div>
            )}
          </div>

          {weeklyLimit > 0 && (
            <div className='w-full bg-gray-100 rounded-full h-2'>
              <div
                className={`h-2 rounded-full transition-all ${progress > 90 ? 'bg-red-400' : 'bg-sky-400'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {weeklyLimit === 0 && (
            <p className='text-xs text-gray-400'>
              <Link to='/settings' className='text-sky-600 hover:underline'>Set a weekly budget</Link> to track your progress.
            </p>
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
              <p className='text-xs text-gray-400'>Total income logged</p>
              <p className='text-sm font-semibold text-gray-700'>${totalIncome.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Category breakdown */}
        <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
          <p className='text-sm font-semibold text-gray-700 mb-3'>This week by category</p>
          <div className='space-y-2'>
            {byCategory.map(cat => (
              <div key={cat.value} className='flex items-center gap-3'>
                <div className={`w-2.5 h-2.5 rounded-full ${cat.color} flex-shrink-0`} />
                <span className='text-sm text-gray-600 flex-1'>{cat.label}</span>
                <span className='text-sm font-medium text-gray-900'>${cat.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent expenses */}
        <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
          <div className='flex justify-between items-center mb-3'>
            <p className='text-sm font-semibold text-gray-700'>Recent expenses</p>
            <Link to='/history' className='text-xs text-sky-600 hover:underline'>See all</Link>
          </div>
          {expenses.length === 0 ? (
            <p className='text-sm text-gray-400'>No expenses logged this week yet.</p>
          ) : (
            <div className='space-y-2'>
              {expenses.slice(0, 5).map(exp => {
                const cat = CATEGORIES.find(c => c.value === exp.category)
                return (
                  <div key={exp.id} className='flex items-center gap-3'>
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
      </div>

      {/* Quick add button */}
      <button
        onClick={() => setShowForm(true)}
        className='fixed bottom-6 right-6 bg-sky-600 hover:bg-sky-700 text-white rounded-full w-14 h-14 text-2xl shadow-lg shadow-sky-200 flex items-center justify-center transition-all hover:scale-105'
      >
        +
      </button>

      {/* Quick add modal */}
      {showForm && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50' onClick={() => setShowForm(false)}>
          <div className='bg-white w-full max-w-md rounded-2xl p-6' onClick={e => e.stopPropagation()}>
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
                      className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
                  className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors'
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
