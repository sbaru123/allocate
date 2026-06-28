import { Routes, Route } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import Home from '@/pages/Home'
import History from '@/pages/History'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import CheckEmail from '@/pages/CheckEmail'
import Paycheck from '@/pages/Paycheck'

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />
      <Route path='/home' element={<Home />} />
      <Route path='/history' element={<History />} />
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/check-email' element={<CheckEmail />} />
      <Route path='/paycheck' element={<Paycheck />} />
    </Routes>
  )
}
