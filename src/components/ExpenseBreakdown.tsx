type DistributionItem = {
  label: string
  color: string
  chartColor: string
  total: number
}

type DistributionProps = {
  items: DistributionItem[]
  periodName: string
  total: number
  budgetLimit: number
  remaining: number
}

export default function Distribution({ items, periodName, total, budgetLimit, remaining }: DistributionProps) {
  const remainingBudget = Math.max(remaining, 0)
  const chartTotal = budgetLimit > 0 ? Math.max(budgetLimit, total) : total
  const activeItems = items.filter(item => item.total > 0)
  const chartItems = budgetLimit > 0 && remainingBudget > 0
    ? [...activeItems, { label: 'Remaining', chartColor: '#e5e7eb', total: remainingBudget }]
    : activeItems
  let currentPercent = 0

  const gradientStops = chartItems.map(item => {
    const percent = (item.total / chartTotal) * 100
    const stop = `${item.chartColor} ${currentPercent}% ${currentPercent + percent}%`
    currentPercent += percent
    return stop
  })

  const chartBackground = chartTotal > 0
    ? `conic-gradient(${gradientStops.join(', ')})`
    : '#f3f4f6'
  const centerLabel = budgetLimit > 0
    ? remaining < 0 ? 'Over budget' : 'Remaining'
    : 'Total'
  const centerAmount = budgetLimit > 0 ? Math.abs(remaining) : total

  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4 mb-5'>
        <div>
          <p className='text-sm font-semibold text-gray-700'>Expense distribution</p>
          <p className='text-xs text-gray-400'>Where your {periodName} spending is going</p>
        </div>
        <p className='text-sm font-semibold text-gray-900'>${total.toFixed(2)}</p>
      </div>

      <div className='flex flex-col items-center gap-6'>
        <div
          className='relative h-56 w-56 rounded-full shadow-inner'
          style={{ background: chartBackground }}
          aria-label={`Expense distribution for this ${periodName}`}
        >
          <div className='absolute inset-10 rounded-full bg-white shadow-sm flex flex-col items-center justify-center'>
            <span className='text-xs font-medium text-gray-400 uppercase tracking-wide'>{centerLabel}</span>
            <span className={`text-2xl font-bold ${remaining < 0 ? 'text-red-500' : 'text-gray-900'}`}>
              ${centerAmount.toFixed(0)}
            </span>
          </div>
        </div>

        <div className='w-full space-y-3'>
          {items.map(item => {
            const percent = chartTotal > 0 ? (item.total / chartTotal) * 100 : 0

            return (
              <div key={item.label}>
                <div className='flex items-center gap-3 mb-1'>
                  <div className={`h-3 w-3 rounded-full ${item.color} flex-shrink-0`} />
                  <span className='text-sm text-gray-600 flex-1'>{item.label}</span>
                  <span className='text-sm font-medium text-gray-900'>${item.total.toFixed(2)}</span>
                </div>
                <div className='h-2 w-full rounded-full bg-gray-100 overflow-hidden'>
                  <div
                    className='h-full rounded-full transition-all'
                    style={{ width: `${percent}%`, backgroundColor: item.chartColor }}
                  />
                </div>
              </div>
            )
          })}

          {budgetLimit > 0 && (
            <div>
              <div className='flex items-center gap-3 mb-1'>
                <div className='h-3 w-3 rounded-full bg-gray-200 flex-shrink-0' />
                <span className='text-sm text-gray-600 flex-1'>
                  {remaining < 0 ? 'Over budget' : 'Remaining'}
                </span>
                <span className={`text-sm font-medium ${remaining < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                  ${Math.abs(remaining).toFixed(2)}
                </span>
              </div>
              <div className='h-2 w-full rounded-full bg-gray-100 overflow-hidden'>
                <div
                  className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-red-400' : 'bg-gray-200'}`}
                  style={{ width: `${chartTotal > 0 ? (Math.abs(remaining) / chartTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
