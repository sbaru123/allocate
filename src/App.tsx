import { Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import History from '@/pages/History'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Settings from '@/pages/Settings'
import Home from './pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='/history' element={<History />} />
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/settings' element={<Settings />} />
    </Routes>
  )
}
