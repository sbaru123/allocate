import { useCountUp } from '@/hooks/useCountUp'

export default function SavedTickerCard() {
  const amount = useCountUp(23840, 1400, 700)

  return (
    <div
      className='rounded-2xl shadow-lg p-4 w-52'
      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #075985 100%)' }}
    >
      <div className='flex items-center gap-1.5 mb-1'>
        <div className='w-5 h-5 rounded-md bg-white/15 flex items-center justify-center'>
          <svg width='11' height='11' viewBox='0 0 12 12' fill='none' aria-hidden='true'>
            <path d='M1 9 L4 6 L6.5 7.5 L11 2' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            <path d='M8 2 H11 V5' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </div>
        <span className='text-[10px] font-semibold uppercase tracking-wide text-white/75'>
          Saved this year
        </span>
      </div>
      <p className='text-2xl font-bold text-white'>
        ${amount.toLocaleString()}
      </p>
      <p className='text-[11px] mt-0.5 text-white/65'>
        +18% vs. last year
      </p>
    </div>
  )
}
