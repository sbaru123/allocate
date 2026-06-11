import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'

const PALETTE = [
  { bg: 'bg-sky-400',     hex: '#38bdf8' },
  { bg: 'bg-violet-400',  hex: '#a78bfa' },
  { bg: 'bg-emerald-400', hex: '#34d399' },
  { bg: 'bg-orange-400',  hex: '#fb923c' },
  { bg: 'bg-pink-400',    hex: '#f472b6' },
  { bg: 'bg-yellow-400',  hex: '#facc15' },
  { bg: 'bg-teal-400',    hex: '#2dd4bf' },
  { bg: 'bg-red-400',     hex: '#f87171' },
]

type PayFrequency = 'weekly' | 'biweekly' | 'monthly'

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

type PaycheckData = {
  payFrequency: PayFrequency
  paychecks: Paycheck[]
  allocations: Allocation[]
}

const FREQ_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

async function fetchPaycheckData(): Promise<PaycheckData> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [budgetRes, paychecksRes, allocationsRes] = await Promise.all([
    supabase.from('budgets').select('pay_frequency').eq('user_id', user.id).single(),
    supabase.from('paychecks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('allocations').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])

  return {
    payFrequency: (budgetRes.data?.pay_frequency as PayFrequency) ?? 'biweekly',
    paychecks: paychecksRes.data ?? [],
    allocations: allocationsRes.data ?? [],
  }
}

export default function Paycheck() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form state
  const [paycheckAmount, setPaycheckAmount] = useState('')
  const [paycheckNote, setPaycheckNote] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newPct, setNewPct] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPct, setEditPct] = useState('')
  const [freqSaved, setFreqSaved] = useState(false)

  // Auth check
  useEffect(function () {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) navigate('/login')
    }
    checkAuth()
  }, [navigate])

  // Data query
  const { data } = useQuery({
    queryKey: ['paycheck'],
    queryFn: fetchPaycheckData,
    staleTime: 5 * 60 * 1000,
  })

  const payFrequency = data?.payFrequency ?? 'biweekly'
  const paychecks = data?.paychecks ?? []
  const allocations = data?.allocations ?? []

  // Mutations
  const saveFrequencyMutation = useMutation({
    mutationFn: async function (freq: PayFrequency) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabase.from('budgets').upsert(
        { user_id: user.id, pay_frequency: freq },
        { onConflict: 'user_id' }
      )
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setFreqSaved(true)
      setTimeout(function () { setFreqSaved(false) }, 1500)
    },
  })

  const addPaycheckMutation = useMutation({
    mutationFn: async function (vars: { amount: number; note: string }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('paychecks').insert({
        user_id: user.id,
        amount: vars.amount,
        note: vars.note,
      })
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPaycheckAmount('')
      setPaycheckNote('')
    },
  })

  const deletePaycheckMutation = useMutation({
    mutationFn: async function (id: string) {
      await supabase.from('paychecks').delete().eq('id', id)
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const addAllocationMutation = useMutation({
    mutationFn: async function (vars: { label: string; percentage: number }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('allocations').insert({
        user_id: user.id,
        label: vars.label,
        percentage: vars.percentage,
      })
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setNewLabel('')
      setNewPct('')
    },
  })

  const updateAllocationMutation = useMutation({
    mutationFn: async function (vars: { id: string; label: string; percentage: number }) {
      const { error } = await supabase.from('allocations')
        .update({ label: vars.label, percentage: vars.percentage })
        .eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingId(null)
    },
  })

  const deleteAllocationMutation = useMutation({
    mutationFn: async function (id: string) {
      await supabase.from('allocations').delete().eq('id', id)
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // Handlers
  function handleAddPaycheck(e: React.FormEvent) {
    e.preventDefault()
    addPaycheckMutation.mutate({
      amount: parseFloat(paycheckAmount),
      note: paycheckNote,
    })
  }

  function handleAddAllocation(e: React.FormEvent) {
    e.preventDefault()
    const pct = parseFloat(newPct)
    if (totalAllocated + pct > 100) return
    addAllocationMutation.mutate({ label: newLabel.trim(), percentage: pct })
  }

  function startEdit(a: Allocation) {
    setEditingId(a.id)
    setEditLabel(a.label)
    setEditPct(String(a.percentage))
  }

  function handleSaveEdit(id: string) {
    const pct = parseFloat(editPct)
    const otherTotal = allocations.filter(function (a) { return a.id !== id }).reduce(function (s, a) { return s + a.percentage }, 0)
    if (otherTotal + pct > 100) return
    updateAllocationMutation.mutate({ id, label: editLabel.trim(), percentage: pct })
  }

  // Derived
  const totalIncome = paychecks.reduce(function (sum, p) { return sum + p.amount }, 0)
  const latestPaycheck = paychecks[0]?.amount ?? 0
  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)
  const unallocated = 100 - totalAllocated
  const weeksPerPeriod = payFrequency === 'weekly' ? 1 : payFrequency === 'monthly' ? 4 : 2
  const weeklySpendingBudget = latestPaycheck > 0
    ? (latestPaycheck * Math.max(unallocated, 0) / 100) / weeksPerPeriod
    : 0

  return (
    <div className='min-h-screen bg-gray-50'>
      <Sidebar />

      <main className='ml-56 flex justify-center px-8 py-8'>
        <div className='w-full max-w-2xl space-y-5'>
          <div>
            <h1 className='text-xl font-bold text-gray-900'>Paycheck</h1>
            <p className='text-sm text-gray-500'>Set your pay frequency, log income, and allocate your earnings.</p>
          </div>

          {/* Pay frequency */}
          <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
            <div className='flex items-baseline justify-between mb-1'>
              <h2 className='text-sm font-semibold text-gray-800'>Pay frequency</h2>
              {freqSaved && <span className='text-xs text-emerald-500 font-medium'>Saved ✓</span>}
            </div>
            <p className='text-xs text-gray-400 mb-4'>How often do you receive a paycheck?</p>
            <div className='flex gap-2'>
              {(['weekly', 'biweekly', 'monthly'] as const).map(function (freq) {
                return (
                  <button
                    key={freq}
                    type='button'
                    onClick={() => saveFrequencyMutation.mutate(freq)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      payFrequency === freq
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {FREQ_LABELS[freq]}
                  </button>
                )
              })}
            </div>
            {weeklySpendingBudget > 0 && (
              <p className='text-xs text-gray-400 mt-3'>
                Est. weekly spending budget:{' '}
                <span className='font-semibold text-gray-700'>${weeklySpendingBudget.toFixed(2)}</span>
                {' '}— ${latestPaycheck.toFixed(2)} paycheck with {unallocated.toFixed(0)}% unallocated.
              </p>
            )}
          </div>

          {/* Log a paycheck */}
          <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
            <div className='flex justify-between items-baseline mb-3'>
              <h2 className='text-sm font-semibold text-gray-800'>Log a paycheck</h2>
              <span className='text-xs text-gray-400'>Total logged: ${totalIncome.toFixed(2)}</span>
            </div>
            <form onSubmit={handleAddPaycheck} className='space-y-3'>
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
                disabled={addPaycheckMutation.isPending}
                className='w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors'
              >
                {addPaycheckMutation.isPending ? 'Adding...' : 'Add paycheck'}
              </button>
            </form>

            {paychecks.length > 0 && (
              <div className='mt-4 divide-y divide-gray-100'>
                {paychecks.map(function (p) {
                  return (
                    <div key={p.id} className='flex items-center py-2 gap-3'>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm text-gray-800'>${p.amount.toFixed(2)}</p>
                        <p className='text-xs text-gray-400'>
                          {p.note && `${p.note} · `}
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deletePaycheckMutation.mutate(p.id)}
                        className='text-gray-300 hover:text-red-400 text-xs transition-colors'
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
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

            <div className='mb-4'>
              <div className='flex justify-between text-xs mb-1'>
                <span className='text-gray-500'>{totalAllocated.toFixed(0)}% allocated</span>
                <span className={unallocated < 0 ? 'text-red-500' : 'text-gray-400'}>
                  {unallocated.toFixed(0)}% unallocated
                </span>
              </div>
              <div className='w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex'>
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
            </div>

            <div className='space-y-2 mb-4'>
              {allocations.length === 0 && (
                <p className='text-sm text-gray-400'>No allocations yet. Add one below.</p>
              )}
              {allocations.map(function (a, i) {
                return (
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
                        <button
                          onClick={() => handleSaveEdit(a.id)}
                          disabled={updateAllocationMutation.isPending}
                          className='text-sky-600 hover:text-sky-800 text-xs font-semibold transition-colors disabled:opacity-50'
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className='text-gray-400 hover:text-gray-600 text-xs transition-colors'
                        >
                          Cancel
                        </button>
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
                        <button onClick={() => deleteAllocationMutation.mutate(a.id)} className='text-gray-300 hover:text-red-400 text-xs transition-colors'>✕</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleAddAllocation} className='flex gap-2 items-center border-t border-gray-100 pt-4'>
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
                disabled={addAllocationMutation.isPending || totalAllocated >= 100}
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
