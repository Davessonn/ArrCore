import { Routes, Route, Navigate } from 'react-router-dom'
import Index from './pages/Index'
import Portainer from './pages/Portainer'
import Radarr from './pages/Radarr'
import Sonarr from './pages/Sonarr'
import './App.css'

function App() {
  return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/radarr" element={<Radarr />} />
        <Route path="/portainer" element={<Portainer />} />
        <Route path="/sonarr" element={<Sonarr />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default App
