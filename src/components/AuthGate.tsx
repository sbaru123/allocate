import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ensureUserData from '@/lib/onboarding'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(function () {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        navigate('/login', { replace: true })
        return
      }

      const completed = await ensureUserData(session.user.id)

      if (!completed) {
        navigate('/onboarding', { replace: true })
        return
      }

      setReady(true)
    }

    check()
  }, [navigate])

  if (!ready) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{ backgroundColor: '#f4f7fb' }}>
        <div
          className='w-8 h-8 rounded-full border-2 border-t-transparent animate-spin'
          style={{ borderColor: '#0284c7', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return <>{children}</>
}
