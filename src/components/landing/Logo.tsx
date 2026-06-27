import { Link } from 'react-router-dom'

export default function Logo() {
  return (
    <Link to='/' className='flex items-center gap-2.5'>
      <div className='w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center'>
        <svg width='16' height='16' viewBox='0 0 16 16' fill='none' aria-hidden='true'>
          <circle cx='8' cy='8' r='5.5' stroke='white' strokeWidth='1.5' />
          <circle cx='8' cy='8' r='2.5' stroke='white' strokeWidth='1.5' />
          <circle cx='8' cy='8' r='0.8' fill='white' />
        </svg>
      </div>
      <span className='text-base font-bold text-sky-700'>Allocate</span>
    </Link>
  )
}
