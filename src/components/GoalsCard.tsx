import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PayFrequency, Allocation, Goal, GoalContribution } from '@/types'
import { supabase } from '@/lib/supabase'
import { weeklyFromPercent } from '@/lib/spendingBudget'
import { ALLOCATION_CONTRIB_NOTE } from '@/lib/goalSync'

type Props = {
  goals: Goal[]
  contributions: GoalContribution[]
  allocations: Allocation[]
  latestPaycheck: number
  payFrequency: PayFrequency
}

type GoalStatus = 'achieved' | 'on-track' | 'behind' | 'overdue'

function parseLocalDate(dateStr: string) {
  return new Date(`${dateStr.slice(0, 10)}T00:00:00`)
}

function formatDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getPace(progress: number, goal: Goal, weeklyContribution: number): { status: GoalStatus; neededPerWeek: number | null } {
  if (progress >= goal.target_amount) return { status: 'achieved', neededPerWeek: null }
  const now = new Date()
  const target = parseLocalDate(goal.target_date)
  if (target < now) return { status: 'overdue', neededPerWeek: null }
  const weeksLeft = Math.max((target.getTime() - now.getTime()) / (7 * 86400000), 0.01)
  const neededPerWeek = (goal.target_amount - progress) / weeksLeft
  return { status: weeklyContribution >= neededPerWeek ? 'on-track' : 'behind', neededPerWeek }
}

const STATUS_STYLES: Record<GoalStatus, { label: string; text: string; bar: string }> = {
  achieved:  { label: 'Achieved ✓', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-400' },
  'on-track': { label: 'On track',   text: 'text-sky-600 dark:text-sky-400',         bar: 'bg-sky-400' },
  behind:    { label: 'Behind',      text: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-400' },
  overdue:   { label: 'Past due',    text: 'text-red-500',                            bar: 'bg-red-400' },
}

export default function GoalsCard({ goals, contributions, allocations, latestPaycheck, payFrequency }: Props) {
  const queryClient = useQueryClient()

  // Add-goal form
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState('')
  const [pct, setPct] = useState('')
  const [formError, setFormError] = useState('')

  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)

  function findAllocationByLabel(label: string) {
    return allocations.find(function (a) {
      return a.label.trim().toLowerCase() === label.trim().toLowerCase()
    })
  }

  // Per-goal contribution form
  const [contribGoalId, setContribGoalId] = useState<string | null>(null)
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')

  // Per-goal edit form
  const [editGoalId, setEditGoalId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editPct, setEditPct] = useState('')
  const [editError, setEditError] = useState('')

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['paycheck'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addGoalMutation = useMutation({
    mutationFn: async function (vars: { name: string; target: number; date: string; pct: number }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: inserted, error } = await supabase.from('goals').insert({
        user_id: user.id,
        name: vars.name,
        target_amount: vars.target,
        target_date: vars.date,
        allocation_pct: vars.pct,
      }).select().single()
      if (error) throw error

      // Credit the current paycheck immediately — future paychecks accrue
      // automatically as they're logged, but the latest one predates the goal
      // so it would otherwise never count.
      if (vars.pct > 0 && latestPaycheck > 0 && inserted) {
        const initialAmount = Math.round(latestPaycheck * vars.pct) / 100
        const contrib = await supabase.from('goal_contributions').insert({
          goal_id: inserted.id,
          user_id: user.id,
          amount: initialAmount,
          note: ALLOCATION_CONTRIB_NOTE,
        })
        if (contrib.error) console.error('[goals] initial contribution:', contrib.error)
      }

      // Mirror the goal into the allocation buckets under the goal's name
      if (vars.pct > 0) {
        const existing = findAllocationByLabel(vars.name)
        if (existing) {
          const upd = await supabase.from('allocations')
            .update({ percentage: vars.pct })
            .eq('id', existing.id)
          if (upd.error) throw upd.error
        } else {
          const ins = await supabase.from('allocations')
            .insert({ user_id: user.id, label: vars.name, percentage: vars.pct })
          if (ins.error) throw ins.error
        }
      }
    },
    onSuccess: function () {
      invalidate()
      setName('')
      setTarget('')
      setDate('')
      setPct('')
      setFormError('')
      setShowAddForm(false)
    },
  })

  const deleteGoalMutation = useMutation({
    mutationFn: async function (goal: Goal) {
      const { error } = await supabase.from('goals').delete().eq('id', goal.id)
      if (error) throw error

      // Remove the mirrored allocation bucket too
      if (goal.allocation_pct > 0) {
        const existing = findAllocationByLabel(goal.name)
        if (existing) {
          await supabase.from('allocations').delete().eq('id', existing.id)
        }
      }
    },
    onSuccess: invalidate,
  })

  const updateGoalMutation = useMutation({
    mutationFn: async function (vars: { goal: Goal; name: string; target: number; date: string; pct: number }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('goals')
        .update({ name: vars.name, target_amount: vars.target, target_date: vars.date, allocation_pct: vars.pct })
        .eq('id', vars.goal.id)
      if (error) throw error

      // Keep the mirrored allocation bucket in sync (label + percentage)
      const existingBucket = findAllocationByLabel(vars.goal.name)
      if (vars.pct > 0) {
        if (existingBucket) {
          const upd = await supabase.from('allocations')
            .update({ label: vars.name, percentage: vars.pct })
            .eq('id', existingBucket.id)
          if (upd.error) throw upd.error
        } else {
          const ins = await supabase.from('allocations')
            .insert({ user_id: user.id, label: vars.name, percentage: vars.pct })
          if (ins.error) throw ins.error
        }
      } else if (existingBucket) {
        // Percentage cleared — remove the bucket and the allocation-driven credit
        await supabase.from('allocations').delete().eq('id', existingBucket.id)
        await supabase.from('goal_contributions').delete()
          .eq('goal_id', vars.goal.id).eq('note', ALLOCATION_CONTRIB_NOTE)
      }

      // Newly enabling a percentage credits the current paycheck, same as creation
      if (vars.goal.allocation_pct === 0 && vars.pct > 0 && latestPaycheck > 0) {
        const alreadyCredited = contributions.some(function (c) {
          return c.goal_id === vars.goal.id && c.note === ALLOCATION_CONTRIB_NOTE
        })
        if (!alreadyCredited) {
          const contrib = await supabase.from('goal_contributions').insert({
            goal_id: vars.goal.id,
            user_id: user.id,
            amount: Math.round(latestPaycheck * vars.pct) / 100,
            note: ALLOCATION_CONTRIB_NOTE,
          })
          if (contrib.error) console.error('[goals] initial contribution:', contrib.error)
        }
      }
    },
    onSuccess: function () {
      invalidate()
      setEditGoalId(null)
      setEditError('')
    },
  })

  const addContributionMutation = useMutation({
    mutationFn: async function (vars: { goalId: string; amount: number; note: string }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('goal_contributions').insert({
        goal_id: vars.goalId,
        user_id: user.id,
        amount: vars.amount,
        note: vars.note,
      })
      if (error) throw error
    },
    onSuccess: function () {
      invalidate()
      setContribGoalId(null)
      setContribAmount('')
      setContribNote('')
    },
  })

  function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const targetNum = parseFloat(target)
    const pctNum = parseFloat(pct) || 0
    if (!name.trim() || !(targetNum > 0) || !date) return

    // The goal's % becomes an allocation bucket — make sure it fits in 100%
    if (pctNum > 0) {
      const existing = findAllocationByLabel(name)
      const otherTotal = totalAllocated - (existing?.percentage ?? 0)
      if (otherTotal + pctNum > 100) {
        setFormError(`Your buckets already use ${otherTotal.toFixed(0)}%, so this goal can't take more than ${(100 - otherTotal).toFixed(0)}%.`)
        return
      }
    }

    addGoalMutation.mutate({ name: name.trim(), target: targetNum, date, pct: pctNum })
  }

  function handleAddContribution(e: React.FormEvent, goalId: string) {
    e.preventDefault()
    const amountNum = parseFloat(contribAmount)
    if (!(amountNum > 0)) return
    addContributionMutation.mutate({ goalId, amount: amountNum, note: contribNote.trim() })
  }

  function startEditGoal(goal: Goal) {
    setEditGoalId(goal.id)
    setEditName(goal.name)
    setEditTarget(String(goal.target_amount))
    setEditDate(goal.target_date.slice(0, 10))
    setEditPct(goal.allocation_pct > 0 ? String(goal.allocation_pct) : '')
    setEditError('')
    setContribGoalId(null)
  }

  function handleSaveGoalEdit(e: React.FormEvent, goal: Goal) {
    e.preventDefault()
    setEditError('')
    const targetNum = parseFloat(editTarget)
    const pctNum = parseFloat(editPct) || 0
    if (!editName.trim() || !(targetNum > 0) || !editDate) return

    // The goal's % lives inside the 100% allocation — make sure it fits
    if (pctNum > 0) {
      const ownBucket = findAllocationByLabel(goal.name)
      const otherTotal = totalAllocated - (ownBucket?.percentage ?? 0)
      if (otherTotal + pctNum > 100) {
        setEditError(`Your other buckets use ${otherTotal.toFixed(0)}%, so this goal can't take more than ${(100 - otherTotal).toFixed(0)}%.`)
        return
      }
    }

    updateGoalMutation.mutate({ goal, name: editName.trim(), target: targetNum, date: editDate, pct: pctNum })
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] px-3 py-2 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 placeholder:text-gray-300 dark:placeholder:text-slate-600'

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Goals</h2>
        {!showAddForm && (
          <button
            type='button'
            onClick={function () { setShowAddForm(true) }}
            className='text-xs font-semibold text-sky-600 hover:text-sky-700 dark:hover:text-sky-400 transition-colors'
          >
            + New Goal
          </button>
        )}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-4'>
        Save at least $X for something by a date. Progress grows automatically from your paycheck % — plus any bonuses you log.
      </p>

      {/* Add goal form */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className='border border-gray-100 dark:border-[#1e3354] rounded-xl p-3 mb-4 space-y-2'>
          <input
            type='text'
            required
            value={name}
            onChange={function (e) { setName(e.target.value) }}
            placeholder='e.g. Spring break trip'
            className={inputClass}
          />
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'>$</span>
              <input
                type='number'
                min='1'
                step='0.01'
                required
                value={target}
                onChange={function (e) { setTarget(e.target.value) }}
                placeholder='1200'
                className={`${inputClass} pl-7`}
              />
            </div>
            <input
              type='date'
              required
              value={date}
              onChange={function (e) { setDate(e.target.value) }}
              className={`${inputClass} flex-1`}
            />
          </div>
          <div className='relative'>
            <input
              type='number'
              min='0'
              max='100'
              step='0.5'
              value={pct}
              onChange={function (e) { setPct(e.target.value) }}
              placeholder='% of each paycheck (optional)'
              className={`${inputClass} pr-8`}
            />
            <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'>%</span>
          </div>
          {formError && <p className='text-xs text-red-500'>{formError}</p>}
          <div className='flex gap-2'>
            <button
              type='submit'
              disabled={addGoalMutation.isPending}
              className='flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors'
            >
              {addGoalMutation.isPending ? 'Adding…' : 'Add Goal'}
            </button>
            <button
              type='button'
              onClick={function () { setShowAddForm(false) }}
              className='py-1.5 px-3 rounded-lg border border-gray-200 dark:border-[#1e3354] text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] transition-colors'
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Goal list */}
      {goals.length === 0 && !showAddForm ? (
        <p className='text-sm text-gray-400 dark:text-slate-500'>No goals yet. Add one to start tracking.</p>
      ) : (
        <div className='space-y-4'>
          {goals.map(function (goal) {
            // Progress is fully materialized: paycheck credits + manual contributions
            const progress = contributions
              .filter(function (c) { return c.goal_id === goal.id })
              .reduce(function (s, c) { return s + c.amount }, 0)
            const weeklyContribution = weeklyFromPercent(goal.allocation_pct, latestPaycheck, payFrequency)
            const { status, neededPerWeek } = getPace(progress, goal, weeklyContribution)
            const style = STATUS_STYLES[status]
            const barPct = Math.min((progress / goal.target_amount) * 100, 100)
            const isContributing = contribGoalId === goal.id
            const isEditing = editGoalId === goal.id

            if (isEditing) {
              return (
                <form
                  key={goal.id}
                  onSubmit={function (e) { handleSaveGoalEdit(e, goal) }}
                  className='border border-sky-200 dark:border-sky-900 rounded-xl p-3 space-y-2'
                >
                  <input
                    type='text'
                    required
                    value={editName}
                    onChange={function (e) { setEditName(e.target.value) }}
                    placeholder='Goal name'
                    className={inputClass}
                  />
                  <div className='flex gap-2'>
                    <div className='relative flex-1'>
                      <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'>$</span>
                      <input
                        type='number'
                        min='1'
                        step='0.01'
                        required
                        value={editTarget}
                        onChange={function (e) { setEditTarget(e.target.value) }}
                        className={`${inputClass} pl-7`}
                      />
                    </div>
                    <input
                      type='date'
                      required
                      value={editDate}
                      onChange={function (e) { setEditDate(e.target.value) }}
                      className={`${inputClass} flex-1`}
                    />
                  </div>
                  <div className='relative'>
                    <input
                      type='number'
                      min='0'
                      max='100'
                      step='0.5'
                      value={editPct}
                      onChange={function (e) { setEditPct(e.target.value) }}
                      placeholder='% of each paycheck (optional)'
                      className={`${inputClass} pr-8`}
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'>%</span>
                  </div>
                  {editError && <p className='text-xs text-red-500'>{editError}</p>}
                  <div className='flex gap-2'>
                    <button
                      type='submit'
                      disabled={updateGoalMutation.isPending}
                      className='flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors'
                    >
                      {updateGoalMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type='button'
                      onClick={function () { setEditGoalId(null) }}
                      className='py-1.5 px-3 rounded-lg border border-gray-200 dark:border-[#1e3354] text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] transition-colors'
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )
            }

            return (
              <div
                key={goal.id}
                onClick={function () { startEditGoal(goal) }}
                title='Click to edit'
                className='border border-gray-100 dark:border-[#1e3354] rounded-xl p-3 cursor-pointer hover:border-sky-300 dark:hover:border-sky-800 transition-colors'
              >
                <div className='flex items-center gap-2 mb-1'>
                  <span className='text-sm font-semibold text-gray-800 dark:text-slate-200 flex-1 truncate'>{goal.name}</span>
                  <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                  <button
                    type='button'
                    onClick={function (e) { e.stopPropagation(); deleteGoalMutation.mutate(goal) }}
                    className='text-gray-300 dark:text-slate-600 hover:text-red-400 text-xs transition-colors'
                    aria-label={`Delete ${goal.name}`}
                  >
                    ✕
                  </button>
                </div>

                <p className='text-sm text-gray-700 dark:text-slate-300 mb-1.5'>
                  <span className='font-bold'>${progress.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className='text-gray-400 dark:text-slate-500'> of ${goal.target_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} · by {formatDate(goal.target_date)}</span>
                </p>

                <div className='w-full bg-gray-100 dark:bg-[#0a1628] rounded-full h-2 overflow-hidden mb-1.5'>
                  <div
                    className={`h-2 rounded-full transition-[width] duration-500 ${style.bar}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-400 dark:text-slate-500'>
                      {goal.allocation_pct > 0
                        ? `${goal.allocation_pct}% of each paycheck${weeklyContribution > 0 ? ` (≈$${weeklyContribution.toFixed(0)}/wk)` : ''}`
                        : 'manual contributions only'}
                    </p>
                    {neededPerWeek != null && (
                      <p className={`text-xs ${status === 'behind' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'}`}>
                        need ${neededPerWeek.toFixed(0)}/wk to stay on track
                      </p>
                    )}
                  </div>
                  {!isContributing && (
                    <button
                      type='button'
                      onClick={function (e) { e.stopPropagation(); setContribGoalId(goal.id); setContribAmount(''); setContribNote('') }}
                      className='text-xs font-semibold text-sky-600 hover:text-sky-700 dark:hover:text-sky-400 transition-colors'
                    >
                      + Add money
                    </button>
                  )}
                </div>

                {/* Manual contribution form (bonuses, stipends) */}
                {isContributing && (
                  <form
                    onSubmit={function (e) { handleAddContribution(e, goal.id) }}
                    onClick={function (e) { e.stopPropagation() }}
                    className='flex gap-2 mt-2'
                  >
                    <div className='relative w-24 flex-shrink-0'>
                      <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500'>$</span>
                      <input
                        type='number'
                        min='0.01'
                        step='0.01'
                        required
                        autoFocus
                        value={contribAmount}
                        onChange={function (e) { setContribAmount(e.target.value) }}
                        placeholder='250'
                        className={`${inputClass} pl-6 px-2 py-1.5 text-xs`}
                      />
                    </div>
                    <input
                      type='text'
                      value={contribNote}
                      onChange={function (e) { setContribNote(e.target.value) }}
                      placeholder='e.g. Relocation stipend'
                      className={`${inputClass} px-2 py-1.5 text-xs`}
                    />
                    <button
                      type='submit'
                      disabled={addContributionMutation.isPending}
                      className='px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors flex-shrink-0'
                    >
                      Log
                    </button>
                    <button
                      type='button'
                      onClick={function () { setContribGoalId(null) }}
                      className='text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xs transition-colors flex-shrink-0'
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
