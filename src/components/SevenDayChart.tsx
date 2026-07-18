import { useState } from 'react'
import type { Expense } from '@/types'

type Props = {
  chartExpenses: Expense[]
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function SevenDayChart({ chartExpenses }: Props) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  const today = new Date()
  const sevenDays = Array.from({ length: 7 }, function (_, i) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i)
    return localDateStr(d)
  })

  const dayTotals = sevenDays.map(function (dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return {
      dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      total: chartExpenses
        .filter(function (e) { return localDateStr(new Date(e.created_at)) === dateStr })
        .reduce(function (sum, e) { return sum + e.amount }, 0),
    }
  })

  const maxDayTotal = Math.max(...dayTotals.map(function (d) { return d.total }), 1)
  const chartTotal7d = chartExpenses.reduce(function (s, e) { return s + e.amount }, 0)

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <p className='text-sm font-semibold text-gray-700 dark:text-slate-200'>7-Day Spending</p>
          <p className='text-xs text-gray-400 dark:text-slate-500'>Rolling last 7 days</p>
        </div>
        <p className='text-sm font-semibold text-gray-900 dark:text-slate-100'>${chartTotal7d.toFixed(2)}</p>
      </div>

      <div className='flex items-end gap-1.5' style={{ height: '96px' }}>
        {dayTotals.map(function (day) {
          // Cap at 56px so the always-visible amount label fits above the tallest bar
          const barHeight = day.total > 0 ? Math.max((day.total / maxDayTotal) * 56, 4) : 0
          const isHovered = day.dateStr === hoveredDate
          return (
            <div
              key={day.dateStr}
              className={`flex-1 flex flex-col items-center gap-1.5 ${day.total > 0 ? 'cursor-pointer' : ''}`}
              onMouseEnter={function () { if (day.total > 0) setHoveredDate(day.dateStr) }}
              onMouseLeave={function () { setHoveredDate(null) }}
            >
              <div className='w-full flex flex-col items-center justify-end' style={{ height: '72px' }}>
                {day.total > 0 && (
                  <p className={`text-[10px] font-semibold mb-1 leading-none transition-colors duration-200 ${isHovered ? 'text-sky-700 dark:text-sky-400' : 'text-gray-500 dark:text-slate-400'}`}>
                    ${day.total.toFixed(2)}
                  </p>
                )}
                {barHeight > 0 ? (
                  <div
                    className='w-full rounded-t-md transition-[height,background-color] duration-200'
                    style={{
                      height: `${barHeight}px`,
                      backgroundColor: isHovered ? '#0284c7' : '#7dd3fc',
                    }}
                  />
                ) : (
                  <div
                    className='w-full rounded-t-sm transition-colors duration-200'
                    style={{ height: '3px', backgroundColor: '#1e3354' }}
                  />
                )}
              </div>
              <span className={`text-[10px] leading-tight text-center transition-colors duration-200 ${isHovered ? 'text-sky-600 dark:text-sky-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                {day.label}
                <span className='block text-[9px] opacity-75'>{day.dateLabel}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
