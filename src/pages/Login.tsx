import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const role = data.user?.user_metadata?.role
    if (role === 'host') {
      navigate('/host/dashboard')
    } else {
      navigate('/renter/dashboard')
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
        <div className='mb-6 text-center'>
          <h1 className='text-2xl font-bold text-gray-900'>Welcome back</h1>
          <p className='text-sm text-gray-500 mt-1'>Sign in to your Terp Storage account</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
            <input
              type='email'
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='you@example.com'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
            <input
              type='password'
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='••••••••'
            />
          </div>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors'
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className='text-center text-sm text-gray-500 mt-6'>
          Don&apos;t have an account?{' '}
          <Link to='/signup' className='text-red-600 font-medium hover:underline'>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
