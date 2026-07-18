import type { Paycheck } from '@/types'

type Props = {
  paychecks: Paycheck[]
}

export default function IncomeThisYearCard({ paychecks }: Props) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const monthlyTotals = Array.from({ length: currentMonth + 1 }, function (_, i) {
    return {
      month: i,
      label: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
      total: paychecks
        .filter(function (p) {
          const d = new Date(p.created_at)
          return d.getFullYear() === currentYear && d.getMonth() === i
        })
        .reduce(function (s, p) { return s + p.amount }, 0),
    }
  })

  const ytd = monthlyTotals.reduce(function (s, m) { return s + m.total }, 0)
  const monthsWithData = monthlyTotals.filter(function (m) { return m.total > 0 }).length
  const monthlyAvg = monthsWithData > 0 ? ytd / monthsWithData : 0
  const maxMonthTotal = Math.max(...monthlyTotals.map(function (m) { return m.total }), 1)

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-7 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-base font-semibold text-gray-800 dark:text-slate-200'>Income this year</h2>
        {ytd > 0 && (
          <span className='text-xs text-gray-400 dark:text-slate-500'>YTD: ${ytd.toLocaleString()}</span>
        )}
      </div>
      <p className='text-xs text-gray-400 dark:text-slate-500 mb-4'>Paychecks received by month.</p>

      {ytd === 0 ? (
        <p className='text-sm text-gray-400 dark:text-slate-500'>No paychecks logged this year yet.</p>
      ) : (
        <>
          <div className='flex items-end gap-1.5 mb-2' style={{ height: '80px' }}>
            {monthlyTotals.map(function (m) {
              const barHeight = m.total > 0 ? Math.max((m.total / maxMonthTotal) * 60, 4) : 0
              const isCurrentMonth = m.month === currentMonth
              return (
                <div key={m.month} className='flex-1 flex flex-col items-center gap-1'>
                  <div className='w-full flex items-end justify-center' style={{ height: '60px' }}>
                    {barHeight > 0 ? (
                      <div
                        className='w-full rounded-t-sm transition-[height] duration-500'
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: isCurrentMonth ? '#0284c7' : '#bae6fd',
                        }}
                        title={`$${m.total.toLocaleString()}`}
                      />
                    ) : (
                      <div className='w-full rounded-t-sm bg-gray-100 dark:bg-[#1e3354]' style={{ height: '3px' }} />
                    )}
                  </div>
                  <span className={`text-[10px] ${isCurrentMonth ? 'text-sky-600 dark:text-sky-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>
          {monthsWithData > 0 && (
            <p className='text-xs text-gray-400 dark:text-slate-500 mt-2'>
              Averaging{' '}
              <span className='font-semibold text-gray-700 dark:text-slate-300'>
                ${monthlyAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              /month across {monthsWithData} month{monthsWithData !== 1 ? 's' : ''}.
            </p>
          )}
        </>
      )}
    </div>
  )
}
