import { useEffect, useState } from 'react'

export interface SegBucket {
  name: string
  color: string
  percent: number
}

export default function SegBar({ buckets, shimmer = true }: { buckets: SegBucket[]; shimmer?: boolean }) {
  const [mounted, setMounted] = useState(false)

  useEffect(function () {
    const t = setTimeout(function () { setMounted(true) }, 60)
    return function () { clearTimeout(t) }
  }, [])

  return (
    <div className='relative h-2.5 w-full rounded-full overflow-hidden' style={{ backgroundColor: 'rgba(15,38,68,0.08)' }}>
      <div className='absolute inset-0 flex'>
        {buckets.map(function (b, i) {
          return (
            <div
              key={i}
              className='h-full transition-[width] duration-700'
              style={{
                width: mounted ? `${b.percent}%` : '0%',
                backgroundColor: b.color,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          )
        })}
      </div>
      {mounted && shimmer && <div className='bar-shimmer' />}
    </div>
  )
}
