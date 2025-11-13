import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ExercisePage from './pages/ExercisePage'
import CubeNetExercisePage from './pages/CubeNetExercisePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/angle-in-semicircle" element={<ExercisePage />} />
      <Route path="/cube-net-unfolding" element={<CubeNetExercisePage />} />
      {/* Legacy route for backward compatibility */}
      <Route path="/exercise" element={<ExercisePage />} />
    </Routes>
  )
}

export default App
