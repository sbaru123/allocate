import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Role = 'renter' | 'host'

export default function Signup() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('renter')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (role === 'host' && !email.endsWith('@terpmail.umd.edu')) {
      setError('Hosts must sign up with a @terpmail.umd.edu email address.')
      return
    }

    setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

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
          <h1 className='text-2xl font-bold text-gray-900'>Create an account</h1>
          <p className='text-sm text-gray-500 mt-1'>Join Terp Storage today</p>
        </div>

        {/* Role toggle */}
        <div className='flex rounded-lg border border-gray-200 overflow-hidden mb-6'>
          <button
            type='button'
            onClick={() => { setRole('renter'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              role === 'renter'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            I need storage
          </button>
          <button
            type='button'
            onClick={() => { setRole('host'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              role === 'host'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            I have space to rent
          </button>
        </div>

        {role === 'host' && (
          <p className='text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4'>
            Hosts must sign up with a <strong>@terpmail.umd.edu</strong> email to verify UMD affiliation.
          </p>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Full name</label>
            <input
              type='text'
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='Jane Smith'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Email {role === 'host' && <span className='text-amber-600'>(@terpmail.umd.edu required)</span>}
            </label>
            <input
              type='email'
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder={role === 'host' ? 'you@terpmail.umd.edu' : 'you@example.com'}
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
            <input
              type='password'
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='At least 6 characters'
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className='text-center text-sm text-gray-500 mt-6'>
          Already have an account?{' '}
          <Link to='/login' className='text-red-600 font-medium hover:underline'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
