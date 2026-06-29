import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/hooks/useTheme'

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/paycheck', label: 'Paycheck' },
  { to: '/history', label: 'History' }
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className='fixed inset-y-0 left-0 w-56 border-r border-gray-200 bg-white dark:bg-[#0a1628] dark:border-[#1e3354]'>
      <div className='flex h-full flex-col'>
        <div className='border-b border-gray-200 dark:border-[#1e3354] px-4 py-4 flex justify-center'>
          <NavLink to='/dashboard' className='font-bold text-sky-700 dark:text-sky-400 text-2xl tracking-tight'>
            Allocate
          </NavLink>
        </div>

        <nav className='flex flex-1 flex-col gap-2 px-4 py-3'>
          {navItems.map(function (item) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={function ({ isActive }) {
                  return `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-slate-400 dark:hover:bg-[#0e1f38] dark:hover:text-slate-100'
                  }`
                }}
              >
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className='px-4 pb-3'>
          {/* Theme toggle */}
          <div className='flex items-center gap-1 bg-gray-100 dark:bg-[#06101f] rounded-full p-1 mb-3'>
            <button
              type='button'
              onClick={function () { setTheme('light') }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='5'/>
                <line x1='12' y1='1' x2='12' y2='3'/>
                <line x1='12' y1='21' x2='12' y2='23'/>
                <line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/>
                <line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/>
                <line x1='1' y1='12' x2='3' y2='12'/>
                <line x1='21' y1='12' x2='23' y2='12'/>
                <line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/>
                <line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/>
              </svg>
              Light
            </button>
            <button
              type='button'
              onClick={function () { setTheme('dark') }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0e1f38] text-slate-100 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/>
              </svg>
              Dark
            </button>
          </div>

          {/* Divider */}
          <div className='border-t border-gray-200 dark:border-[#1e3354] mb-3' />

          {/* Sign out */}
          <button
            type='button'
            onClick={handleSignOut}
            className='w-full rounded-full px-4 py-2 text-center text-sm font-medium bg-gray-100 text-gray-900 transition-colors hover:bg-sky-600 hover:text-white dark:bg-[#0e1f38] dark:text-slate-200 dark:hover:bg-sky-600 dark:hover:text-white'
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
