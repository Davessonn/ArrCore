import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Index from './pages/Index'
import Portainer from './pages/Portainer'
import Radarr from './pages/Radarr'
import Sonarr from './pages/Sonarr'
import QBittorrent from './pages/QBittorrent'
import Seerr from './pages/Seerr'
import Settings from './pages/Settings'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Index />} />
        <Route path="/portainer" element={<Portainer />} />
        <Route path="/sonarr" element={<Sonarr />} />
        <Route path="/radarr" element={<Radarr />} />
        <Route path="/qbittorrent" element={<QBittorrent />} />
        <Route path="/seerr" element={<Seerr />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
