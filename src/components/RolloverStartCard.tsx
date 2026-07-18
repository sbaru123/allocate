import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type Props = {
  rolloverStart: string | null
}

export default function RolloverStartCard({ rolloverStart }: Props) {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(rolloverStart ?? '')
  const [saved, setSaved] = useState(false)

  // The query resolves after first render — sync the input when it does
  useEffect(function () { setStartDate(rolloverStart ?? '') }, [rolloverStart])

  const saveRolloverStartMutation = useMutation({
    mutationFn: async function (date: string | null) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const res = await supabase
        .from('profiles')
        .upsert({ id: user.id, rollover_start: date }, { onConflict: 'id' })
      if (res.error) throw res.error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setSaved(true)
      setTimeout(function () { setSaved(false) }, 1500)
    },
  })

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Rollover start week</h2>
        {saved && <span className='text-xs text-emerald-500 font-medium'>Saved ✓</span>}
      </div>
      <p className='text-sm text-gray-400 dark:text-slate-500 mb-4'>
        Leftover Spending only counts weeks from this date on — expenses before it (e.g. before you started working) are ignored.
      </p>
      <div className='flex gap-2'>
        <input
          type='date'
          value={startDate}
          onChange={function (e) { setStartDate(e.target.value) }}
          className='flex-1 rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] px-3 py-2 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40'
        />
        <button
          type='button'
          onClick={function () { if (startDate) saveRolloverStartMutation.mutate(startDate) }}
          disabled={saveRolloverStartMutation.isPending || !startDate || startDate === (rolloverStart ?? '')}
          className='px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {saveRolloverStartMutation.isPending ? 'Saving…' : 'Save'}
        </button>
        {rolloverStart && (
          <button
            type='button'
            onClick={function () { setStartDate(''); saveRolloverStartMutation.mutate(null) }}
            disabled={saveRolloverStartMutation.isPending}
            className='px-3 py-2 rounded-lg border border-gray-200 dark:border-[#1e3354] text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] disabled:opacity-50 transition-colors'
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
