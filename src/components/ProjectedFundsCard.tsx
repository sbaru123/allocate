import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Allocation, Paycheck, PayFrequency } from '@/types'
import { supabase } from '@/lib/supabase'

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
  paychecks: Paycheck[]
  payFrequency: PayFrequency
  projectionStart: string | null
  projectionEnd: string | null
}

function parseLocalDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`)
}

// Number of paychecks received in the window, inclusive of both ends.
// Weekly/biweekly: one check every 7/14 days starting at the window start.
// Monthly: one check per calendar month in the window.
function countChecksInWindow(startStr: string, endStr: string, freq: PayFrequency) {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  if (end < start) return 0
  if (freq === 'monthly') {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  }
  const intervalDays = freq === 'weekly' ? 7 : 14
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000)
  return Math.floor(diffDays / intervalDays) + 1
}

function formatShortDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ProjectedFundsCard({ allocations, paychecks, payFrequency, projectionStart, projectionEnd }: Props) {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()

  // Default window: the full current year (matches the old behavior)
  const defaultStart = `${currentYear}-01-01`
  const defaultEnd = `${currentYear}-12-31`
  const windowStart = projectionStart ?? defaultStart
  const windowEnd = projectionEnd ?? defaultEnd

  const [editing, setEditing] = useState(false)
  const [startInput, setStartInput] = useState(windowStart)
  const [endInput, setEndInput] = useState(windowEnd)
  const [error, setError] = useState('')

  // The query resolves after first render — sync the inputs when it does
  useEffect(function () {
    setStartInput(projectionStart ?? defaultStart)
    setEndInput(projectionEnd ?? defaultEnd)
  }, [projectionStart, projectionEnd, defaultStart, defaultEnd])

  const saveWindowMutation = useMutation({
    mutationFn: async function (vars: { start: string; end: string }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const res = await supabase
        .from('profiles')
        .upsert({ id: user.id, projection_start: vars.start, projection_end: vars.end }, { onConflict: 'id' })
      if (res.error) throw res.error
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: ['paycheck'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setEditing(false)
      setError('')
    },
  })

  function handleSaveWindow() {
    if (!startInput || !endInput) return
    if (parseLocalDate(endInput) < parseLocalDate(startInput)) {
      setError('End date must be after the start date.')
      return
    }
    saveWindowMutation.mutate({ start: startInput, end: endInput })
  }

  function handleResetWindow() {
    setStartInput(defaultStart)
    setEndInput(defaultEnd)
    saveWindowMutation.mutate({ start: defaultStart, end: defaultEnd })
  }

  const checksInWindow = countChecksInWindow(windowStart, windowEnd, payFrequency)

  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)

  const thisYearPaychecks = paychecks.filter(function (p) {
    return new Date(p.created_at).getFullYear() === currentYear
  })
  const avgPaycheck = thisYearPaychecks.length > 0
    ? thisYearPaychecks.reduce(function (s, p) { return s + p.amount }, 0) / thisYearPaychecks.length
    : 0

  const perCheckTotal = avgPaycheck * (totalAllocated / 100)
  const perWindowTotal = perCheckTotal * checksInWindow

  const isDefaultWindow = windowStart === defaultStart && windowEnd === defaultEnd

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Projected Allocated Funds</h2>
        {!editing && (
          <button
            type='button'
            onClick={function () { setEditing(true) }}
            title='Set the window you receive paychecks in'
            className='text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap'
          >
            ✎ Edit Window
          </button>
        )}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-4'>
        Avg paycheck this year (${avgPaycheck.toLocaleString(undefined, { maximumFractionDigits: 0 })}) × {checksInWindow} checks, {formatShortDate(windowStart)} – {formatShortDate(windowEnd)}{isDefaultWindow ? ' (full year)' : ''}.
      </p>

      {editing && (
        <div className='border border-gray-100 dark:border-[#1e3354] rounded-xl p-3 mb-4 space-y-2'>
          <div className='flex gap-2'>
            <div className='flex-1 min-w-0'>
              <label className='block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1'>First paycheck</label>
              <input
                type='date'
                value={startInput}
                onChange={function (e) { setStartInput(e.target.value) }}
                className='w-full rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40'
              />
            </div>
            <div className='flex-1 min-w-0'>
              <label className='block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-1'>Last paycheck</label>
              <input
                type='date'
                value={endInput}
                onChange={function (e) { setEndInput(e.target.value) }}
                className='w-full rounded-lg border border-gray-200 dark:border-[#1e3354] bg-white dark:bg-[#0a1628] px-2 py-1.5 text-sm text-gray-800 dark:text-slate-200 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40'
              />
            </div>
          </div>
          {error && <p className='text-xs text-red-500'>{error}</p>}
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={handleSaveWindow}
              disabled={saveWindowMutation.isPending || !startInput || !endInput}
              className='flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors'
            >
              {saveWindowMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type='button'
              onClick={handleResetWindow}
              disabled={saveWindowMutation.isPending}
              className='py-1.5 px-3 rounded-lg border border-gray-200 dark:border-[#1e3354] text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] disabled:opacity-50 transition-colors'
            >
              Full year
            </button>
            <button
              type='button'
              onClick={function () { setEditing(false); setError('') }}
              className='py-1.5 px-3 rounded-lg border border-gray-200 dark:border-[#1e3354] text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#152238] transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {allocations.length === 0 || avgPaycheck === 0 ? (
        <p className='text-sm text-gray-400 dark:text-slate-500'>
          {allocations.length === 0
            ? 'Add allocations above to see your projection.'
            : 'Log a paycheck this year to see your projection.'}
        </p>
      ) : (
        <>
          <div className='flex gap-8 mb-5'>
            <div>
              <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5'>Projected total</p>
              <p className='text-3xl font-bold text-gray-900 dark:text-slate-100'>
                ${perWindowTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className='text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5'>Per check</p>
              <p className='text-3xl font-bold text-gray-900 dark:text-slate-100'>
                ${perCheckTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className='space-y-2.5 border-t border-gray-100 dark:border-[#1e3354] pt-4'>
            {allocations.map(function (a, i) {
              const goalPerCheck = avgPaycheck * (a.percentage / 100)
              const goalPerWindow = goalPerCheck * checksInWindow
              return (
                <div key={a.id} className='flex items-center gap-2'>
                  <div
                    className='w-2 h-2 rounded-full flex-shrink-0'
                    style={{ backgroundColor: PALETTE[i % PALETTE.length].hex }}
                  />
                  <span className='text-sm text-gray-700 dark:text-slate-300 flex-1 truncate'>{a.label}</span>
                  <span className='text-sm font-semibold text-gray-900 dark:text-slate-100'>
                    ${goalPerWindow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
