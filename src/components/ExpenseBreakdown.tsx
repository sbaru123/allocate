import { useState } from 'react'

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
  const [hoveredItem, setHoveredItem] = useState<ChartItem | null>(null)
  const remainingBudget = Math.max(remaining, 0)
  const chartTotal = budgetLimit > 0 ? Math.max(budgetLimit, total) : total
  const activeItems = items.filter(item => item.total > 0)
  const chartItems = budgetLimit > 0 && remainingBudget > 0
    ? [...activeItems, { label: 'Remaining', chartColor: '#e5e7eb', total: remainingBudget }]
    : activeItems
  const radius = 88
  const strokeWidth = 28
  const circumference = 2 * Math.PI * radius

  const segments = chartItems.reduce<(
    ChartItem & { dasharray: string; dashoffset: number }
  )[]>((acc, item) => {
    const length = chartTotal > 0 ? (item.total / chartTotal) * circumference : 0
    const currentOffset = acc.reduce((sum, segment) => {
      const [segmentLength] = segment.dasharray.split(' ')
      return sum + Number(segmentLength)
    }, 0)
    const segment = {
      ...item,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -currentOffset,
    }
    return [...acc, segment]
  }, [])

  const defaultCenterLabel = budgetLimit > 0
    ? remaining < 0 ? 'Over budget' : 'Remaining'
    : 'Total'
  const defaultCenterAmount = budgetLimit > 0 ? Math.abs(remaining) : total
  const centerLabel = hoveredItem?.label ?? defaultCenterLabel
  const centerAmount = hoveredItem?.total ?? defaultCenterAmount
  const isOverBudget = !hoveredItem && remaining < 0

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
          aria-label={`Expense distribution for this ${periodName}`}
        >
          <svg className='h-56 w-56 -rotate-90' viewBox='0 0 224 224' role='img'>
            <circle
              cx='112'
              cy='112'
              r={radius}
              fill='none'
              stroke='#f3f4f6'
              strokeWidth={strokeWidth}
            />
            {segments.map(item => (
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
                className='cursor-pointer transition-opacity hover:opacity-80'
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
              />
            ))}
          </svg>
          <div className='absolute inset-10 rounded-full bg-white shadow-sm flex flex-col items-center justify-center'>
            <span className='text-xs font-medium text-gray-400 uppercase tracking-wide'>{centerLabel}</span>
            <span className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-900'}`}>
              ${centerAmount.toFixed(0)}
            </span>
          </div>
        </div>

        <div className='w-full space-y-3'>
          {items.map(item => {
            const percent = chartTotal > 0 ? (item.total / chartTotal) * 100 : 0

            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
              >
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
            <div
              onMouseEnter={() => setHoveredItem({
                label: remaining < 0 ? 'Over budget' : 'Remaining',
                chartColor: remaining < 0 ? '#f87171' : '#e5e7eb',
                total: Math.abs(remaining),
              })}
              onMouseLeave={() => setHoveredItem(null)}
            >
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
