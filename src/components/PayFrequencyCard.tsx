import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PayFrequency, Allocation } from '@/types'
import { supabase } from '@/lib/supabase'

const FREQ_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

type Props = {
  payFrequency: PayFrequency
  latestPaycheck: number
  allocations: Allocation[]
}

export default function PayFrequencyCard({ payFrequency, latestPaycheck, allocations }: Props) {
  const queryClient = useQueryClient()
  const [freqSaved, setFreqSaved] = useState(false)

  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)
  const unallocated = 100 - totalAllocated
  const weeksPerPeriod = payFrequency === 'weekly' ? 1 : payFrequency === 'monthly' ? 4 : 2
  const weeklySpendingBudget = latestPaycheck > 0
    ? (latestPaycheck * Math.max(unallocated, 0) / 100) / weeksPerPeriod
    : 0

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

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Pay Frequency</h2>
        {freqSaved && <span className='text-xs text-emerald-500 font-medium'>Saved ✓</span>}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-4'>How often do you receive a paycheck?</p>
      <div className='flex gap-2'>
        {(['weekly', 'biweekly', 'monthly'] as const).map(function (freq) {
          return (
            <button
              key={freq}
              type='button'
              onClick={function () { saveFrequencyMutation.mutate(freq) }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                payFrequency === freq
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'border-gray-200 dark:border-[#1e3354] text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238]'
              }`}
            >
              {FREQ_LABELS[freq]}
            </button>
          )
        })}
      </div>
      {weeklySpendingBudget > 0 && (
        <p className='text-xs text-gray-400 dark:text-slate-500 mt-3'>
          Est. weekly spending budget:{' '}
          <span className='font-semibold text-gray-700 dark:text-slate-300'>${weeklySpendingBudget.toFixed(2)}</span>
          {' '}— ${latestPaycheck.toFixed(2)} paycheck with {unallocated.toFixed(0)}% unallocated.
        </p>
      )}
    </div>
  )
}
