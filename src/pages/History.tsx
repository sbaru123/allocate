import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
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

export default function History() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(function () {
    checkAuth()
    fetchExpenses()
  }, [])

  async function checkAuth() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) navigate('/login')
  }

  async function fetchExpenses() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setExpenses(data)
    setLoading(false)
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.category === filter)

  const grouped: Record<string, Expense[]> = {}
  filtered.forEach(exp => {
    const date = new Date(exp.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(exp)
  })

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 max-w-xl px-4 py-6 space-y-4'>
        <div>
          <h1 className='text-xl font-bold text-gray-900'>History</h1>
          <p className='text-sm text-gray-500'>Review and filter your logged expenses.</p>
        </div>

        {/* Category filter */}
        <div className='flex gap-2 overflow-x-auto pb-1'>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              filter === 'all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === cat.value ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading && <p className='text-sm text-gray-400'>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <p className='text-sm text-gray-400'>No expenses found.</p>
        )}

        {Object.entries(grouped).map(([date, exps]) => (
          <div key={date}>
            <div className='flex justify-between items-baseline mb-2'>
              <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{date}</p>
              <p className='text-xs text-gray-400'>${exps.reduce((s, e) => s + e.amount, 0).toFixed(2)}</p>
            </div>
            <div className='bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100'>
              {exps.map(exp => {
                const cat = CATEGORIES.find(c => c.value === exp.category)
                return (
                  <div key={exp.id} className='flex items-center gap-3 px-4 py-3'>
                    <div className={`w-2 h-2 rounded-full ${cat?.color ?? 'bg-gray-300'} flex-shrink-0`} />
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm text-gray-800 truncate'>{exp.note || cat?.label}</p>
                      <p className='text-xs text-gray-400'>{cat?.label}</p>
                    </div>
                    <p className='text-sm font-semibold text-gray-900 mr-2'>${exp.amount.toFixed(2)}</p>
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className='text-gray-300 hover:text-red-400 text-xs transition-colors'
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
