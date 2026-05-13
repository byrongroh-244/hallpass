import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Scanner from './pages/Scanner'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/scanner"   element={<Scanner />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  )
}
