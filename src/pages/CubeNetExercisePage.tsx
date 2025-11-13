import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import * as THREE from 'three'
import '../App.css'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 500
const SQUARE_SIZE = 1

// Face colors for identification
const FACE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F'  // Yellow
]

// All 11 distinct cube nets with face mappings
const CUBE_NETS = [
  [
    { x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 }, { x: 1, y: 0, face: 3 },
    { x: 0, y: 1, face: 4 }, { x: 0, y: 2, face: 5 }
  ],
  [
    { x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 }, { x: 1, y: 0, face: 3 },
    { x: 2, y: 0, face: 4 }, { x: 0, y: 1, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 },
    { x: 0, y: 1, face: 3 }, { x: 0, y: 2, face: 4 }, { x: 1, y: 2, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 0, y: 1, face: 2 },
    { x: 0, y: 2, face: 3 }, { x: 1, y: 2, face: 4 }, { x: 2, y: 2, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 },
    { x: 2, y: 1, face: 3 }, { x: 2, y: 2, face: 4 }, { x: 3, y: 2, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 },
    { x: 2, y: 1, face: 3 }, { x: 1, y: 1, face: 4 }, { x: 0, y: 1, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 },
    { x: 3, y: 0, face: 3 }, { x: 1, y: 1, face: 4 }, { x: 1, y: -1, face: 5 }
  ],
  [
    { x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 },
    { x: 1, y: 0, face: 3 }, { x: 0, y: 1, face: 4 }, { x: 1, y: 1, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 0, y: 1, face: 2 },
    { x: 1, y: 1, face: 3 }, { x: 0, y: 2, face: 4 }, { x: -1, y: 1, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 },
    { x: 1, y: 2, face: 3 }, { x: 2, y: 2, face: 4 }, { x: 2, y: 1, face: 5 }
  ],
  [
    { x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 },
    { x: 0, y: 1, face: 3 }, { x: -1, y: 1, face: 4 }, { x: -1, y: 0, face: 5 }
  ]
]

const EDUCATIONAL_TIPS = [
  {
    title: "Introduction to cube nets",
    content: "A cube net is a 2D arrangement of the 6 square faces of a cube that can be folded to form the 3D cube. There are exactly 11 distinct (non-congruent) ways to arrange these 6 squares."
  },
  {
    title: "Why exactly 11 nets?",
    content: "Mathematicians have proven that there are exactly 11 distinct cube nets. This means that while you can rotate or reflect nets, there are only 11 fundamentally different arrangements that cannot be transformed into each other through rotation or reflection."
  },
  {
    title: "How to identify valid nets",
    content: "A valid cube net must have all 6 squares connected edge-to-edge, forming a single connected shape. No squares can overlap, and when folded, all edges must align perfectly to form the cube."
  },
  {
    title: "Common patterns in cube nets",
    content: "Common patterns include T-shapes, crosses, L-shapes, staircases, and strips. Each pattern represents a different way the cube can be 'unwrapped' while maintaining connectivity between faces."
  },
  {
    title: "Real-world applications",
    content: "Cube nets are essential in packaging design, architecture, and manufacturing. Understanding nets helps in creating efficient packaging, designing foldable structures, and solving spatial reasoning problems."
  },
  {
    title: "Mathematical properties",
    content: "Each net has specific properties: all nets have the same total area (6 square units), all have exactly 6 squares, and all can be folded into a cube. The difference lies in how the squares are arranged and connected."
  },
  {
    title: "Common mistakes to avoid",
    content: "Students often confuse nets with different orientations of the same net. Remember: if you can rotate or flip one net to match another, they're the same net. Also, ensure all squares are connected - isolated squares cannot form a valid cube."
  },
  {
    title: "Practice tips",
    content: "Try to visualize how each net folds into a cube. Identify which faces will be opposite each other in the 3D cube. Practice by drawing nets and mentally folding them. This improves spatial reasoning and helps in recognizing patterns."
  }
]

// Cube face positions in 3D space
const FACE_POSITIONS = [
  { position: [0, 0, 0.5], rotation: [0, 0, 0] },      // Front
  { position: [0, 0, -0.5], rotation: [0, Math.PI, 0] }, // Back
  { position: [0, 0.5, 0], rotation: [-Math.PI / 2, 0, 0] }, // Top
  { position: [0, -0.5, 0], rotation: [Math.PI / 2, 0, 0] }, // Bottom
  { position: [0.5, 0, 0], rotation: [0, -Math.PI / 2, 0] }, // Right
  { position: [-0.5, 0, 0], rotation: [0, Math.PI / 2, 0] }  // Left
]

interface FaceProps {
  faceIndex: number
  progress: number
  netPosition: { x: number; y: number; angle: number }
  color: string
}

function CubeFace({ faceIndex, progress, netPosition, color }: FaceProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const face3D = FACE_POSITIONS[faceIndex]
  
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return
    
    // Interpolate between 3D and 2D positions
    const t = progress
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // Easing function
    
    // 3D position
    const pos3D = new THREE.Vector3(...face3D.position as [number, number, number])
    
    // 2D net position (flattened to z=0 plane)
    const pos2D = new THREE.Vector3(
      netPosition.x * SQUARE_SIZE,
      -netPosition.y * SQUARE_SIZE,
      0
    )
    
    // Interpolate position with smooth easing
    groupRef.current.position.lerpVectors(pos3D, pos2D, easeT)
    
    // Interpolate rotation
    const rot3D = new THREE.Euler(...face3D.rotation as [number, number, number])
    const rot2D = new THREE.Euler(0, 0, netPosition.angle)
    
    groupRef.current.rotation.x = THREE.MathUtils.lerp(rot3D.x, rot2D.x, easeT)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(rot3D.y, rot2D.y, easeT)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(rot3D.z, rot2D.z, easeT)
    
    // Update material opacity
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.opacity = 0.9 + 0.1 * (1 - easeT)
    }
  })
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <boxGeometry args={[SQUARE_SIZE, SQUARE_SIZE, 0.01]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.3}
          roughness={0.4}
          opacity={0.9 + 0.1 * (1 - progress)}
          transparent
        />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[SQUARE_SIZE * 0.8, SQUARE_SIZE * 0.8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <Text
        position={[0, 0, 0.007]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {faceIndex + 1}
      </Text>
    </group>
  )
}

function CubeScene({ 
  currentNet, 
  faceStates 
}: { 
  currentNet: number
  faceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>
}) {
  const net = CUBE_NETS[currentNet]
  
  // Calculate net positions for each face
  const minX = Math.min(...net.map(s => s.x))
  const minY = Math.min(...net.map(s => s.y))
  
  const getNetPosition = (faceIndex: number) => {
    const faceInNet = net.find(s => s.face === faceIndex)
    if (!faceInNet) return { x: 0, y: 0, angle: 0 }
    
    return {
      x: faceInNet.x - minX,
      y: faceInNet.y - minY,
      angle: 0
    }
  }
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      
      {faceStates.map((state, faceIndex) => (
        <CubeFace
          key={faceIndex}
          faceIndex={faceIndex}
          progress={state.animationProgress}
          netPosition={getNetPosition(faceIndex)}
          color={FACE_COLORS[faceIndex]}
        />
      ))}
      
      {faceStates.some(s => s.animationProgress > 0.5) && (
        <Text
          position={[0, -3, 0]}
          fontSize={0.5}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          Net {currentNet + 1} of 11
        </Text>
      )}
    </>
  )
}

export default function CubeNetExercisePage() {
  const [currentNet, setCurrentNet] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)
  const [unfoldProgress, setUnfoldProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [faceStates, setFaceStates] = useState<Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>>(
    Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 }))
  )

  // Animate unfolding
  useEffect(() => {
    if (!isAnimating) return

    const animate = () => {
      setFaceStates(prev => {
        let hasChanges = false
        const newStates = prev.map((state) => {
          if (Math.abs(state.animationProgress - state.targetProgress) > 0.01) {
            hasChanges = true
            const diff = state.targetProgress - state.animationProgress
            return {
              ...state,
              animationProgress: state.animationProgress + diff * 0.12 // Smooth easing
            }
          }
          return state
        })
        
        if (!hasChanges) {
          setIsAnimating(false)
        }
        
        return newStates
      })
    }
    
    const interval = setInterval(animate, 16) // ~60fps
    
    return () => clearInterval(interval)
  }, [isAnimating])

  const unfoldStep = () => {
    const net = CUBE_NETS[currentNet]
    const unfoldedCount = faceStates.filter(s => s.unfolded).length
    
    if (unfoldedCount < 6) {
      setIsAnimating(true)
      setFaceStates(prev => {
        const newStates = [...prev]
        const nextFaceIndex = net[unfoldedCount].face
        newStates[nextFaceIndex] = {
          ...newStates[nextFaceIndex],
          unfolded: true,
          targetProgress: 1
        }
        return newStates
      })
      setUnfoldProgress((unfoldedCount + 1) / 6)
    }
  }

  const foldStep = () => {
    const unfoldedCount = faceStates.filter(s => s.unfolded).length
    
    if (unfoldedCount > 0) {
      setIsAnimating(true)
      setFaceStates(prev => {
        const newStates = [...prev]
        const net = CUBE_NETS[currentNet]
        for (let i = net.length - 1; i >= 0; i--) {
          const faceIndex = net[i].face
          if (newStates[faceIndex].unfolded) {
            newStates[faceIndex] = {
              ...newStates[faceIndex],
              unfolded: false,
              targetProgress: 0
            }
            break
          }
        }
        return newStates
      })
      setUnfoldProgress((unfoldedCount - 1) / 6)
    }
  }

  const unfoldAll = () => {
    setIsAnimating(true)
    setFaceStates(prev => prev.map(state => ({
      ...state,
      unfolded: true,
      targetProgress: 1
    })))
    setUnfoldProgress(1)
  }

  const foldAll = () => {
    setIsAnimating(true)
    setFaceStates(prev => prev.map(state => ({
      ...state,
      unfolded: false,
      targetProgress: 0
    })))
    setUnfoldProgress(0)
  }

  const nextNet = () => {
    foldAll()
    setTimeout(() => {
      setCurrentNet((prev) => (prev + 1) % CUBE_NETS.length)
      setFaceStates(Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 })))
      setUnfoldProgress(0)
    }, 600)
  }

  const prevNet = () => {
    foldAll()
    setTimeout(() => {
      setCurrentNet((prev) => (prev - 1 + CUBE_NETS.length) % CUBE_NETS.length)
      setFaceStates(Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 })))
      setUnfoldProgress(0)
    }, 600)
  }

  const randomNet = () => {
    foldAll()
    setTimeout(() => {
      setCurrentNet(Math.floor(Math.random() * CUBE_NETS.length))
      setFaceStates(Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 })))
      setUnfoldProgress(0)
    }, 600)
  }

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % EDUCATIONAL_TIPS.length)
  }

  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + EDUCATIONAL_TIPS.length) % EDUCATIONAL_TIPS.length)
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Link
            to="/"
            className="mb-4 inline-block px-4 py-2 bg-gray-200 hover:bg-gray-300 text-black font-medium rounded-lg transition-colors"
          >
            ← Back to Home
          </Link>
          <p className="text-sm text-indigo-400 mb-1">Interactive Learning</p>
          <h1 className="text-4xl font-bold text-black mb-2">Cube Net Unfolding - 11 Distinct Nets</h1>
          <p className="text-red-600 italic">Unfold the cube side by side and explore all 11 nets in true 3D</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: 3D Canvas */}
          <div className="flex-1">
            <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
              <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                gl={{ antialias: true }}
              >
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <OrbitControls 
                  enablePan={false}
                  minDistance={3}
                  maxDistance={10}
                  autoRotate={false}
                />
                <CubeScene currentNet={currentNet} faceStates={faceStates} />
              </Canvas>
            </div>
          </div>

          {/* Right: Information Box */}
          <div className="flex-1 flex flex-col items-center">
            <div className="bg-white border-2 border-black rounded-lg p-6 w-full max-w-md relative">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevTip}
                  className="text-2xl font-bold text-black hover:text-indigo-500 transition-colors"
                >
                  ‹
                </button>
                <h2 className="text-xl font-bold text-black">Understanding Cube Nets</h2>
                <button
                  onClick={nextTip}
                  className="text-2xl font-bold text-black hover:text-indigo-500 transition-colors"
                >
                  ›
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-black leading-relaxed">
                  {EDUCATIONAL_TIPS[currentTip].content}
                </p>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {EDUCATIONAL_TIPS.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentTip ? 'bg-indigo-500' : 'bg-indigo-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={unfoldStep}
              disabled={unfoldProgress >= 1 || isAnimating}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unfold Next Face →
            </button>
            <button
              onClick={foldStep}
              disabled={unfoldProgress <= 0 || isAnimating}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Fold Last Face
            </button>
            <button
              onClick={unfoldAll}
              disabled={unfoldProgress >= 1 || isAnimating}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unfold All
            </button>
            <button
              onClick={foldAll}
              disabled={unfoldProgress <= 0 || isAnimating}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fold All
            </button>
            <button
              onClick={prevNet}
              disabled={isAnimating}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous Net
            </button>
            <button
              onClick={nextNet}
              disabled={isAnimating}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Net →
            </button>
            <button
              onClick={randomNet}
              disabled={isAnimating}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Random Net
            </button>
          </div>
          
          <div className="text-sm text-gray-600 text-center">
            <p>💡 Drag to rotate the 3D view • Scroll to zoom</p>
          </div>
        </div>
      </div>
    </div>
  )
}
