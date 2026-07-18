import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import ensureUserData from '@/lib/onboarding'
import HeroBackground from '@/components/landing/HeroBackground'

async function routeAfterAuth(uid: string, nav: (path: string, opts?: { replace?: boolean }) => void) {
  const completed = await ensureUserData(uid)
  nav(completed ? '/home' : '/onboarding', { replace: true })
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [label, setLabel] = useState('Confirming your email…')

  useEffect(function () {
    let handled = false

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')

      // Format 1: token_hash — newer Supabase email templates
      // URL looks like: /auth/callback?token_hash=xxx&type=signup
      if (tokenHash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery' | 'invite',
        })
        if (error || !data.session) {
          navigate('/login', { replace: true })
          return
        }
        if (!handled) {
          handled = true
          setLabel('All confirmed — setting things up…')
          await routeAfterAuth(data.session.user.id, navigate)
        }
        return
      }

      // Format 2: PKCE code
      // URL looks like: /auth/callback?code=xxx
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          navigate('/login', { replace: true })
          return
        }
        if (!handled) {
          handled = true
          setLabel('All confirmed — setting things up…')
          await routeAfterAuth(data.session.user.id, navigate)
        }
        return
      }

      // Format 3: implicit — tokens in the URL hash (#access_token=xxx)
      // Supabase auto-detects this via detectSessionInUrl; handled below by
      // onAuthStateChange. Just check if it already resolved synchronously.
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !handled) {
        handled = true
        setLabel('All confirmed — setting things up…')
        await routeAfterAuth(session.user.id, navigate)
      }
    }

    // Catch implicit-flow SIGNED_IN that fires asynchronously after Supabase
    // parses the hash — or INITIAL_SESSION if it was already parsed before
    // our listener attached.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async function (event, session) {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !handled) {
        handled = true
        setLabel('All confirmed — setting things up…')
        await routeAfterAuth(session.user.id, navigate)
      }
    })

    handleCallback()

    // Safety net: if none of the above resolves, the link was invalid/expired
    const timeout = setTimeout(function () {
      if (!handled) {
        handled = true
        navigate('/login', { replace: true })
      }
    }, 8000)

    return function () {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className='relative min-h-screen overflow-hidden'>
      <HeroBackground />
      <div className='relative z-10 flex flex-col items-center justify-center min-h-screen gap-3'>
        <div
          className='w-8 h-8 rounded-full border-2 border-t-transparent animate-spin'
          style={{ borderColor: '#0284c7', borderTopColor: 'transparent' }}
        />
        <p className='text-sm font-medium' style={{ color: 'rgba(15,38,68,0.55)' }}>
          {label}
        </p>
      </div>
    </div>
  )
}
