import type { Allocation, Paycheck, PayFrequency } from '@/types'

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

const CHECKS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
}

type Props = {
  allocations: Allocation[]
  paychecks: Paycheck[]
  payFrequency: PayFrequency
}

export default function ProjectedFundsCard({ allocations, paychecks, payFrequency }: Props) {
  const currentYear = new Date().getFullYear()
  const checksPerYear = CHECKS_PER_YEAR[payFrequency]

  const totalAllocated = allocations.reduce(function (s, a) { return s + a.percentage }, 0)

  const thisYearPaychecks = paychecks.filter(function (p) {
    return new Date(p.created_at).getFullYear() === currentYear
  })
  const avgPaycheck = thisYearPaychecks.length > 0
    ? thisYearPaychecks.reduce(function (s, p) { return s + p.amount }, 0) / thisYearPaychecks.length
    : 0

  const perCheckTotal = avgPaycheck * (totalAllocated / 100)
  const perYearTotal = perCheckTotal * checksPerYear

  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <h2 className='text-sm font-semibold text-gray-800'>Projected Annual Allocated Funds</h2>
        <span className='text-sm text-emerald-600 font-medium'>↗ Invested</span>
      </div>
      <p className='text-xs text-gray-400 mb-4'>
        Avg paycheck this year (${avgPaycheck.toLocaleString(undefined, { maximumFractionDigits: 0 })}) × {checksPerYear} checks.
      </p>

      {allocations.length === 0 || avgPaycheck === 0 ? (
        <p className='text-sm text-gray-400'>
          {allocations.length === 0
            ? 'Add allocations above to see your projection.'
            : 'Log a paycheck this year to see your projection.'}
        </p>
      ) : (
        <>
          <div className='flex gap-8 mb-5'>
            <div>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-0.5'>Per year</p>
              <p className='text-3xl font-bold text-gray-900'>
                ${perYearTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className='text-xs text-gray-400 uppercase tracking-wide mb-0.5'>Per check</p>
              <p className='text-3xl font-bold text-gray-900'>
                ${perCheckTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className='space-y-2.5 border-t border-gray-100 pt-4'>
            {allocations.map(function (a, i) {
              const goalPerCheck = avgPaycheck * (a.percentage / 100)
              const goalPerYear = goalPerCheck * checksPerYear
              return (
                <div key={a.id} className='flex items-center gap-2'>
                  <div
                    className='w-2 h-2 rounded-full flex-shrink-0'
                    style={{ backgroundColor: PALETTE[i % PALETTE.length].hex }}
                  />
                  <span className='text-sm text-gray-700 flex-1 truncate'>{a.label}</span>
                  <span className='text-sm font-semibold text-gray-900'>
                    ${goalPerYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className='text-xs text-gray-400'>/yr</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
