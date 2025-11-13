import { Link } from 'react-router-dom'

const THEOREMS = [
  {
    id: 'angle-in-semicircle',
    number: 5,
    name: 'Angle In A SemiCircle',
    fullName: 'Circle Theorem 5 - Angle In A SemiCircle',
    description: 'Discover how the angle in a semicircle is always 90°',
    color: 'bg-pink-500 hover:bg-pink-600'
  },
  {
    id: 'cube-net-unfolding',
    number: null,
    name: 'Cube Net Unfolding',
    fullName: 'Cube Net Unfolding - 11 Distinct Nets',
    description: 'Explore the 11 distinct ways to unfold a 3D cube into 2D nets',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">Interactive Learning</h1>
          <p className="text-xl text-gray-600">Explore Circle Theorems Through Interactive Exercises</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {THEOREMS.map((theorem) => (
            <div
              key={theorem.id}
              className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <h2 className="text-xl font-semibold text-black mb-2">
                {theorem.number ? `Circle Theorem ${theorem.number}` : 'Geometry Exercise'}
              </h2>
              <p className="text-gray-700 mb-4 font-medium">{theorem.name}</p>
              
              <Link
                to={`/${theorem.id}`}
                className={`block w-full px-6 py-3 ${theorem.color} text-white font-bold text-base rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-center`}
              >
                Play with "{theorem.fullName}"
              </Link>

              <p className="mt-4 text-gray-500 text-sm">{theorem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

