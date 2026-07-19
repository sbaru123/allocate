import { useState } from 'react'

type Props = {
  anchorDate: Date
  onSelect: (weekStart: Date) => void
  onClose: () => void
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1)
  start.setHours(0, 0, 0, 0)
  start.setDate(diff)
  return start
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function WeekPicker({ anchorDate, onSelect, onClose }: Props) {
  const [viewMonth, setViewMonth] = useState(function () {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
  })

  const selectedWeekStart = getWeekStart(anchorDate)
  const today = new Date()

  // 6 week rows covering the viewed month
  const weeks: Date[][] = []
  const cursor = new Date(getWeekStart(viewMonth))
  for (let w = 0; w < 6; w++) {
    const days: Date[] = []
    for (let d = 0; d < 7; d++) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(days)
  }

  function moveMonth(direction: -1 | 1) {
    setViewMonth(function (prev) {
      return new Date(prev.getFullYear(), prev.getMonth() + direction, 1)
    })
  }

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <>
      {/* Click-away backdrop */}
      <div className='fixed inset-0 z-40' onClick={onClose} />

      <div className='absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white dark:bg-[#0e1f38] border border-gray-200 dark:border-[#1e3354] rounded-2xl shadow-xl p-4'>
        {/* Month navigation */}
        <div className='flex items-center justify-between mb-3'>
          <button
            type='button'
            onClick={function () { moveMonth(-1) }}
            aria-label='Previous month'
            className='h-7 w-7 rounded-lg border border-gray-200 dark:border-[#1e3354] text-base text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-[#152238] hover:text-gray-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center'
          >
            ‹
          </button>
          <span className='text-sm font-semibold text-gray-800 dark:text-slate-200'>{monthLabel}</span>
          <button
            type='button'
            onClick={function () { moveMonth(1) }}
            aria-label='Next month'
            className='h-7 w-7 rounded-lg border border-gray-200 dark:border-[#1e3354] text-base text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-[#152238] hover:text-gray-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center'
          >
            ›
          </button>
        </div>

        {/* Weekday headers */}
        <div className='flex mb-1'>
          {WEEKDAYS.map(function (wd) {
            return (
              <span key={wd} className='w-9 text-center text-[10px] font-semibold uppercase text-gray-400 dark:text-slate-500'>
                {wd}
              </span>
            )
          })}
        </div>

        {/* Week rows — hovering highlights the whole week */}
        <div className='space-y-0.5'>
          {weeks.map(function (days) {
            const weekStart = days[0]
            const isSelected = isSameDay(weekStart, selectedWeekStart)
            return (
              <div
                key={weekStart.toISOString()}
                onClick={function () { onSelect(new Date(weekStart)) }}
                title={`Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                className={`flex rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-sky-100 dark:bg-sky-900/40'
                    : 'hover:bg-sky-50 dark:hover:bg-[#152238]'
                }`}
              >
                {days.map(function (day) {
                  const inMonth = day.getMonth() === viewMonth.getMonth()
                  const isToday = isSameDay(day, today)
                  return (
                    <span
                      key={day.toISOString()}
                      className={`w-9 h-8 flex items-center justify-center text-xs ${
                        isToday
                          ? 'font-bold text-sky-600 dark:text-sky-400'
                          : inMonth
                            ? 'text-gray-700 dark:text-slate-300'
                            : 'text-gray-300 dark:text-slate-600'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Jump to current week */}
        <button
          type='button'
          onClick={function () { onSelect(getWeekStart(today)) }}
          className='w-full mt-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#1e3354] text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-[#152238] transition-colors'
        >
          This Week
        </button>
      </div>
    </>
  )
}
