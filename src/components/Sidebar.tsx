import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/paycheck', label: 'Paycheck' },
]

export default function Sidebar() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className='fixed inset-y-0 left-0 w-56 border-r border-gray-200 bg-white'>
      <div className='flex h-full flex-col'>
        <div className='border-b border-gray-200 px-4 py-4'>
          <NavLink to='/dashboard' className='font-bold text-sky-700 text-2xl tracking-tight'>
            Allocate
          </NavLink>
        </div>

        <nav className='flex flex-1 flex-col gap-2 px-4 py-3'>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className='border-t border-gray-200 p-4'>
          <button
            type='button'
            onClick={handleSignOut}
            className='w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700'
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
