import GeohashMap from './components/GeohashMap'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {

  return (
    <Router>
    <Routes>
      <Route path="/" element={<GeohashMap />} />
    </Routes>
  </Router>  
  )
}

export default App
