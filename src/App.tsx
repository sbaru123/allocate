import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Browse from '@/pages/Browse'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Listings from '@/pages/Listings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/listings" element={<Listings />} />
    </Routes>
  )
}

export default App