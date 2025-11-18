import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'

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
    id: 'cube-3d',
    number: null,
    name: 'Cube Net Unfolding',
    fullName: 'Cube Net Unfolding - 11 Distinct Nets',
    description: 'Explore the 11 distinct ways to unfold a 3D cube into 2D nets',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  
]

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoEnd = () => {
    // Video will loop, so keep playing state
    if (videoRef.current && !hoveredCard) {
      videoRef.current.play()
    }
  }

  const handleMouseEnter = (theoremId: string) => {
    if (theoremId === 'cube-3d') {
      setHoveredCard(theoremId)
      // Pause on hover
      if (videoRef.current) {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleMouseLeave = (theoremId: string) => {
    if (theoremId === 'cube-3d') {
      setHoveredCard(null)
      // Auto-play when not hovering
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play()
          setIsPlaying(true)
        }
      }, 100)
    }
  }

  // Auto-play video on component mount and when not hovering
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && !hoveredCard) {
        videoRef.current.play()
        setIsPlaying(true)
      }
    }, 500) // Delay to ensure video is loaded
    return () => clearTimeout(timer)
  }, [hoveredCard])

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
              className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden"
              onMouseEnter={() => handleMouseEnter(theorem.id)}
              onMouseLeave={() => handleMouseLeave(theorem.id)}
            >
              <h2 className="text-xl font-semibold text-black mb-2">
                {theorem.number ? `Circle Theorem ${theorem.number}` : 'Geometry Exercise'}
              </h2>
              <p className="text-gray-700 mb-4 font-medium">{theorem.name}</p>
              
              {/* Video Preview for cube-3d */}
              {theorem.id === 'cube-3d' && (
                <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100 aspect-video">
                  <video
                    ref={videoRef}
                    src="/Cube_final.mp4"
                    className="w-full h-full object-cover"
                    onEnded={handleVideoEnd}
                    loop={true}
                    muted
                  />
                  
                  {/* Pause Indicator - shows when hovering (video is paused) */}
                  {hoveredCard === 'cube-3d' && !isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 transition-opacity">
                      <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                        <svg
                          className="w-6 h-6 text-indigo-600"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
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

