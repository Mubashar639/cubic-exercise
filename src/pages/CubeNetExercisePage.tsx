import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import * as THREE from 'three'
import '../App.css'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 500
const SQUARE_SIZE = 1

// Face colors for identification - matching the example image
const FACE_COLORS = [
  '#FFB3BA', // Soft Pink
  '#FFD4A3', // Light Orange/Peach
  '#B0E0E6', // Light Blue
  '#90EE90', // Light Green
  '#FFFACD', // Light Yellow
  '#CD853F'  // Muted Reddish-Brown/Terracotta
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
// Face indices: 0=Front, 1=Back, 2=Top, 3=Bottom, 4=Right, 5=Left
const FACE_POSITIONS = [
  { position: [0, 0, 0.5], rotation: [0, 0, 0] },      // Front (0)
  { position: [0, 0, -0.5], rotation: [0, Math.PI, 0] }, // Back (1)
  { position: [0, 0.5, 0], rotation: [-Math.PI / 2, 0, 0] }, // Top (2)
  { position: [0, -0.5, 0], rotation: [Math.PI / 2, 0, 0] }, // Bottom (3)
  { position: [0.5, 0, 0], rotation: [0, -Math.PI / 2, 0] }, // Right (4)
  { position: [-0.5, 0, 0], rotation: [0, Math.PI / 2, 0] }  // Left (5)
]

// Face adjacency: which faces are adjacent to each face in the 3D cube
// This ensures physical relationships are maintained when unfolding
const FACE_ADJACENCIES: { [key: number]: number[] } = {
  0: [2, 3, 4, 5], // Front is adjacent to Top, Bottom, Right, Left
  1: [2, 3, 4, 5], // Back is adjacent to Top, Bottom, Right, Left
  2: [0, 1, 4, 5], // Top is adjacent to Front, Back, Right, Left
  3: [0, 1, 4, 5], // Bottom is adjacent to Front, Back, Right, Left
  4: [0, 1, 2, 3], // Right is adjacent to Front, Back, Top, Bottom
  5: [0, 1, 2, 3]  // Left is adjacent to Front, Back, Top, Bottom
}

// Unfolding direction map: defines which direction each face unfolds relative to its parent
// UNFOLD_DIRECTION[parent][child] = "UP" | "DOWN" | "LEFT" | "RIGHT"
const UNFOLD_DIRECTION: { [key: number]: { [key: number]: "UP" | "DOWN" | "LEFT" | "RIGHT" } } = {
  0: { // Front (0) as parent
    2: "UP",    // Top
    3: "DOWN",  // Bottom
    4: "RIGHT", // Right
    5: "LEFT"   // Left
  },
  2: { // Top (2) as parent
    0: "DOWN",  // Front
    1: "UP",    // Back
    4: "RIGHT", // Right
    5: "LEFT"   // Left
  },
  3: { // Bottom (3) as parent
    0: "UP",    // Front
    1: "DOWN",  // Back
    4: "RIGHT", // Right
    5: "LEFT"   // Left
  },
  4: { // Right (4) as parent
    0: "LEFT",  // Front
    1: "RIGHT", // Back
    2: "UP",    // Top
    3: "DOWN"   // Bottom
  },
  5: { // Left (5) as parent
    0: "RIGHT", // Front
    1: "LEFT",  // Back
    2: "UP",    // Top
    3: "DOWN"   // Bottom
  },
  1: { // Back (1) as parent
    2: "DOWN",  // Top
    3: "UP",    // Bottom
    4: "LEFT",  // Right
    5: "RIGHT"  // Left
  }
}

// Note: Opposite faces (0-1, 2-3, 4-5) cannot be adjacent in any valid net
// This is enforced by the physical structure of a cube

interface FaceProps {
  faceIndex: number
  progress: number
  netPosition: { x: number; y: number; angle: number }
  color: string
  attachedToFace?: number // Which face this is attached to (for rotation)
  unfoldDirection?: "UP" | "DOWN" | "LEFT" | "RIGHT" // Direction of unfolding from parent
  faceStates?: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>
}

function CubeFace({ faceIndex, progress, netPosition, color, attachedToFace, unfoldDirection, faceStates }: FaceProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const face3D = FACE_POSITIONS[faceIndex]
  
  useFrame(() => {
    if (!meshRef.current || !groupRef.current) return
    
    // Interpolate between 3D and 2D positions
    const t = progress
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // Easing function
    
    // Find which face this is attached to (for rotation)
    let pivotFace = attachedToFace
    if (pivotFace === undefined && faceStates) {
      // Find first adjacent face that's already unfolded (or use face 0 as base)
      const adjacents = FACE_ADJACENCIES[faceIndex]
      pivotFace = 0 // Default to front face as base
      for (const adj of adjacents) {
        if (faceStates[adj]?.unfolded && faceStates[adj]?.animationProgress > 0.5) {
          pivotFace = adj
          break
        }
      }
    }
    
    // Calculate rotation around edge if attached to another face
    // Always apply rotation when there's a parent face (even at t=0 or t=1 for smooth transitions)
    if (pivotFace !== undefined && pivotFace !== -1) {
      const pivotFace3D = FACE_POSITIONS[pivotFace]
      const pivotPos = new THREE.Vector3(...pivotFace3D.position as [number, number, number])
      const facePos = new THREE.Vector3(...face3D.position as [number, number, number])
      
      // Calculate the shared edge (the hinge)
      // The edge is the line where the two faces meet
      // For a cube, adjacent faces share an edge at the midpoint of their connecting edge
      
      // Get face normals (pointing outward from cube center)
      const faceNormal = facePos.clone().normalize()
      const pivotNormal = pivotPos.clone().normalize()
      
      // Calculate edge direction (perpendicular to both normals - this is the hinge axis)
      let edgeAxis = new THREE.Vector3()
      if (Math.abs(faceNormal.dot(pivotNormal)) < 0.99) {
        edgeAxis.crossVectors(faceNormal, pivotNormal).normalize()
      } else {
        // Fallback: calculate based on direction
        if (unfoldDirection === "UP" || unfoldDirection === "DOWN") {
          edgeAxis = new THREE.Vector3(1, 0, 0)
        } else if (unfoldDirection === "LEFT" || unfoldDirection === "RIGHT") {
          edgeAxis = new THREE.Vector3(0, 1, 0)
        } else {
          edgeAxis = new THREE.Vector3(1, 0, 0)
        }
      }
      
      // Calculate the edge center (pivot point) - this is where the hinge is
      // For adjacent cube faces, the shared edge center is the midpoint of the connecting edge
      // This keeps the faces connected during rotation
      const edgeCenter = new THREE.Vector3()
        .addVectors(facePos, pivotPos)
        .multiplyScalar(0.5)
      
      // Calculate the vector from edge center to face center
      const relativePos = facePos.clone().sub(edgeCenter)
      
      // Determine rotation direction (always outward from cube center)
      // Test both rotation directions and choose the one that moves away from origin
      const testAngle = Math.PI / 6 // Smaller test angle for more accurate detection
      const testRot1 = relativePos.clone().applyAxisAngle(edgeAxis, testAngle)
      const testRot2 = relativePos.clone().applyAxisAngle(edgeAxis, -testAngle)
      const testPos1 = edgeCenter.clone().add(testRot1)
      const testPos2 = edgeCenter.clone().add(testRot2)
      
      // Choose direction that moves further from origin (unfolds outward)
      const dist1 = testPos1.length()
      const dist2 = testPos2.length()
      const rotationSign = dist1 > dist2 ? 1 : -1
      
      // Two-phase animation:
      // Phase 1 (0-0.6): Rotate around edge (like opening a door) - 90 degrees
      // Phase 2 (0.6-1): Transition to final 2D layout
      const rotationPhase = Math.min(easeT / 0.6, 1)
      const layoutPhase = Math.max((easeT - 0.6) / 0.4, 0)
      
      // Calculate current rotation angle based on phase
      const currentHingeAngle = rotationSign * rotationPhase * Math.PI / 2
      
      // Rotate the face around the edge (hinge rotation) with current angle
      const rotatedRelativePos = relativePos.clone().applyAxisAngle(edgeAxis, currentHingeAngle)
      const rotated3DPos = edgeCenter.clone().add(rotatedRelativePos)
      
      // Calculate final 2D net position
      const pos2D = new THREE.Vector3(
        netPosition.x * SQUARE_SIZE,
        -netPosition.y * SQUARE_SIZE,
        0
      )
      
      // Apply hinge rotation to face orientation
      const baseRot = new THREE.Euler(...face3D.rotation as [number, number, number])
      const hingeRotation = new THREE.Quaternion().setFromAxisAngle(edgeAxis, currentHingeAngle)
      const baseQuat = new THREE.Quaternion().setFromEuler(baseRot)
      const rotatedQuat = baseQuat.multiply(hingeRotation)
      const rotatedEuler = new THREE.Euler().setFromQuaternion(rotatedQuat)
      
      // Calculate position: during rotation phase, use rotated 3D position
      // During layout phase, transition to 2D position
      let currentPos: THREE.Vector3
      if (rotationPhase < 1) {
        // Still rotating - use the rotated 3D position (face opens like a door)
        currentPos = rotated3DPos.clone()
      } else {
        // Rotation complete (90 degrees) - transition to 2D layout
        currentPos = new THREE.Vector3().lerpVectors(rotated3DPos, pos2D, layoutPhase)
      }
      groupRef.current.position.copy(currentPos)
      
      // Final 2D rotation (flat on the plane)
      const rot2D = new THREE.Euler(0, 0, netPosition.angle)
      
      // Blend rotation: keep hinge rotation visible, then transition to 2D
      const finalRot = new THREE.Euler()
      if (rotationPhase < 1) {
        // During rotation, use the rotated euler directly
        finalRot.copy(rotatedEuler)
      } else {
        // After rotation, transition to 2D rotation
        finalRot.x = THREE.MathUtils.lerp(rotatedEuler.x, rot2D.x, layoutPhase)
        finalRot.y = THREE.MathUtils.lerp(rotatedEuler.y, rot2D.y, layoutPhase)
        finalRot.z = THREE.MathUtils.lerp(rotatedEuler.z, rot2D.z, layoutPhase)
      }
      
      groupRef.current.rotation.copy(finalRot)
    } else {
      // Simple interpolation when fully folded or unfolded
      const pos3D = new THREE.Vector3(...face3D.position as [number, number, number])
      const pos2D = new THREE.Vector3(
        netPosition.x * SQUARE_SIZE,
        -netPosition.y * SQUARE_SIZE,
        0
      )
      
      groupRef.current.position.lerpVectors(pos3D, pos2D, easeT)
      
      const rot3D = new THREE.Euler(...face3D.rotation as [number, number, number])
      const rot2D = new THREE.Euler(0, 0, netPosition.angle)
      
      groupRef.current.rotation.x = THREE.MathUtils.lerp(rot3D.x, rot2D.x, easeT)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(rot3D.y, rot2D.y, easeT)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(rot3D.z, rot2D.z, easeT)
    }
    
    // Update material opacity - more transparent for softer look
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.opacity = 0.75 + 0.15 * (1 - easeT)
    }
  })
  
  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        {/* Rounded box geometry for softer, friendlier look */}
        <boxGeometry args={[SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95, 0.01]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.1}
          roughness={0.7}
          opacity={0.75 + 0.15 * (1 - progress)}
          transparent
        />
      </mesh>
      {/* Softer border with rounded corners effect */}
      <mesh position={[0, 0, 0.006]}>
        <planeGeometry args={[SQUARE_SIZE * 0.75, SQUARE_SIZE * 0.75]} />
        <meshBasicMaterial color="#FFFFFF" opacity={0.3} transparent />
      </mesh>
      <Text
        position={[0, 0, 0.007]}
        fontSize={0.35}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {faceIndex + 1}
      </Text>
    </group>
  )
}

function CubeScene({ 
  detectedNet, 
  faceStates,
  faceAttachments
}: { 
  detectedNet: number | null
  faceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>
  faceAttachments: Map<number, number>
}) {
  // Use detected net if available, otherwise create a simple layout for unfolded faces
  const net = detectedNet !== null ? CUBE_NETS[detectedNet] : null
  
  // Get unfolded faces to create a simple layout if no net is detected
  const unfoldedFaces = faceStates
    .map((state, index) => state.unfolded ? index : -1)
    .filter(index => index !== -1)
  
  // Create a map of face positions in the net
  const facePositions = new Map<number, { x: number; y: number }>()
  
  if (net) {
    // Use the detected net's layout
    const minX = Math.min(...net.map(s => s.x))
    const minY = Math.min(...net.map(s => s.y))
    net.forEach(square => {
      facePositions.set(square.face, { x: square.x - minX, y: square.y - minY })
    })
  } else if (unfoldedFaces.length > 0) {
    // Create a simple grid layout for unfolded faces when no net is detected
    unfoldedFaces.forEach((faceIndex, idx) => {
      const cols = Math.ceil(Math.sqrt(unfoldedFaces.length))
      const x = idx % cols
      const y = Math.floor(idx / cols)
      facePositions.set(faceIndex, { x, y })
    })
  }
  
  const getNetPosition = (faceIndex: number) => {
    const pos = facePositions.get(faceIndex)
    if (!pos) return { x: 0, y: 0, angle: 0 }
    
    return {
      x: pos.x,
      y: pos.y,
      angle: 0
    }
  }
  
  // Check if two faces are adjacent in the net (share an edge)
  const areAdjacentInNet = (face1: number, face2: number): boolean => {
    if (!net) return false // Only show connections for detected nets
    
    const pos1 = facePositions.get(face1)
    const pos2 = facePositions.get(face2)
    if (!pos1 || !pos2) return false
    
    // Check if they share an edge (differ by exactly 1 in x or y, but not both)
    const dx = Math.abs(pos1.x - pos2.x)
    const dy = Math.abs(pos1.y - pos2.y)
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
  }
  
  // Get average progress for connection visibility
  const avgProgress = faceStates.reduce((sum, s) => sum + s.animationProgress, 0) / faceStates.length
  
  return (
    <>
      {/* Softer, more friendly lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#ffffff" />
      
      {/* Draw connections between adjacent faces in the net (like hinges) */}
      {avgProgress > 0.3 && (() => {
        const connections: React.ReactElement[] = []
        const addedConnections = new Set<string>()
        
        faceStates.forEach((state1, faceIndex1) => {
          if (state1.animationProgress < 0.5) return
          
          FACE_ADJACENCIES[faceIndex1].forEach(faceIndex2 => {
            // Avoid duplicate connections
            const connKey = faceIndex1 < faceIndex2 
              ? `${faceIndex1}-${faceIndex2}` 
              : `${faceIndex2}-${faceIndex1}`
            
            if (addedConnections.has(connKey)) return
            if (!areAdjacentInNet(faceIndex1, faceIndex2)) return
            
            const state2 = faceStates[faceIndex2]
            if (state2.animationProgress < 0.5) return
            
            addedConnections.add(connKey)
            
            const pos1 = getNetPosition(faceIndex1)
            const pos2 = getNetPosition(faceIndex2)
            
            // Calculate midpoint for the connection line
            const midX = (pos1.x + pos2.x) * SQUARE_SIZE / 2
            const midY = (-pos1.y - pos2.y) * SQUARE_SIZE / 2
            const midZ = 0.01 * avgProgress
            
            // Determine if horizontal or vertical connection
            const isHorizontal = Math.abs(pos1.x - pos2.x) > Math.abs(pos1.y - pos2.y)
            const length = SQUARE_SIZE * 0.3
            
            connections.push(
              <mesh key={connKey} position={[midX, midY, midZ]}>
                <boxGeometry args={[isHorizontal ? length : 0.02, isHorizontal ? 0.02 : length, 0.005]} />
                <meshStandardMaterial 
                  color="#888888" 
                  metalness={0.3}
                  roughness={0.5}
                  opacity={0.6 * avgProgress}
                  transparent
                />
              </mesh>
            )
          })
        })
        
        return connections
      })()}
      
      {faceStates.map((state, faceIndex) => {
        const parentFace = faceAttachments.get(faceIndex)
        const unfoldDirection = parentFace !== undefined && parentFace !== -1 
          ? UNFOLD_DIRECTION[parentFace]?.[faceIndex] 
          : undefined
        
        return (
          <CubeFace
            key={faceIndex}
            faceIndex={faceIndex}
            progress={state.animationProgress}
            netPosition={getNetPosition(faceIndex)}
            color={FACE_COLORS[faceIndex]}
            attachedToFace={parentFace}
            unfoldDirection={unfoldDirection}
            faceStates={faceStates}
          />
        )
      })}
      
      {detectedNet !== null && faceStates.some(s => s.animationProgress > 0.5) && (
        <Text
          position={[0, -3, 0]}
          fontSize={0.5}
          color="#666666"
          anchorX="center"
          anchorY="middle"
        >
          Net {detectedNet + 1} of 11
        </Text>
      )}
    </>
  )
}

export default function CubeNetExercisePage() {
  const [detectedNet, setDetectedNet] = useState<number | null>(null)
  const [currentTip, setCurrentTip] = useState(0)
  const [unfoldProgress, setUnfoldProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isShowingHint, setIsShowingHint] = useState(false)
  const [hintTimeout, setHintTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [discoveredNets, setDiscoveredNets] = useState<Set<number>>(new Set())
  const [lastDiscoveryMessage, setLastDiscoveryMessage] = useState<string | null>(null)
  const [faceStates, setFaceStates] = useState<Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>>(
    Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 }))
  )
  const [faceAttachments, setFaceAttachments] = useState<Map<number, number>>(new Map()) // Track which face each face is attached to

  // Build adjacency graph from current unfolding pattern using face attachments
  // This tracks which faces are actually connected in the unfolding pattern
  const buildUnfoldingAdjacencyGraph = useCallback((faceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>, attachments: Map<number, number>) => {
    const adjacencies = new Map<number, Set<number>>()
    
    // Initialize all faces
    for (let i = 0; i < 6; i++) {
      adjacencies.set(i, new Set())
    }
    
    // Build adjacency from attachments: if face A attaches to face B, they're adjacent
    attachments.forEach((attachedTo, faceIndex) => {
      if (attachedTo !== -1 && faceStates[faceIndex]?.unfolded && faceStates[attachedTo]?.unfolded) {
        adjacencies.get(faceIndex)!.add(attachedTo)
        adjacencies.get(attachedTo)!.add(faceIndex)
      }
    })
    
    // Also add 3D-adjacent pairs that are both unfolded and not opposite
    // (these must share an edge in any valid net)
    for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
      if (!faceStates[faceIndex]?.unfolded) continue
      
      FACE_ADJACENCIES[faceIndex].forEach(adjFace => {
        if (!faceStates[adjFace]?.unfolded) return
        
        // Check if they're opposite faces
        const opposite = faceIndex === 0 ? 1 : faceIndex === 1 ? 0 : 
                         faceIndex === 2 ? 3 : faceIndex === 3 ? 2 :
                         faceIndex === 4 ? 5 : 4
        
        if (adjFace !== opposite) {
          // They're 3D-adjacent and not opposite, so they must share an edge in the net
          adjacencies.get(faceIndex)!.add(adjFace)
          adjacencies.get(adjFace)!.add(faceIndex)
        }
      })
    }
    
    return adjacencies
  }, [])

  // Check if current unfolded state matches any of the 11 net patterns
  const checkNetDiscovery = useCallback((newFaceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>) => {
    const unfoldedCount = newFaceStates.filter(s => s.unfolded).length
    
    // Only check when all 6 faces are unfolded
    if (unfoldedCount === 6) {
      // Build adjacency graph from current unfolding
      const currentAdjacencies = buildUnfoldingAdjacencyGraph(newFaceStates, faceAttachments)
      
      // Check against all 11 nets to find which one matches
      for (let netIndex = 0; netIndex < CUBE_NETS.length; netIndex++) {
        const net = CUBE_NETS[netIndex]
        
        // Build adjacency graph for this net
        const netAdjacencies = new Map<number, Set<number>>()
        const minX = Math.min(...net.map(s => s.x))
        const minY = Math.min(...net.map(s => s.y))
        
        net.forEach(square => {
          const faceIndex = square.face
          const x = square.x - minX
          const y = square.y - minY
          
          if (!netAdjacencies.has(faceIndex)) {
            netAdjacencies.set(faceIndex, new Set())
          }
          
          // Find adjacent faces in the net (share an edge)
          net.forEach(otherSquare => {
            if (otherSquare.face === faceIndex) return
            
            const otherX = otherSquare.x - minX
            const otherY = otherSquare.y - minY
            
            // Check if they share an edge
            const dx = Math.abs(x - otherX)
            const dy = Math.abs(y - otherY)
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
              netAdjacencies.get(faceIndex)!.add(otherSquare.face)
            }
          })
        })
        
        // Compare adjacency graphs
        let isMatch = true
        
        // Check if all faces have the same adjacencies
        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
          const currentAdj = currentAdjacencies.get(faceIndex) || new Set()
          const netAdj = netAdjacencies.get(faceIndex) || new Set()
          
          // Check if the sets match
          if (currentAdj.size !== netAdj.size) {
            isMatch = false
            break
          }
          
          for (const adj of currentAdj) {
            if (!netAdj.has(adj)) {
              isMatch = false
              break
            }
          }
          
          if (!isMatch) break
        }
        
        if (isMatch) {
          // Found a matching net!
          setDetectedNet(netIndex)
          
          if (!discoveredNets.has(netIndex)) {
            // New discovery!
            const newDiscovered = new Set(discoveredNets)
            newDiscovered.add(netIndex)
            setDiscoveredNets(newDiscovered)
            
            const discoveryCount = newDiscovered.size
            setLastDiscoveryMessage(`🎉 Great! You discovered Net ${netIndex + 1}! You've found ${discoveryCount} out of 11 nets! ${discoveryCount === 11 ? 'Amazing! You found all 11 nets!' : 'Keep unfolding to discover more!'}`)
            
            // Clear message after 5 seconds
            setTimeout(() => {
              setLastDiscoveryMessage(null)
            }, 5000)
          }
          return // Found a match, stop checking
        }
      }
      
      // If no net matches, clear detected net
      setDetectedNet(null)
    } else {
      // If not all faces are unfolded, clear detected net
      setDetectedNet(null)
    }
  }, [discoveredNets, buildUnfoldingAdjacencyGraph, faceAttachments])

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
          // Check for net discovery when animation completes
          setTimeout(() => {
            checkNetDiscovery(newStates)
          }, 200)
        }
        
        return newStates
      })
    }
    
    const interval = setInterval(animate, 16) // ~60fps
    
    return () => clearInterval(interval)
  }, [isAnimating, checkNetDiscovery])

  // Get the unfold direction for a face from its parent
  const getUnfoldDirection = (parentFace: number, childFace: number): "UP" | "DOWN" | "LEFT" | "RIGHT" | null => {
    return UNFOLD_DIRECTION[parentFace]?.[childFace] || null
  }

  // Get all possible unfold directions for a face (which parents it can attach to)
  const getPossibleUnfoldDirections = (faceIndex: number, currentFaceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>): Array<{ parent: number; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }> => {
    const directions: Array<{ parent: number; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }> = []
    
    // Check all possible parent faces
    for (let parent = 0; parent < 6; parent++) {
      if (currentFaceStates[parent]?.unfolded) {
        const direction = getUnfoldDirection(parent, faceIndex)
        if (direction) {
          directions.push({ parent, direction })
        }
      }
    }
    
    return directions
  }

  // Check if a face can be unfolded (must be adjacent to an already unfolded face, or be the first face)
  const canUnfoldFace = (faceIndex: number, currentFaceStates: Array<{ unfolded: boolean; animationProgress: number; targetProgress: number }>) => {
    const unfoldedCount = currentFaceStates.filter(s => s.unfolded).length
    
    // First face can always be unfolded
    if (unfoldedCount === 0) {
      return true
    }
    
    // After first face, can only unfold faces that have a valid direction from an unfolded parent
    const possibleDirections = getPossibleUnfoldDirections(faceIndex, currentFaceStates)
    return possibleDirections.length > 0
  }

  // Functions to control individual faces (permanent controls for solving)
  const unfoldFace = (faceIndex: number) => {
    if (isShowingHint) return // Don't allow during hint
    
    // Check if this face can be unfolded
    if (!canUnfoldFace(faceIndex, faceStates)) {
      return // Can't unfold this face yet
    }
    
    setIsAnimating(true)
    setFaceStates(prev => {
      const newStates = [...prev]
      if (!newStates[faceIndex].unfolded) {
        newStates[faceIndex] = {
          ...newStates[faceIndex],
          unfolded: true,
          targetProgress: 1
        }
        
        // Track which face this attaches to (first adjacent unfolded face, or -1 if first)
        setFaceAttachments(prevAttachments => {
          const newAttachments = new Map(prevAttachments)
          const unfoldedFaces = newStates
            .map((s, i) => s.unfolded ? i : -1)
            .filter(i => i !== -1)
          
          if (unfoldedFaces.length === 1) {
            // First face, no attachment
            newAttachments.set(faceIndex, -1)
          } else {
            // Find first adjacent face that's already unfolded
            const adjacents = FACE_ADJACENCIES[faceIndex]
            let attachedTo = -1
            for (const adj of adjacents) {
              if (newStates[adj]?.unfolded) {
                attachedTo = adj
                break
              }
            }
            // This should always find a match since canUnfoldFace checked
            newAttachments.set(faceIndex, attachedTo)
          }
          return newAttachments
        })
        
        // Update progress
        const unfoldedCount = newStates.filter(s => s.unfolded).length + 1
        setUnfoldProgress(unfoldedCount / 6)
        
        // Check for net discovery after a short delay to allow animation
        setTimeout(() => {
          checkNetDiscovery(newStates)
        }, 100)
      }
      return newStates
    })
  }

  const foldFace = (faceIndex: number) => {
    if (isShowingHint) return // Don't allow during hint
    
    setIsAnimating(true)
    setDetectedNet(null) // Clear detected net when folding
    setFaceAttachments(prev => {
      const newAttachments = new Map(prev)
      newAttachments.delete(faceIndex)
      // Also remove any faces that were attached to this face
      newAttachments.forEach((attachedTo, face) => {
        if (attachedTo === faceIndex) {
          newAttachments.delete(face)
        }
      })
      return newAttachments
    })
    setFaceStates(prev => {
      const newStates = [...prev]
      if (newStates[faceIndex].unfolded) {
        newStates[faceIndex] = {
          ...newStates[faceIndex],
          unfolded: false,
          targetProgress: 0
        }
        
        // Update progress
        const unfoldedCount = newStates.filter(s => s.unfolded).length - 1
        setUnfoldProgress(unfoldedCount / 6)
      }
      return newStates
    })
  }

  // Hint functions that show preview and auto-reset
  const showUnfoldHint = () => {
    if (isShowingHint) return
    
    const unfoldedCount = faceStates.filter(s => s.unfolded).length
    
    if (unfoldedCount < 6) {
      setIsShowingHint(true)
      setIsAnimating(true)
      setFaceStates(prev => {
        const newStates = [...prev]
        // Find first unfolded face
        for (let i = 0; i < newStates.length; i++) {
          if (!newStates[i].unfolded) {
            newStates[i] = {
              ...newStates[i],
              unfolded: true,
              targetProgress: 1
            }
            break
          }
        }
        return newStates
      })
      setUnfoldProgress((unfoldedCount + 1) / 6)
      
      // Auto-reset after 3 seconds
      const timeout = setTimeout(() => {
        hideHint()
      }, 3000)
      setHintTimeout(timeout)
    }
  }

  const showFoldHint = () => {
    if (isShowingHint) return
    
    const unfoldedCount = faceStates.filter(s => s.unfolded).length
    
    if (unfoldedCount > 0) {
      setIsShowingHint(true)
      setIsAnimating(true)
      setFaceStates(prev => {
        const newStates = [...prev]
        // Find last unfolded face
        for (let i = newStates.length - 1; i >= 0; i--) {
          if (newStates[i].unfolded) {
            newStates[i] = {
              ...newStates[i],
              unfolded: false,
              targetProgress: 0
            }
            break
          }
        }
        return newStates
      })
      setUnfoldProgress((unfoldedCount - 1) / 6)
      
      // Auto-reset after 3 seconds
      const timeout = setTimeout(() => {
        hideHint()
      }, 3000)
      setHintTimeout(timeout)
    }
  }

  const showUnfoldAllHint = () => {
    if (isShowingHint) return
    
    setIsShowingHint(true)
    setIsAnimating(true)
    setFaceStates(prev => prev.map(state => ({
      ...state,
      unfolded: true,
      targetProgress: 1
    })))
    setUnfoldProgress(1)
    
    // Auto-reset after 3 seconds
    const timeout = setTimeout(() => {
      hideHint()
    }, 3000)
    setHintTimeout(timeout)
  }

  const showFoldAllHint = () => {
    if (isShowingHint) return
    
    setIsShowingHint(true)
    setIsAnimating(true)
    setFaceStates(prev => prev.map(state => ({
      ...state,
      unfolded: false,
      targetProgress: 0
    })))
    setUnfoldProgress(0)
    
    // Auto-reset after 3 seconds
    const timeout = setTimeout(() => {
      hideHint()
    }, 3000)
    setHintTimeout(timeout)
  }

  const hideHint = () => {
    if (hintTimeout) {
      clearTimeout(hintTimeout)
      setHintTimeout(null)
    }
    setIsShowingHint(false)
    setDetectedNet(null)
    setFaceAttachments(new Map())
    setIsAnimating(true)
    setFaceStates(prev => prev.map(state => ({
      ...state,
      unfolded: false,
      targetProgress: 0
    })))
    setUnfoldProgress(0)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeout) {
        clearTimeout(hintTimeout)
      }
    }
  }, [hintTimeout])

  const resetCube = () => {
    if (hintTimeout) {
      clearTimeout(hintTimeout)
      setHintTimeout(null)
    }
    setIsShowingHint(false)
    setLastDiscoveryMessage(null)
    setDetectedNet(null)
    setFaceAttachments(new Map())
    setFaceStates(Array(6).fill(null).map(() => ({ unfolded: false, animationProgress: 0, targetProgress: 0 })))
    setUnfoldProgress(0)
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
          <p className="text-red-600 italic mb-2">Start with any face, then unfold adjacent faces - the system will detect which net you create!</p>
          <p className="text-gray-700 text-sm bg-blue-50 border border-blue-200 rounded p-2 inline-block">
            <strong>🔷 Like a Real Physical Cube:</strong> Each face keeps its color and number (Face 1 is always Face 1, Face 2 is always Face 2, etc.) no matter how you unfold it. 
            Start by unfolding any face (the base). Then, you can only unfold faces that are adjacent to already unfolded faces - this creates 4 possible paths from the first face! When all 6 faces are unfolded, the system automatically detects which of the 11 nets you've created!
          </p>
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
                <CubeScene detectedNet={detectedNet} faceStates={faceStates} faceAttachments={faceAttachments} />
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
          {/* Discovery Message */}
          {lastDiscoveryMessage && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 mb-2 animate-pulse">
              <p className="text-lg text-green-800 font-bold text-center">
                {lastDiscoveryMessage}
              </p>
            </div>
          )}

          {/* Progress Display */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-2">
            <p className="text-sm text-purple-800 font-medium mb-2">
              <strong>Progress:</strong> You have discovered {discoveredNets.size} out of 11 nets!
              {detectedNet !== null && (
                <span className="ml-2 text-purple-600">
                  • Currently showing: <strong>Net {detectedNet + 1}</strong>
                </span>
              )}
            </p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                    discoveredNets.has(i)
                      ? 'bg-green-500 text-white'
                      : detectedNet === i
                      ? 'bg-blue-400 text-white border-2 border-blue-600'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                  title={discoveredNets.has(i) ? `Net ${i + 1} - Discovered!` : detectedNet === i ? `Net ${i + 1} - Currently detected` : `Net ${i + 1} - Not yet discovered`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Green = Discovered | Blue = Currently Detected | Gray = Not discovered
            </p>
          </div>

          {/* Individual Face Controls */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-2">
            <p className="text-sm text-blue-800 font-medium mb-3">
              <strong>Unfold the Cube Realistically:</strong> Start by unfolding any face (the base). Then, you can only unfold faces that are adjacent to already unfolded faces. This creates 4 possible paths from the first face! When all 6 faces are unfolded, the system will automatically detect which of the 11 nets you've created!
              {detectedNet !== null && (
                <span className="block mt-2 text-green-700 font-bold">
                  ✓ You created Net {detectedNet + 1}!
                </span>
              )}
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {FACE_COLORS.map((color, faceIndex) => {
                const isUnfolded = faceStates[faceIndex]?.unfolded || false
                const canUnfold = canUnfoldFace(faceIndex, faceStates)
                const unfoldedCount = faceStates.filter(s => s.unfolded).length
                const possibleDirections = unfoldedCount > 0 && !isUnfolded 
                  ? getPossibleUnfoldDirections(faceIndex, faceStates)
                  : []
                
                return (
                  <div key={faceIndex} className="flex flex-col items-center gap-2">
                    <div 
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-white font-bold text-lg shadow-md relative ${
                        isUnfolded ? 'border-green-500' : canUnfold ? 'border-blue-400' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {faceIndex + 1}
                      {/* Show direction indicators */}
                      {!isUnfolded && possibleDirections.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="flex flex-col items-center gap-0.5">
                            {possibleDirections.map(({ direction }, idx) => (
                              <span 
                                key={idx}
                                className="text-[8px] font-bold text-white drop-shadow-lg"
                                style={{
                                  transform: direction === 'UP' ? 'translateY(-8px)' :
                                            direction === 'DOWN' ? 'translateY(8px)' :
                                            direction === 'LEFT' ? 'translateX(-8px)' :
                                            'translateX(8px)'
                                }}
                              >
                                {direction === 'UP' ? '↑' : direction === 'DOWN' ? '↓' : direction === 'LEFT' ? '←' : '→'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {unfoldedCount === 0 && (
                      <div className="text-xs text-blue-600 font-medium">Start here</div>
                    )}
                    {unfoldedCount > 0 && !isUnfolded && canUnfold && (
                      <div className="text-xs text-green-600 font-medium">
                        Can unfold {possibleDirections.length > 0 && `(${possibleDirections.map(d => d.direction).join(', ')})`}
                      </div>
                    )}
                    {unfoldedCount > 0 && !isUnfolded && !canUnfold && (
                      <div className="text-xs text-gray-500">Not adjacent</div>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={() => unfoldFace(faceIndex)}
                        disabled={isShowingHint || isUnfolded || isAnimating || !canUnfold}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={unfoldedCount === 0 
                          ? `Start by unfolding Face ${faceIndex + 1}` 
                          : canUnfold 
                            ? `Unfold Face ${faceIndex + 1} ${possibleDirections.length > 0 ? `(${possibleDirections.map(d => d.direction).join(', ')})` : ''}` 
                            : `Face ${faceIndex + 1} is not adjacent to any unfolded face`}
                      >
                        Unfold
                      </button>
                      <button
                        onClick={() => foldFace(faceIndex)}
                        disabled={isShowingHint || !isUnfolded || isAnimating}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={`Fold Face ${faceIndex + 1}`}
                      >
                        Fold
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Optional Hints Section */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-2">
            <p className="text-sm text-yellow-800 font-medium">
              💡 <strong>Hint:</strong> Try to solve the exercise yourself first! The buttons below show a preview hint that automatically resets.
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={showUnfoldHint}
              disabled={isShowingHint || unfoldProgress >= 1 || isAnimating}
              className="px-6 py-3 bg-indigo-400 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Show hint: Unfold next face (preview only)"
            >
              💡 Unfold Next Face Hint →
            </button>
            <button
              onClick={showFoldHint}
              disabled={isShowingHint || unfoldProgress <= 0 || isAnimating}
              className="px-6 py-3 bg-indigo-400 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Show hint: Fold last face (preview only)"
            >
              ← 💡 Fold Last Face Hint
            </button>
            <button
              onClick={showUnfoldAllHint}
              disabled={isShowingHint || unfoldProgress >= 1 || isAnimating}
              className="px-6 py-3 bg-green-400 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Show hint: Unfold all (preview only)"
            >
              💡 Unfold All Hint
            </button>
            <button
              onClick={showFoldAllHint}
              disabled={isShowingHint || unfoldProgress <= 0 || isAnimating}
              className="px-6 py-3 bg-red-400 hover:bg-red-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              title="Show hint: Fold all (preview only)"
            >
              💡 Fold All Hint
            </button>
            {isShowingHint && (
              <button
                onClick={hideHint}
                className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors shadow-md"
              >
                Hide Hint Now
              </button>
            )}
            <button
              onClick={resetCube}
              disabled={isAnimating}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Reset Cube
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

