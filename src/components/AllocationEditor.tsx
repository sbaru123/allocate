import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PayFrequency, Allocation } from '@/types'
import { supabase } from '@/lib/supabase'
import saveWeeklyBudget, { isSpendingLabel, weeklyFromPercent } from '@/lib/spendingBudget'
import syncGoalWithAllocationLabel from '@/lib/goalSync'

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

type Props = {
  allocations: Allocation[]
  latestPaycheck: number
  payFrequency: PayFrequency
}

export default function AllocationEditor({ allocations, latestPaycheck, payFrequency }: Props) {
  const queryClient = useQueryClient()

  const [newLabel, setNewLabel] = useState('')
  const [newPct, setNewPct] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editPct, setEditPct] = useState('')

  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)
  const unallocated = 100 - totalAllocated

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

      // Two-way sync: adding a Spending bucket sets the weekly budget
      if (isSpendingLabel(vars.label)) {
        await saveWeeklyBudget(user.id, weeklyFromPercent(vars.percentage, latestPaycheck, payFrequency))
      }
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const previous = allocations.find(function (a) { return a.id === vars.id })
      const { error } = await supabase.from('allocations')
        .update({ label: vars.label, percentage: vars.percentage })
        .eq('id', vars.id)
      if (error) throw error

      // Two-way sync: editing the Spending bucket updates the weekly budget.
      // Renaming a bucket away from Spending clears it; renaming one to
      // Spending sets it.
      const wasSpending = previous ? isSpendingLabel(previous.label) : false
      const nowSpending = isSpendingLabel(vars.label)
      if (nowSpending) {
        await saveWeeklyBudget(user.id, weeklyFromPercent(vars.percentage, latestPaycheck, payFrequency))
      } else if (wasSpending) {
        await saveWeeklyBudget(user.id, 0)
      }

      // Goal sync: a goal-linked bucket's percentage drives the goal's
      // paycheck %. Renaming the bucket away from the goal unlinks it
      // (removing only the allocation-driven amount).
      if (previous && previous.label.trim().toLowerCase() !== vars.label.trim().toLowerCase()) {
        await syncGoalWithAllocationLabel(user.id, previous.label, 0)
      }
      await syncGoalWithAllocationLabel(user.id, vars.label, vars.percentage)
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditingId(null)
    },
  })

  const deleteAllocationMutation = useMutation({
    mutationFn: async function (id: string) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const previous = allocations.find(function (a) { return a.id === id })
      await supabase.from('allocations').delete().eq('id', id)

      // Two-way sync: deleting the Spending bucket clears the weekly budget
      if (previous && isSpendingLabel(previous.label)) {
        await saveWeeklyBudget(user.id, 0)
      }

      // Goal sync: deleting a goal's bucket removes only the allocation-driven
      // amount — the goal itself and manual contributions stay.
      if (previous) {
        await syncGoalWithAllocationLabel(user.id, previous.label, 0)
      }
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function handleAdd(e: React.FormEvent) {
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
    const otherTotal = allocations
      .filter(function (a) { return a.id !== id })
      .reduce(function (s, a) { return s + a.percentage }, 0)
    if (otherTotal + pct > 100) return
    updateAllocationMutation.mutate({ id, label: editLabel.trim(), percentage: pct })
  }

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex justify-between items-baseline mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Paycheck Allocation</h2>
        {latestPaycheck > 0 && (
          <span className='text-xs text-gray-400 dark:text-slate-500'>Based on last paycheck: ${latestPaycheck.toFixed(2)}</span>
        )}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-4'>Distribute your paycheck into goals. Runs every paycheck.</p>

      {/* Segmented bar */}
      <div className='mb-4'>
        <div className='flex justify-between text-xs mb-1'>
          <span className='text-gray-500 dark:text-slate-400'>{totalAllocated.toFixed(0)}% allocated</span>
          <span className={unallocated < 0 ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'}>
            {unallocated.toFixed(0)}% unallocated
          </span>
        </div>
        <div className='w-full bg-gray-100 dark:bg-[#0a1628] rounded-full h-2.5 overflow-hidden flex'>
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

      {/* Allocation rows */}
      <div className='space-y-2 mb-4'>
        {allocations.length === 0 && (
          <p className='text-sm text-gray-400 dark:text-slate-500'>No allocations yet. Add one below.</p>
        )}
        {allocations.map(function (a, i) {
          return (
            <div key={a.id} className='flex items-center gap-2'>
              {editingId === a.id ? (
                <>
                  <input
                    value={editLabel}
                    onChange={function (e) { setEditLabel(e.target.value) }}
                    className='flex-1 border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-400 dark:placeholder:text-slate-600'
                    placeholder='Label'
                  />
                  <div className='relative w-24 flex-shrink-0'>
                    <input
                      type='number'
                      min='1'
                      max='100'
                      step='1'
                      value={editPct}
                      onChange={function (e) { setEditPct(e.target.value) }}
                      className='w-full border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 pr-6'
                    />
                    <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500'>%</span>
                  </div>
                  <button
                    onClick={function () { handleSaveEdit(a.id) }}
                    disabled={updateAllocationMutation.isPending}
                    className='text-sky-600 hover:text-sky-800 dark:hover:text-sky-400 text-xs font-semibold transition-colors disabled:opacity-50'
                  >
                    Save
                  </button>
                  <button
                    onClick={function () { setEditingId(null) }}
                    className='text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xs transition-colors'
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
                    <span className='text-sm text-gray-800 dark:text-slate-200 truncate'>{a.label}</span>
                  </div>
                  <span className='text-sm font-semibold text-gray-700 dark:text-slate-300 w-10 text-right flex-shrink-0'>{a.percentage}%</span>
                  {latestPaycheck > 0 && (
                    <span className='text-xs text-gray-400 dark:text-slate-500 w-16 text-right flex-shrink-0'>
                      ${((a.percentage / 100) * latestPaycheck).toFixed(2)}
                    </span>
                  )}
                  <button
                    onClick={function () { startEdit(a) }}
                    className='text-gray-300 dark:text-slate-600 hover:text-sky-500 dark:hover:text-sky-400 text-xs transition-colors ml-1'
                  >
                    ✎
                  </button>
                  <button
                    onClick={function () { deleteAllocationMutation.mutate(a.id) }}
                    className='text-gray-300 dark:text-slate-600 hover:text-red-400 text-xs transition-colors'
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add allocation form */}
      <form onSubmit={handleAdd} className='flex gap-2 items-center border-t border-gray-100 dark:border-[#1e3354] pt-4'>
        <input
          type='text'
          required
          value={newLabel}
          onChange={function (e) { setNewLabel(e.target.value) }}
          className='flex-1 border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-400 dark:placeholder:text-slate-600'
          placeholder='e.g. Roth IRA'
        />
        <div className='relative w-20 flex-shrink-0'>
          <input
            type='number'
            min='1'
            max='100'
            step='1'
            required
            value={newPct}
            onChange={function (e) { setNewPct(e.target.value) }}
            className='w-full border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 pr-6 placeholder:text-gray-400 dark:placeholder:text-slate-600'
            placeholder='%'
          />
          <span className='absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500'>%</span>
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
  )
}
