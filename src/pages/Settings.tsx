import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Paycheck = {
  id: string
  amount: number
  note: string
  created_at: string
}

export default function Settings() {
  const navigate = useNavigate()
  const [weeklyLimit, setWeeklyLimit] = useState('')
  const [savedLimit, setSavedLimit] = useState<number | null>(null)
  const [paychecks, setPaychecks] = useState<Paycheck[]>([])
  const [paycheckAmount, setPaycheckAmount] = useState('')
  const [paycheckNote, setPaycheckNote] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [addingPaycheck, setAddingPaycheck] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

  useEffect(function () {
    checkAuth()
    fetchSettings()
  }, [])

  async function checkAuth() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) navigate('/login')
  }

  async function fetchSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [budgetRes, paychecksRes] = await Promise.all([
      supabase.from('budgets').select('weekly_limit').eq('user_id', user.id).single(),
      supabase.from('paychecks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    if (budgetRes.data) {
      setSavedLimit(budgetRes.data.weekly_limit)
      setWeeklyLimit(String(budgetRes.data.weekly_limit))
    }
    if (paychecksRes.data) setPaychecks(paychecksRes.data)
  }

  async function saveBudget(e: React.FormEvent) {
    e.preventDefault()
    setSavingBudget(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('budgets').upsert(
      { user_id: user.id, weekly_limit: parseFloat(weeklyLimit) },
      { onConflict: 'user_id' }
    )

    setSavedLimit(parseFloat(weeklyLimit))
    setBudgetSaved(true)
    setTimeout(() => setBudgetSaved(false), 2000)
    setSavingBudget(false)
  }

  async function addPaycheck(e: React.FormEvent) {
    e.preventDefault()
    setAddingPaycheck(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('paychecks').insert({
      user_id: user.id,
      amount: parseFloat(paycheckAmount),
      note: paycheckNote,
    }).select().single()

    if (data) setPaychecks(prev => [data, ...prev])
    setPaycheckAmount('')
    setPaycheckNote('')
    setAddingPaycheck(false)
  }

  async function deletePaycheck(id: string) {
    await supabase.from('paychecks').delete().eq('id', id)
    setPaychecks(prev => prev.filter(p => p.id !== id))
  }

  const totalIncome = paychecks.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className='min-h-screen bg-gray-50'>
      <nav className='bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3'>
        <Link to='/' className='text-gray-400 hover:text-gray-700 text-sm'>← Back</Link>
        <span className='font-bold text-sky-700 tracking-tight'>Settings</span>
      </nav>

      <div className='max-w-xl mx-auto px-4 py-6 space-y-5'>

        {/* Weekly budget */}
        <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
          <h2 className='text-sm font-semibold text-gray-800 mb-1'>Weekly budget</h2>
          {savedLimit !== null && (
            <p className='text-xs text-gray-400 mb-3'>Current limit: ${savedLimit.toFixed(2)}/week</p>
          )}
          <form onSubmit={saveBudget} className='flex gap-2'>
            <input
              type='number'
              step='0.01'
              min='0'
              required
              value={weeklyLimit}
              onChange={e => setWeeklyLimit(e.target.value)}
              className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
              placeholder='e.g. 200'
            />
            <button
              type='submit'
              disabled={savingBudget}
              className='bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
            >
              {budgetSaved ? 'Saved!' : 'Save'}
            </button>
          </form>
        </div>

        {/* Log a paycheck */}
        <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
          <div className='flex justify-between items-baseline mb-3'>
            <h2 className='text-sm font-semibold text-gray-800'>Log a paycheck</h2>
            <span className='text-xs text-gray-400'>Total logged: ${totalIncome.toFixed(2)}</span>
          </div>
          <form onSubmit={addPaycheck} className='space-y-3'>
            <div className='flex gap-2'>
              <input
                type='number'
                step='0.01'
                min='0'
                required
                value={paycheckAmount}
                onChange={e => setPaycheckAmount(e.target.value)}
                className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                placeholder='Amount ($)'
              />
              <input
                type='text'
                value={paycheckNote}
                onChange={e => setPaycheckNote(e.target.value)}
                className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400'
                placeholder='Note (e.g. Week 1)'
              />
            </div>
            <button
              type='submit'
              disabled={addingPaycheck}
              className='w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors'
            >
              {addingPaycheck ? 'Adding...' : 'Add paycheck'}
            </button>
          </form>

          {paychecks.length > 0 && (
            <div className='mt-4 divide-y divide-gray-100'>
              {paychecks.map(p => (
                <div key={p.id} className='flex items-center py-2 gap-3'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm text-gray-800'>${p.amount.toFixed(2)}</p>
                    <p className='text-xs text-gray-400'>
                      {p.note && `${p.note} · `}
                      {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deletePaycheck(p.id)}
                    className='text-gray-300 hover:text-red-400 text-xs transition-colors'
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
