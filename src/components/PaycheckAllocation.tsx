import { Link } from 'react-router-dom'
import type { Allocation } from '@/types'

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
  latestPaycheckAmt: number
  totalAllocated: number
}

export default function PaycheckAllocation({ allocations, latestPaycheckAmt, totalAllocated }: Props) {
  return (
    <div className='bg-white rounded-2xl border border-gray-200 p-5 shadow-sm'>
      <div className='flex items-baseline justify-between mb-1'>
        <p className='text-sm font-semibold text-gray-700'>Paycheck Allocation</p>
        {latestPaycheckAmt > 0 && (
          <span className='text-xs text-gray-400'>Based on ${latestPaycheckAmt.toFixed(2)}</span>
        )}
      </div>
      <p className='text-xs text-gray-400 mb-4'>How your last paycheck is distributed.</p>

      {allocations.length === 0 ? (
        <p className='text-sm text-gray-400'>
          No allocations set up.{' '}
          <Link to='/paycheck' className='text-sky-600 hover:underline'>
            Add them on Paycheck →
          </Link>
        </p>
      ) : (
        <>
          <div className='w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex mb-4'>
            {allocations.map(function (a, i) {
              return (
                <div
                  key={a.id}
                  className='h-full transition-all duration-500'
                  style={{
                    width: `${Math.min(a.percentage, 100)}%`,
                    backgroundColor: PALETTE[i % PALETTE.length].hex,
                  }}
                />
              )
            })}
          </div>

          <div className='space-y-2.5'>
            {allocations.map(function (a, i) {
              return (
                <div key={a.id} className='flex items-center gap-2'>
                  <div
                    className='w-2 h-2 rounded-full flex-shrink-0'
                    style={{ backgroundColor: PALETTE[i % PALETTE.length].hex }}
                  />
                  <span className='text-sm text-gray-700 flex-1 truncate'>{a.label}</span>
                  <span className='text-xs text-gray-400 flex-shrink-0 w-10 text-right'>
                    {a.percentage}%
                  </span>
                  {latestPaycheckAmt > 0 && (
                    <span className='text-sm font-semibold text-gray-900 w-16 text-right flex-shrink-0'>
                      ${((a.percentage / 100) * latestPaycheckAmt).toFixed(2)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className='mt-4 pt-3 border-t border-gray-100 flex justify-between items-center'>
            <span className='text-xs text-gray-400'>{totalAllocated.toFixed(0)}% allocated</span>
            <Link to='/paycheck' className='text-xs text-sky-600 hover:underline'>Edit allocations →</Link>
          </div>
        </>
      )}
    </div>
  )
}
