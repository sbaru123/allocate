import { Link } from 'react-router-dom'

export default function CheckEmail() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 px-4'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center'>
        <div className='w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-5'>
          <svg className='w-7 h-7 text-sky-500' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={1.5}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' />
          </svg>
        </div>

        <h1 className='text-xl font-bold text-gray-900 mb-2'>Check your email</h1>
        <p className='text-sm text-gray-500 mb-6'>
          We sent a confirmation link to your email address. Click it to activate your account and then sign in.
        </p>

        <p className='text-xs text-gray-400 mb-6'>
          Didn't get it? Check your spam folder, or{' '}
          <Link to='/signup' className='text-sky-600 hover:underline'>try signing up again</Link>.
        </p>

        <Link
          to='/login'
          className='block w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors'
        >
          Go to sign in
        </Link>
      </div>
    </div>
  )
}
