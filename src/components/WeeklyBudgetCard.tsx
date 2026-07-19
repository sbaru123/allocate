import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PayFrequency, Allocation } from '@/types'
import { supabase } from '@/lib/supabase'
import saveWeeklyBudget, { SPENDING_LABEL, isSpendingLabel, getWeeksPerPeriod } from '@/lib/spendingBudget'

type Mode = 'dollars' | 'percent'

type Props = {
  weeklyBudget: number
  latestPaycheck: number
  payFrequency: PayFrequency
  allocations: Allocation[]
}

export default function WeeklyBudgetCard({ weeklyBudget, latestPaycheck, payFrequency, allocations }: Props) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('dollars')
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const weeksPerPeriod = getWeeksPerPeriod(payFrequency)
  const spendingAllocation = allocations.find(function (a) {
    return isSpendingLabel(a.label)
  })
  const otherAllocated = allocations.reduce(function (s, a) {
    return a.id === spendingAllocation?.id ? s : s + a.percentage
  }, 0)

  const value = parseFloat(input)

  // Derive the counterpart value for the live preview
  const derivedPct = mode === 'dollars' && latestPaycheck > 0 && value > 0
    ? (value * weeksPerPeriod / latestPaycheck) * 100
    : null
  const derivedDollars = mode === 'percent' && latestPaycheck > 0 && value > 0
    ? (latestPaycheck * value / 100) / weeksPerPeriod
    : null

  const saveBudgetMutation = useMutation({
    mutationFn: async function (vars: { weekly: number; pct: number | null }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await saveWeeklyBudget(user.id, vars.weekly)

      // Sync the matching Spending allocation bucket
      if (vars.pct != null) {
        if (spendingAllocation) {
          const upd = await supabase
            .from('allocations')
            .update({ percentage: vars.pct })
            .eq('id', spendingAllocation.id)
          if (upd.error) throw upd.error
        } else {
          const ins = await supabase
            .from('allocations')
            .insert({ user_id: user.id, label: SPENDING_LABEL, percentage: vars.pct })
          if (ins.error) throw ins.error
        }
      }
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setInput('')
      setError('')
      setSaved(true)
      setTimeout(function () { setSaved(false) }, 1500)
    },
  })

  function handleModeChange(next: Mode) {
    if (next === mode) return
    setMode(next)
    setInput('')
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!(value > 0)) return

    let weekly: number
    let pct: number | null

    if (mode === 'dollars') {
      weekly = value
      pct = latestPaycheck > 0
        ? Math.round((value * weeksPerPeriod / latestPaycheck) * 10000) / 100
        : null
    } else {
      if (latestPaycheck <= 0) {
        setError('Log a paycheck first to set a percentage-based budget.')
        return
      }
      if (value > 100) {
        setError('Percentage can’t exceed 100%.')
        return
      }
      weekly = Math.round(((latestPaycheck * value / 100) / weeksPerPeriod) * 100) / 100
      pct = Math.round(value * 100) / 100
    }

    if (pct != null && pct > 100) {
      setError(`That’s ${pct.toFixed(0)}% of your paycheck — more than the whole thing. Lower the amount.`)
      return
    }
    if (pct != null && otherAllocated + pct > 100) {
      setError(`Your other buckets use ${otherAllocated.toFixed(0)}%, so Spending can’t exceed ${(100 - otherAllocated).toFixed(0)}%.`)
      return
    }

    saveBudgetMutation.mutate({ weekly, pct })
  }

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Weekly Spending Budget</h2>
        {saved && <span className='text-xs text-emerald-500 font-medium'>Saved ✓</span>}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-3'>
        {weeklyBudget > 0
          ? <>Current budget: <span className='font-semibold text-gray-700 dark:text-slate-300'>${weeklyBudget.toFixed(2)}</span> per week{spendingAllocation ? <> ({spendingAllocation.percentage.toFixed(0)}% of paycheck)</> : null}. Powers Safe to Spend and your {SPENDING_LABEL} bucket.</>
          : 'No weekly budget set yet — set one to unlock Safe to Spend on your dashboard.'}
      </p>

      {/* Mode toggle */}
      <div className='flex gap-2 mb-3'>
        {(['dollars', 'percent'] as const).map(function (m) {
          return (
            <button
              key={m}
              type='button'
              onClick={function () { handleModeChange(m) }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                mode === m
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'border-gray-200 dark:border-[#1e3354] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238]'
              }`}
            >
              {m === 'dollars' ? '$ per week' : '% of paycheck'}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className='flex gap-2'>
        <div className='relative flex-1'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-slate-500'>
            {mode === 'dollars' ? '$' : '%'}
          </span>
          <input
            type='number'
            min='0'
            step='0.01'
            max={mode === 'percent' ? 100 : undefined}
            value={input}
            onChange={function (e) { setInput(e.target.value) }}
            placeholder={mode === 'dollars'
              ? (weeklyBudget > 0 ? weeklyBudget.toFixed(2) : '200.00')
              : (spendingAllocation ? spendingAllocation.percentage.toFixed(0) : '30')}
            className='w-full rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] pl-7 pr-3 py-2 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 placeholder:text-gray-300 dark:placeholder:text-slate-600'
          />
        </div>
        <button
          type='submit'
          disabled={saveBudgetMutation.isPending || !(value > 0)}
          className='px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {saveBudgetMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>

      {/* Live conversion preview */}
      {derivedPct != null && (
        <p className='text-xs text-gray-400 dark:text-slate-500 mt-2'>
          ≈ <span className='font-semibold text-gray-700 dark:text-slate-300'>{derivedPct.toFixed(1)}%</span> of your ${latestPaycheck.toFixed(2)} {payFrequency} paycheck goes to the {SPENDING_LABEL} bucket.
        </p>
      )}
      {derivedDollars != null && (
        <p className='text-xs text-gray-400 dark:text-slate-500 mt-2'>
          ≈ <span className='font-semibold text-gray-700 dark:text-slate-300'>${derivedDollars.toFixed(2)}</span> per week from your ${latestPaycheck.toFixed(2)} {payFrequency} paycheck.
        </p>
      )}
      {mode === 'dollars' && latestPaycheck <= 0 && (
        <p className='text-xs text-gray-400 dark:text-slate-500 mt-2'>
          Log a paycheck to also sync this to a {SPENDING_LABEL} allocation bucket.
        </p>
      )}

      {error && (
        <p className='text-xs text-red-500 mt-2'>{error}</p>
      )}
    </div>
  )
}
