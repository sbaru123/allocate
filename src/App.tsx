import { Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import History from '@/pages/History'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import CheckEmail from '@/pages/CheckEmail'
import Paycheck from '@/pages/Paycheck'
import Home from '@/pages/Home'

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<Home />} />
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='/history' element={<History />} />
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/check-email' element={<CheckEmail />} />
      <Route path='/paycheck' element={<Paycheck />} />
    </Routes>
  )
}
