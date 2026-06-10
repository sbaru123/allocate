import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const PALETTE = [
  { bg: 'bg-sky-400',    hex: '#38bdf8' },
  { bg: 'bg-violet-400', hex: '#a78bfa' },
  { bg: 'bg-emerald-400',hex: '#34d399' },
  { bg: 'bg-orange-400', hex: '#fb923c' },
  { bg: 'bg-pink-400',   hex: '#f472b6' },
  { bg: 'bg-yellow-400', hex: '#facc15' },
  { bg: 'bg-teal-400',   hex: '#2dd4bf' },
  { bg: 'bg-red-400',    hex: '#f87171' },
]

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

export default function Paycheck() {
  const navigate = useNavigate()
  const [weeklyLimit, setWeeklyLimit] = useState('')
  const [savedLimit, setSavedLimit] = useState<number | null>(null)
  const [paychecks, setPaychecks] = useState<Paycheck[]>([])
  const [paycheckAmount, setPaycheckAmount] = useState('')
  const [paycheckNote, setPaycheckNote] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [addingPaycheck, setAddingPaycheck] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newPct, setNewPct] = useState('')
  const [addingAllocation, setAddingAllocation] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPct, setEditPct] = useState('')

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

    const [budgetRes, paychecksRes, allocationsRes] = await Promise.all([
      supabase.from('budgets').select('weekly_limit').eq('user_id', user.id).single(),
      supabase.from('paychecks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('allocations').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    ])

    if (budgetRes.data) {
      setSavedLimit(budgetRes.data.weekly_limit)
      setWeeklyLimit(String(budgetRes.data.weekly_limit))
    }
    if (paychecksRes.data) setPaychecks(paychecksRes.data)
    if (allocationsRes.data) setAllocations(allocationsRes.data)
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

  async function addAllocation(e: React.FormEvent) {
    e.preventDefault()
    const pct = parseFloat(newPct)
    if (totalAllocated + pct > 100) return
    setAddingAllocation(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('allocations').insert({
      user_id: user.id,
      label: newLabel.trim(),
      percentage: pct,
    }).select().single()

    if (data) setAllocations(prev => [...prev, data])
    setNewLabel('')
    setNewPct('')
    setAddingAllocation(false)
  }

  async function deleteAllocation(id: string) {
    await supabase.from('allocations').delete().eq('id', id)
    setAllocations(prev => prev.filter(a => a.id !== id))
  }

  function startEdit(a: Allocation) {
    setEditingId(a.id)
    setEditLabel(a.label)
    setEditPct(String(a.percentage))
  }

  async function saveEdit(id: string) {
    const pct = parseFloat(editPct)
    const otherTotal = allocations.filter(a => a.id !== id).reduce((s, a) => s + a.percentage, 0)
    if (otherTotal + pct > 100) return

    await supabase.from('allocations').update({ label: editLabel.trim(), percentage: pct }).eq('id', id)
    setAllocations(prev => prev.map(a => a.id === id ? { ...a, label: editLabel.trim(), percentage: pct } : a))
    setEditingId(null)
  }

  const totalIncome = paychecks.reduce((sum, p) => sum + p.amount, 0)
  const latestPaycheck = paychecks[0]?.amount ?? 0
  const totalAllocated = allocations.reduce((s, a) => s + a.percentage, 0)
  const remaining = 100 - totalAllocated

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 flex justify-center px-8 py-8'>
        <div className='w-full max-w-2xl space-y-5'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>Paycheck</h1>
            <p className='text-sm text-gray-500'>Set your budget, log income, and allocate your earnings.</p>
          </div>

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

          {/* Paycheck allocation */}
          <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
            <div className='flex justify-between items-baseline mb-1'>
              <h2 className='text-sm font-semibold text-gray-800'>Paycheck allocation</h2>
              {latestPaycheck > 0 && (
                <span className='text-xs text-gray-400'>Based on last paycheck: ${latestPaycheck.toFixed(2)}</span>
              )}
            </div>
            <p className='text-xs text-gray-400 mb-4'>Distribute your paycheck into goals. Runs every paycheck.</p>

            {/* Progress bar — segmented by allocation color */}
            <div className='mb-4'>
              <div className='flex justify-between text-xs mb-1'>
                <span className='text-gray-500'>{totalAllocated.toFixed(0)}% allocated</span>
                <span className={remaining < 0 ? 'text-red-500' : 'text-gray-400'}>{remaining.toFixed(0)}% unallocated</span>
              </div>
              <div className='w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex'>
                {allocations.map((a, i) => (
                  <div
                    key={a.id}
                    className='h-full transition-all duration-500'
                    style={{
                      width: `${Math.min(a.percentage, 100)}%`,
                      backgroundColor: PALETTE[i % PALETTE.length].hex,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Allocation rows */}
            <div className='space-y-2 mb-4'>
              {allocations.length === 0 && (
                <p className='text-sm text-gray-400'>No allocations yet. Add one below.</p>
              )}
              {allocations.map((a, i) => (
                <div key={a.id} className='flex items-center gap-2'>
                  {editingId === a.id ? (
                    <>
                      <input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className='flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'
                        placeholder='Label'
                      />
                      <div className='relative w-24 flex-shrink-0'>
                        <input
                          type='number'
                          min='0.1'
                          max='100'
                          step='0.1'
                          value={editPct}
                          onChange={e => setEditPct(e.target.value)}
                          className='w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 pr-6'
                        />
                        <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400'>%</span>
                      </div>
                      <button onClick={() => saveEdit(a.id)} className='text-sky-600 hover:text-sky-800 text-xs font-semibold transition-colors'>Save</button>
                      <button onClick={() => setEditingId(null)} className='text-gray-400 hover:text-gray-600 text-xs transition-colors'>Cancel</button>
                    </>
                  ) : (
                    <>
                      <div className='flex-1 flex items-center gap-2 min-w-0'>
                        <div
                          className='w-2 h-2 rounded-full flex-shrink-0'
                          style={{ backgroundColor: PALETTE[i % PALETTE.length].hex }}
                        />
                        <span className='text-sm text-gray-800 truncate'>{a.label}</span>
                      </div>
                      <span className='text-sm font-semibold text-gray-700 w-12 text-right flex-shrink-0'>{a.percentage}%</span>
                      {latestPaycheck > 0 && (
                        <span className='text-xs text-gray-400 w-16 text-right flex-shrink-0'>
                          ${((a.percentage / 100) * latestPaycheck).toFixed(2)}
                        </span>
                      )}
                      <button onClick={() => startEdit(a)} className='text-gray-300 hover:text-sky-500 text-xs transition-colors ml-1'>✎</button>
                      <button onClick={() => deleteAllocation(a.id)} className='text-gray-300 hover:text-red-400 text-xs transition-colors'>✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add new allocation */}
            <form onSubmit={addAllocation} className='flex gap-2 items-center border-t border-gray-100 pt-4'>
              <input
                type='text'
                required
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                className='flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'
                placeholder='e.g. Roth IRA'
              />
              <div className='relative w-24 flex-shrink-0'>
                <input
                  type='number'
                  min='0.1'
                  max='100'
                  step='0.1'
                  required
                  value={newPct}
                  onChange={e => setNewPct(e.target.value)}
                  className='w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 pr-6'
                  placeholder='%'
                />
                <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400'>%</span>
              </div>
              <button
                type='submit'
                disabled={addingAllocation || totalAllocated >= 100}
                className='bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0'
              >
                Add
              </button>
            </form>

            {totalAllocated > 100 && (
              <p className='text-xs text-red-500 mt-2'>Total exceeds 100%. Please adjust your allocations.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
