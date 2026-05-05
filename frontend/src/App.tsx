import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Index from './pages/Index'
import Portainer from './pages/Portainer'
import Sonarr from './pages/Sonarr'
import './App.css'

function App() {
  return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/portainer" element={<Portainer />} />
        <Route path="/sonarr" element={<Sonarr />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default App
