import GeohashMap from './components/GeohashMap'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {

  return (
    <Router basename={import.meta.env.PROD ? '/geoplotter' : '/'}>
    <Routes>
      <Route path="/" element={<GeohashMap />} />
    </Routes>
  </Router>  
  )
}

export default App
