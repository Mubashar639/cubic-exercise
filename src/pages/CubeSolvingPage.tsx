import { useMemo, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";

// Face colors for the cube
const FACE_COLORS = [
  "#FFB3BA", // Pink - Front
  "#FFD4A3", // Peach - Back
  "#B0E0E6", // Light Blue - Top
  "#90EE90", // Light Green - Bottom
  "#FFFACD", // Lemon Chiffon - Right
  "#CD853F", // Peru - Left
];

// Face positions in 3D cube (face index 0-5 maps to face number 1-6)
const FACE_3D_POSITIONS = [
  { pos: [0, 0, 0.5], rot: [0, 0, 0] },           // 0: Front (Face 1)
  { pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },    // 1: Back (Face 2)
  { pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },// 2: Top (Face 3)
  { pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },// 3: Bottom (Face 4)
  { pos: [0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },// 4: Right (Face 5)
  { pos: [-0.5, 0, 0], rot: [0, Math.PI / 2, 0] } // 5: Left (Face 6)
];

// Individual Face Component
function FaceMesh({ 
  faceIndex, 
  color, 
  label, 
  position, 
  rotation, 
  animProgress 
}: { 
  faceIndex: number; 
  color: string; 
  label: string; 
  position: [number, number, number]; 
  rotation: [number, number, number]; 
  animProgress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const topHalfRef = useRef<THREE.Mesh>(null);
  const bottomHalfRef = useRef<THREE.Mesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current || !labelGroupRef.current) return;
    
    // Show/hide split meshes for Face 3 when combined
    const showSplit = animProgress > 0 && faceIndex === 2;
    if (topHalfRef.current && bottomHalfRef.current) {
      topHalfRef.current.visible = showSplit;
      bottomHalfRef.current.visible = showSplit;
      meshRef.current.visible = !showSplit;
    }
    
    if (animProgress > 0 && faceIndex === 0) {
      // Face 1 (Front) - hide it completely when animation completes
      // Make it invisible/transparent and hide the mesh
      const opacity = THREE.MathUtils.lerp(0.7, 0, animProgress);
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = opacity;
      }
      // Hide the mesh completely when animation is near complete
      meshRef.current.visible = animProgress < 0.95;
      groupRef.current.visible = animProgress < 0.95;
      
      // Still animate it but make it invisible
      const edgeY = 0.5;
      const edgeZ = 0.5;
      const angle = animProgress * Math.PI / 2;
      const fromEdge = new THREE.Vector3(0, -0.5, 0);
      const rotated = fromEdge.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
      const basePos = new THREE.Vector3(0, edgeY, edgeZ).add(rotated);
      const finalY = THREE.MathUtils.lerp(basePos.y, 1.5, animProgress);
      const forwardOffset = animProgress * 0.5;
      const finalPos = new THREE.Vector3(0, finalY, basePos.z + forwardOffset);
      
      groupRef.current.position.copy(finalPos);
      const rotX = THREE.MathUtils.lerp(0, -Math.PI / 2, animProgress);
      groupRef.current.rotation.set(rotX, 0, 0);
      // Label stays in top-right corner
      labelGroupRef.current.position.set(0, 0, 0);
    } else if (animProgress > 0 && faceIndex === 2) {
      // Face 3 (Top) - scales to double height and moves forward
      const scaleY = 1 + animProgress; // Scale from 1 to 2 (double height)
      
      // Move forward (positive Z) so Face 3 is fully in front
      const forwardZ = THREE.MathUtils.lerp(0, 0.5, animProgress); // Move forward by 0.5 units
      
      groupRef.current.position.set(0, 0.5, forwardZ);
      groupRef.current.rotation.set(-Math.PI / 2, 0, 0);
      meshRef.current.scale.set(1, scaleY, 1);
      
      // Update split meshes - top half (Face 1 color) and bottom half (Face 3 color)
      if (topHalfRef.current && bottomHalfRef.current) {
        const halfScaleY = scaleY * 0.5; // Each half is half the total height
        const topY = scaleY * 0.25; // Position top half
        const bottomY = -scaleY * 0.25; // Position bottom half
        
        topHalfRef.current.scale.set(1, halfScaleY, 1);
        topHalfRef.current.position.set(0, topY, 0);
        
        bottomHalfRef.current.scale.set(1, halfScaleY, 1);
        bottomHalfRef.current.position.set(0, bottomY, 0);
      }
      
      // Label stays in top-right corner - adjust position for scaled face
      // When face scales to double height, top edge moves, so adjust label Y position
      labelGroupRef.current.position.set(0, 0, 0);
    } else {
      // Reset to original position
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
      meshRef.current.scale.set(1, 1, 1);
      
      // Reset opacity and visibility for Face 1
      if (faceIndex === 0) {
        if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
          meshRef.current.material.opacity = 0.7;
        }
        meshRef.current.visible = true;
        groupRef.current.visible = true;
      }
      
      // Reset split meshes for Face 3
      if (faceIndex === 2) {
        if (topHalfRef.current && bottomHalfRef.current) {
          topHalfRef.current.visible = false;
          bottomHalfRef.current.visible = false;
          topHalfRef.current.scale.set(1, 1, 1);
          topHalfRef.current.position.set(0, 0, 0);
          bottomHalfRef.current.scale.set(1, 1, 1);
          bottomHalfRef.current.position.set(0, 0, 0);
        }
        meshRef.current.visible = true;
      }
      
      // Label stays in top-right corner
      labelGroupRef.current.position.set(0, 0, 0);
    }
  });

  const material = useMemo(() => 
    new THREE.MeshStandardMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.7, 
      metalness: 0.1, 
      roughness: 0.3,
      side: THREE.DoubleSide
    }), 
    [color]
  );

  // Materials for split faces (Face 3 only)
  const topHalfMaterial = useMemo(() => 
    faceIndex === 2 ? new THREE.MeshStandardMaterial({ 
      color: FACE_COLORS[0], // Face 1's color (Pink)
      transparent: true, 
      opacity: 0.7, 
      metalness: 0.1, 
      roughness: 0.3,
      side: THREE.DoubleSide
    }) : null,
    [faceIndex]
  );

  const bottomHalfMaterial = useMemo(() => 
    faceIndex === 2 ? new THREE.MeshStandardMaterial({ 
      color: FACE_COLORS[2], // Face 3's color (Light Blue)
      transparent: true, 
      opacity: 0.7, 
      metalness: 0.1, 
      roughness: 0.3,
      side: THREE.DoubleSide
    }) : null,
    [faceIndex]
  );

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Split meshes for Face 3 when combined - 50% Face 1 color, 50% Face 3 color */}
      {faceIndex === 2 && topHalfMaterial && bottomHalfMaterial && (
        <>
          <mesh ref={topHalfRef} material={topHalfMaterial} visible={false}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <mesh ref={bottomHalfRef} material={bottomHalfMaterial} visible={false}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </>
      )}
      {/* Label in top-right corner */}
      <group ref={labelGroupRef}>
        <Text
          fontSize={0.2}
          color="#000000"
          fillOpacity={0.7}
          anchorX="right"
          anchorY="top"
          position={
            animProgress > 0 && faceIndex === 2
              ? [0.4, 0.5 * (1 + animProgress), 0.01] // Adjust Y to top of scaled face
              : [0.4, 0.4, 0.01]
          }
        >
          {animProgress > 0 && faceIndex === 2 ? "1×3" : label}
        </Text>
      </group>
      {/* x² in center of each face, or 2x² when combined */}
      <group position={[0, 0, 0.01]}>
        <Text
          fontSize={0.4}
          color="#000000"
          fillOpacity={0.7}
          anchorX="center"
          anchorY="middle"
        >
          {animProgress > 0 && faceIndex === 2 ? "2x²" : "x²"}
        </Text>
      </group>
    </group>
  );
}

// Main 3D Cube component
function Cube3D({ animProgress }: { animProgress: number }) {
  return (
    <group>
      {FACE_3D_POSITIONS.map((facePos, index) => (
        <FaceMesh
          key={index}
          faceIndex={index}
          color={FACE_COLORS[index]}
          label={(index + 1).toString()}
          position={facePos.pos as [number, number, number]}
          rotation={facePos.rot as [number, number, number]}
          animProgress={animProgress}
        />
      ))}
    </group>
  );
}

// Face adjacency data
const FACE_ADJACENCY = [
  { face: 1, up: 3, down: 4, left: 6, right: 5 }, // Face 1 (Front)
  { face: 2, up: 3, down: 4, left: 5, right: 6 }, // Face 2 (Back)
  { face: 3, up: 2, down: 1, left: 6, right: 5 }, // Face 3 (Top)
  { face: 4, up: 1, down: 2, left: 5, right: 6 }, // Face 4 (Bottom)
  { face: 5, up: 3, down: 4, left: 1, right: 2 }, // Face 5 (Right)
  { face: 6, up: 3, down: 4, left: 2, right: 1 }, // Face 6 (Left)
];

// Face Adjacency UI Component
function FaceAdjacencyPanel({ onDirectionClick }: { onDirectionClick: (face: number, direction: string) => void }) {
  return (
    <div className="absolute right-4 top-4 bottom-4 w-[420px] bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl border border-gray-200/50 p-5 flex flex-col">
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Face Adjacency Map</h2>
        <p className="text-xs text-gray-500 text-center mt-1">Cube face relationships</p>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1">
        {FACE_ADJACENCY.map((faceData) => (
          <div
            key={faceData.face}
            className="relative rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200/50 flex flex-col bg-white/80 backdrop-blur-sm"
            style={{ 
              borderTopColor: FACE_COLORS[faceData.face - 1],
              borderTopWidth: '4px'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: FACE_COLORS[faceData.face - 1] }}
                />
                <h3 className="text-lg font-bold text-gray-900">Face {faceData.face}</h3>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onDirectionClick(faceData.face, 'UP')}
                className="w-full flex items-center justify-between bg-gradient-to-r from-blue-50 to-white rounded-lg px-3 py-2 border border-blue-200/50 shadow-sm hover:bg-blue-100 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">UP</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.up}</span>
                </div>
              </button>
              <button
                onClick={() => onDirectionClick(faceData.face, 'DOWN')}
                className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-lg px-3 py-2 border border-gray-200/50 shadow-sm hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">DOWN</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.down}</span>
                </div>
              </button>
              <button
                onClick={() => onDirectionClick(faceData.face, 'LEFT')}
                className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-lg px-3 py-2 border border-gray-200/50 shadow-sm hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">LEFT</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.left}</span>
                </div>
              </button>
              <button
                onClick={() => onDirectionClick(faceData.face, 'RIGHT')}
                className="w-full flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-lg px-3 py-2 border border-gray-200/50 shadow-sm hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">RIGHT</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">→</span>
                  <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.right}</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main page component
function CubeSolvingPage() {
  const [animProgress, setAnimProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  const handleDirectionClick = (face: number, direction: string) => {
    // For now, only implement UP on Face 1
    if (face === 1 && direction === 'UP' && !isAnimating && animProgress === 0) {
      setIsAnimating(true);
      setAnimProgress(0);
      
      // Kill any existing animation
      if (animationRef.current) {
        animationRef.current.kill();
      }
      
      // Animate using GSAP
      animationRef.current = gsap.to({ progress: 0 }, {
        progress: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function() {
          setAnimProgress(this.targets()[0].progress);
        },
        onComplete: () => {
          setIsAnimating(false);
        }
      });
    }
  };

  const handleUndo = () => {
    if (animProgress > 0) {
      setIsAnimating(true);
      
      // Kill any existing animation
      if (animationRef.current) {
        animationRef.current.kill();
      }
      
      // Reverse animation using GSAP
      animationRef.current = gsap.to({ progress: animProgress }, {
        progress: 0,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function() {
          setAnimProgress(this.targets()[0].progress);
        },
        onComplete: () => {
          setIsAnimating(false);
        }
      });
    }
  };

  return (
    <div className="w-full h-screen bg-white">
      <div className="w-full h-full">
        <Canvas>
          <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={75} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, -5, -5]} intensity={0.8} />
          <directionalLight position={[0, 5, 0]} intensity={1} />
          <pointLight position={[0, 0, 0]} intensity={0.5} />
          <Cube3D animProgress={animProgress} />
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        </Canvas>
      </div>
      <div className="absolute top-4 left-4 text-gray-800 bg-white/80 px-4 py-2 rounded-lg border border-gray-300 shadow-md">
        <h1 className="text-2xl font-bold">3D Cube</h1>
        <p className="text-sm text-gray-600">Drag to rotate • Scroll to zoom</p>
      </div>
      {animProgress > 0 && (
        <button
          onClick={handleUndo}
          disabled={isAnimating}
          className="absolute top-4 left-64 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md transition-all font-semibold disabled:cursor-not-allowed"
        >
          Undo
        </button>
      )}
      <FaceAdjacencyPanel onDirectionClick={handleDirectionClick} />
    </div>
  );
}

export default CubeSolvingPage;

