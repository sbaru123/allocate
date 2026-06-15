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

type ChartItem = {
  label: string
  chartColor: string
  total: number
}

export default function Distribution({ items, periodName, total, budgetLimit, remaining }: DistributionProps) {
  const remainingBudget = Math.max(remaining, 0)
  const chartTotal = budgetLimit > 0 ? Math.max(budgetLimit, total) : total
  const activeItems = items.filter(item => item.total > 0)
  const chartItems: ChartItem[] = budgetLimit > 0 && remainingBudget > 0
    ? [...activeItems, { label: 'Remaining', chartColor: '#e5e7eb', total: remainingBudget }]
    : activeItems
  const radius = 88
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius

  const segments = chartItems.reduce<(
    ChartItem & { dasharray: string; dashoffset: number }
  )[]>(function (acc, item) {
    const length = chartTotal > 0 ? (item.total / chartTotal) * circumference : 0
    const currentOffset = acc.reduce(function (sum, segment) {
      const [segmentLength] = segment.dasharray.split(' ')
      return sum + Number(segmentLength)
    }, 0)
    return [...acc, {
      ...item,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -currentOffset,
    }]
  }, [])

  const centerLabel = budgetLimit > 0
    ? remaining < 0 ? 'Over budget' : 'Remaining'
    : 'Total'
  const centerAmount = budgetLimit > 0 ? Math.abs(remaining) : total
  const isOverBudget = remaining < 0

  return (
    <div className='bg-white dark:bg-[#0e1f38] rounded-2xl border border-gray-200 dark:border-[#1e3354] p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4 mb-5'>
        <div>
          <p className='text-sm font-semibold text-gray-700 dark:text-slate-200'>Expense distribution</p>
          <p className='text-xs text-gray-400 dark:text-slate-500'>Where your {periodName} spending is going</p>
        </div>
        <p className='text-sm font-semibold text-gray-900 dark:text-slate-100'>${total.toFixed(2)}</p>
      </div>

      <div className='flex flex-col items-center gap-6'>
        <div
          className='relative h-56 w-56 rounded-full shadow-inner'
          aria-label={`Expense distribution for this ${periodName}`}
        >
          <svg className='h-56 w-56 -rotate-90' viewBox='0 0 224 224' role='img'>
            <circle
              cx='112'
              cy='112'
              r={radius}
              fill='none'
              stroke='var(--chart-track)'
              strokeWidth={strokeWidth}
            />
            {segments.map(function (item) {
              return (
                <circle
                  key={item.label}
                  cx='112'
                  cy='112'
                  r={radius}
                  fill='none'
                  stroke={item.chartColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={item.dasharray}
                  strokeDashoffset={item.dashoffset}
                  strokeLinecap='butt'
                />
              )
            })}
          </svg>
          <div className='absolute inset-10 rounded-full bg-white dark:bg-[#0e1f38] shadow-sm flex flex-col items-center justify-center'>
            <span className='text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide'>{centerLabel}</span>
            <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-900 dark:text-slate-100'}`}>
              ${centerAmount.toFixed(0)}
            </span>
          </div>
        </div>

        <div className='w-full space-y-3'>
          {items.map(function (item) {
            const percent = chartTotal > 0 ? (item.total / chartTotal) * 100 : 0

            return (
              <div key={item.label} className='rounded-lg -mx-1 px-1 py-0.5'>
                <div className='flex items-center gap-3 mb-1'>
                  <div className={`h-3 w-3 rounded-full ${item.color} flex-shrink-0`} />
                  <span className='text-sm text-gray-600 dark:text-slate-300 flex-1'>{item.label}</span>
                  <span className='text-sm font-medium text-gray-900 dark:text-slate-100'>${item.total.toFixed(2)}</span>
                </div>
                <div className='h-2 w-full rounded-full bg-gray-100 dark:bg-[#0a1628] overflow-hidden'>
                  <div
                    className='h-full rounded-full transition-[width] duration-500'
                    style={{ width: `${percent}%`, backgroundColor: item.chartColor }}
                  />
                </div>
              </div>
            )
          })}

          {budgetLimit > 0 && (
            <div className='rounded-lg -mx-1 px-1 py-0.5'>
              <div className='flex items-center gap-3 mb-1'>
                <div className='h-3 w-3 rounded-full bg-gray-200 dark:bg-slate-600 flex-shrink-0' />
                <span className='text-sm text-gray-600 dark:text-slate-300 flex-1'>
                  {remaining < 0 ? 'Over budget' : 'Remaining'}
                </span>
                <span className={`text-sm font-medium ${remaining < 0 ? 'text-red-500' : 'text-gray-900 dark:text-slate-100'}`}>
                  ${Math.abs(remaining).toFixed(2)}
                </span>
              </div>
              <div className='h-2 w-full rounded-full bg-gray-100 dark:bg-[#0a1628] overflow-hidden'>
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-500 ${remaining < 0 ? 'bg-red-400' : 'bg-gray-200 dark:bg-slate-600'}`}
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
