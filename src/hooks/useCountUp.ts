import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 1200, delay = 600) {
  const [value, setValue] = useState(0)

  useEffect(function () {
    let raf: number
    const timeout = setTimeout(function () {
      const start = performance.now()
      function tick(now: number) {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) {
          raf = requestAnimationFrame(tick)
        }
      }
      raf = requestAnimationFrame(tick)
    }, delay)

    return function () {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, delay])

  return value
}
