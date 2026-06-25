import { useCountUp } from '@/hooks/useCountUp'

export default function SafeToSpendCard() {
  const amount = useCountUp(1500, 900, 800)

  return (
    <div className='bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-4 w-48'>
      <div className='flex items-center gap-1.5 mb-1'>
        <div className='w-5 h-5 rounded-md bg-sky-50 flex items-center justify-center'>
          <svg width='12' height='12' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
            <ellipse cx='8' cy='9.5' rx='5' ry='4' stroke='#0284c7' strokeWidth='1.4' />
            <path d='M5 8 C5 5.8 6.5 4.5 8 4.5 S11 5.8 11 8' stroke='#0284c7' strokeWidth='1.4' strokeLinecap='round' />
            <circle cx='6.2' cy='9' r='0.7' fill='#0284c7' />
            <path d='M12.5 9 C13.5 9 14 9.5 14 10' stroke='#0284c7' strokeWidth='1.4' strokeLinecap='round' />
            <path d='M9 13.5 L8.5 15 M7 13.5 L6.5 15' stroke='#0284c7' strokeWidth='1.3' strokeLinecap='round' />
          </svg>
        </div>
        <span className='text-[10px] font-semibold uppercase tracking-wide text-sky-600'>
          Safe to spend
        </span>
      </div>
      <p className='text-2xl font-bold' style={{ color: 'rgb(15,38,68)' }}>
        ${amount.toLocaleString()}
      </p>
      <p className='text-[11px] mt-0.5' style={{ color: 'rgba(15,38,68,0.50)' }}>
        this week, guilt-free
      </p>
    </div>
  )
}
