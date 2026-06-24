import { useEffect, useState } from 'react'

const ALLOC_SEGMENTS = [
  { label: 'Investing', pct: 40, color: '#0284c7' },
  { label: 'Savings',   pct: 25, color: '#34d399' },
  { label: 'Lifestyle', pct: 20, color: '#a78bfa' },
  { label: 'Giving',    pct: 15, color: '#fb923c' },
]

export default function AllocationCard() {
  const [mounted, setMounted] = useState(false)

  useEffect(function () {
    const t = setTimeout(function () { setMounted(true) }, 80)
    return function () { clearTimeout(t) }
  }, [])

  return (
    <div className='bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-4 w-64'>
      <div className='flex items-center justify-between mb-3'>
        <p className='text-xs font-semibold' style={{ color: 'rgb(15,38,68)' }}>
          Every paycheck, allocated
        </p>
        <span className='text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5'>
          100%
        </span>
      </div>

      {/* Segmented bar */}
      <div className='relative h-2 w-full rounded-full overflow-hidden bg-gray-100 mb-3'>
        <div className='absolute inset-0 flex'>
          {ALLOC_SEGMENTS.map(function (s, i) {
            return (
              <div
                key={s.label}
                className='h-full transition-[width] duration-700'
                style={{
                  width: mounted ? `${s.pct}%` : '0%',
                  backgroundColor: s.color,
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            )
          })}
        </div>
        {mounted && <div className='bar-shimmer' />}
      </div>

      {/* Legend */}
      <div className='space-y-1.5'>
        {ALLOC_SEGMENTS.map(function (s) {
          return (
            <div key={s.label} className='flex items-center gap-2'>
              <div
                className='w-2 h-2 rounded-full flex-shrink-0'
                style={{ backgroundColor: s.color }}
              />
              <span className='text-[11px] flex-1' style={{ color: 'rgba(15,38,68,0.65)' }}>
                {s.label}
              </span>
              <span className='text-[11px] font-semibold' style={{ color: 'rgb(15,38,68)' }}>
                {s.pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
