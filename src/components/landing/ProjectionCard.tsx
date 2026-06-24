import { useCountUp } from '@/hooks/useCountUp'

export default function ProjectionCard() {
  const amount = useCountUp(48200, 1400, 700)

  return (
    <div className='bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-4 w-56'>
      <div className='flex items-center gap-1.5 mb-1'>
        <div className='w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center'>
          <svg width='11' height='11' viewBox='0 0 12 12' fill='none' aria-hidden='true'>
            <path d='M1 9 L4 6 L6.5 7.5 L11 2' stroke='#10b981' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M8 2 H11 V5' stroke='#10b981' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
        <span className='text-[10px] font-semibold uppercase tracking-wide text-emerald-600'>
          Projected in 1 year
        </span>
      </div>

      <p className='text-2xl font-bold mb-2' style={{ color: 'rgb(15,38,68)' }}>
        ${amount.toLocaleString()}
      </p>

      {/* Sparkline */}
      <div className='relative h-14 w-full'>
        <svg
          viewBox='0 0 140 60'
          className='w-full h-full'
          fill='none'
          aria-hidden='true'
          preserveAspectRatio='none'
        >
          <defs>
            <linearGradient id='spark-fill' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='#38bdf8' stopOpacity='0.22' />
              <stop offset='100%' stopColor='#38bdf8' stopOpacity='0' />
            </linearGradient>
          </defs>
          <path
            d='M 0,55 C 15,52 25,45 40,38 S 60,28 75,22 S 100,12 120,8 L 140,3 L 140,60 L 0,60 Z'
            fill='url(#spark-fill)'
          />
          <path
            className='sparkline-path'
            d='M 0,55 C 15,52 25,45 40,38 S 60,28 75,22 S 100,12 120,8 L 140,3'
            stroke='#0284c7'
            strokeWidth='2'
            strokeLinecap='round'
            fill='none'
          />
          <circle className='sparkline-dot' cx='140' cy='3' r='3.5' fill='#0284c7' />
        </svg>
      </div>

      <p className='text-[10px] mt-1' style={{ color: 'rgba(15,38,68,0.48)' }}>
        at your current allocation rate
      </p>
    </div>
  )
}
