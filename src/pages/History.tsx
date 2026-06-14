import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

type Category = 'food' | 'transport' | 'entertainment' | 'housing' | 'other'

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'food',          label: 'Food & Dining',  color: 'bg-orange-400' },
  { value: 'transport',     label: 'Transport',       color: 'bg-blue-400'   },
  { value: 'entertainment', label: 'Entertainment',   color: 'bg-purple-400' },
  { value: 'housing',       label: 'Housing',         color: 'bg-yellow-400' },
  { value: 'other',         label: 'Other',           color: 'bg-gray-400'   },
]

type Expense = {
  id: string
  amount: number
  category: Category
  note: string
  created_at: string
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchExpenses(): Promise<Expense[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data ?? []
}

export default function History() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('food')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')

  // Auth check
  useEffect(function () {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) navigate('/login')
    }
    checkAuth()
  }, [navigate])

  // Data query
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: fetchExpenses,
    staleTime: 5 * 60 * 1000,
  })

  // Mutations
  const deleteExpenseMutation = useMutation({
    mutationFn: async function (id: string) {
      await supabase.from('expenses').delete().eq('id', id)
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const editExpenseMutation = useMutation({
    mutationFn: async function (vars: { id: string; amount: number; category: Category; note: string; date: string }) {
      const { error } = await supabase.from('expenses').update({
        amount: vars.amount,
        category: vars.category,
        note: vars.note,
        created_at: new Date(vars.date + 'T12:00:00').toISOString(),
      }).eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingExpense(null)
    },
  })

  function startEdit(exp: Expense) {
    setEditingExpense(exp)
    setEditAmount(String(exp.amount))
    setEditCategory(exp.category)
    setEditNote(exp.note)
    setEditDate(localDateStr(new Date(exp.created_at)))
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    editExpenseMutation.mutate({
      id: editingExpense.id,
      amount: parseFloat(editAmount),
      category: editCategory,
      note: editNote,
      date: editDate,
    })
  }

  // Derived
  const filtered = filter === 'all' ? expenses : expenses.filter(function (e) { return e.category === filter })

  const grouped: Record<string, Expense[]> = {}
  filtered.forEach(function (exp) {
    const date = new Date(exp.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric',
    })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(exp)
  })

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 flex justify-center px-8 py-8'>
        <div className='w-full max-w-2xl space-y-4'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>History</h1>
            <p className='text-sm text-gray-500'>Review and manage your logged expenses.</p>
          </div>

          {/* Category filter */}
          <div className='flex gap-2 overflow-x-auto pb-1'>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === 'all'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-sky-100'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(function (cat) {
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                    filter === cat.value
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-sky-100'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {isLoading && <p className='text-sm text-gray-400'>Loading...</p>}

          {!isLoading && filtered.length === 0 && (
            <p className='text-sm text-gray-400'>No expenses found.</p>
          )}

          {Object.entries(grouped).map(function ([date, exps]) {
            return (
              <div key={date}>
                <div className='flex justify-between items-baseline mb-2'>
                  <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>{date}</p>
                  <p className='text-xs text-gray-400'>${exps.reduce(function (s, e) { return s + e.amount }, 0).toFixed(2)}</p>
                </div>
                <div className='bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100'>
                  {exps.map(function (exp) {
                    const cat = CATEGORIES.find(function (c) { return c.value === exp.category })
                    return (
                      <div
                        key={exp.id}
                        onClick={() => startEdit(exp)}
                        className='flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group'
                      >
                        <div className={`w-2 h-2 rounded-full ${cat?.color ?? 'bg-gray-300'} flex-shrink-0`} />
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm text-gray-800 truncate group-hover:underline'>{exp.note || cat?.label}</p>
                          <p className='text-xs text-gray-400'>{cat?.label}</p>
                        </div>
                        <p className='text-sm font-semibold text-gray-900 group-hover:text-sky-600 transition-colors mr-1'>${exp.amount.toFixed(2)}</p>
                        <button
                          onClick={function (e) { e.stopPropagation(); deleteExpenseMutation.mutate(exp.id) }}
                          className='text-gray-300 hover:text-red-400 text-xs transition-colors px-1'
                          aria-label='Delete expense'
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Edit expense modal */}
      {editingExpense && (
        <div
          className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'
          onClick={() => setEditingExpense(null)}
        >
          <div
            className='bg-white w-full max-w-md rounded-2xl p-6'
            onClick={function (e) { e.stopPropagation() }}
          >
            <h2 className='text-lg font-bold text-gray-900 mb-4 text-center'>Edit expense</h2>
            <form onSubmit={handleSaveEdit} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Amount ($)</label>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  required
                  autoFocus
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
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
                        onClick={() => setEditCategory(cat.value)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-colors active:scale-[0.97] ${
                          editCategory === cat.value
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
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                  placeholder='e.g. Chipotle, Metro card...'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Date</label>
                <input
                  type='date'
                  required
                  value={editDate}
                  max={localDateStr(new Date())}
                  onChange={e => setEditDate(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                />
              </div>
              <div className='flex gap-2 pt-1'>
                <button
                  type='button'
                  onClick={() => setEditingExpense(null)}
                  className='flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors active:scale-[0.97]'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={editExpenseMutation.isPending}
                  className='flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors active:scale-[0.97]'
                >
                  {editExpenseMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
