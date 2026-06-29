import { Routes, Route } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import Home from '@/pages/Home'
import History from '@/pages/History'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Onboarding from '@/pages/Onboarding'
import CheckEmail from '@/pages/CheckEmail'
import Paycheck from '@/pages/Paycheck'
import AuthGate from '@/components/AuthGate'
import AuthCallback from '@/pages/AuthCallback'

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<LandingPage />} />
      <Route path='/home' element={<AuthGate><Home /></AuthGate>} />
      <Route path='/history' element={<AuthGate><History /></AuthGate>} />
      <Route path='/paycheck' element={<AuthGate><Paycheck /></AuthGate>} />
      <Route path='/login' element={<Login />} />
      <Route path='/signup' element={<Signup />} />
      <Route path='/onboarding' element={<Onboarding />} />
      <Route path='/auth/callback' element={<AuthCallback />} />
      <Route path='/check-email' element={<CheckEmail />} />
    </Routes>
  )
}
