import { Routes, Route, Navigate } from "react-router-dom";
import Portainer from "./pages/Portainer";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Portainer />} />
      <Route path="/portainer" element={<Portainer />} />
    </Routes>
  );
}

export default App
