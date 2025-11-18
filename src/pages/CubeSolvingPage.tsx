import { useMemo, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";

// Face colors for the cube
const FACE_COLORS = [
  "#FFB3BA", // Pink - Front (Face 1)
  "#FFD4A3", // Peach - Back (Face 2)
  "#B0E0E6", // Light Blue - Top (Face 3)
  "#90EE90", // Light Green - Bottom (Face 4)
  "#FFFACD", // Lemon Chiffon - Right (Face 5)
  "#CD853F", // Peru - Left (Face 6)
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

// Face adjacency data
const FACE_ADJACENCY = [
  { face: 1, up: 3, down: 4, left: 6, right: 5 }, // Face 1 (Front)
  { face: 2, up: 3, down: 4, left: 5, right: 6 }, // Face 2 (Back)
  { face: 3, up: 2, down: 1, left: 6, right: 5 }, // Face 3 (Top)
  { face: 4, up: 1, down: 2, left: 5, right: 6 }, // Face 4 (Bottom)
  { face: 5, up: 3, down: 4, left: 1, right: 2 }, // Face 5 (Right)
  { face: 6, up: 3, down: 4, left: 2, right: 1 }, // Face 6 (Left)
];


// Type definitions
type FaceState = {
  unfolded: boolean;
  animProgress: number;
  gridX: number;
  gridY: number;
  attachedTo: number | null; // Which face it's attached to
  direction: string | null; // Direction from attached face
  formula: string; // Formula for this face/combination
  combinedFaces: number[]; // Array of face numbers in this combination
};

type AnimationState = {
  sourceFace: number;
  targetFace: number;
  direction: string;
  progress: number;
};

// Individual Face Component
function FaceMesh({ 
  faceIndex, 
  color, 
  label, 
  position, 
  rotation, 
  faceState,
  animationState,
  allFaceStates
}: { 
  faceIndex: number; 
  color: string; 
  label: string; 
  position: [number, number, number]; 
  rotation: [number, number, number]; 
  faceState: FaceState;
  animationState: AnimationState | null;
  allFaceStates: FaceState[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const labelGroupRef = useRef<THREE.Group>(null);
  const segmentRefs = useRef<THREE.Mesh[]>([]);
  const animProgress = faceState.animProgress;
  const isAnimating = animationState && animationState.sourceFace === faceIndex + 1;
  const isTarget = animationState && animationState.targetFace === faceIndex + 1;
  
  // Create segments for combined faces
  // combinedFaces is stored as [bottom, ..., top] (target stays at bottom, source moves to top)
  // We need segments in order [top, ..., bottom] for positioning (idx 0 = top)
  // For 2 faces: combinedFaces = [3, 1] means Face 3 at bottom, Face 1 at top
  // We DON'T reverse - use combinedFaces directly but in reverse order for segments
  // segments[0] should be Face 1 (top, Pink), segments[1] should be Face 3 (bottom, Light Blue)
  const segments = useMemo(() => {
    if (faceState.combinedFaces.length <= 1) return [];
    // combinedFaces = [bottom, top] = [3, 1] for Face 1 moving UP to Face 3
    // We want segments[0] = top (Face 1, Pink), segments[1] = bottom (Face 3, Light Blue)
    // For 2 faces, DON'T reverse - use combinedFaces directly but swap colors
    // combinedFaces = [3, 1] → segments[0] = Face 3 (but with Face 1 color), segments[1] = Face 1 (but with Face 3 color)
    // Actually, let's just reverse normally but then swap the colors for 2 faces
    const reversed = [...faceState.combinedFaces].reverse();
    return reversed.map((faceNum, idx) => {
      // For 2 faces, swap the color: idx 0 gets color of idx 1, idx 1 gets color of idx 0
      const colorFaceNum = faceState.combinedFaces.length === 2 
        ? reversed[reversed.length - 1 - idx]
        : faceNum;
      const faceColor = FACE_COLORS[colorFaceNum - 1];
      return {
        color: faceColor,
        index: idx,
        faceNum
      };
    });
  }, [faceState.combinedFaces]);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current || !labelGroupRef.current) return;
    
    // Show/hide split meshes when face is combined
    const showSplit = faceState.combinedFaces.length > 1;
    segmentRefs.current.forEach(seg => {
      if (seg) seg.visible = showSplit;
    });
    meshRef.current.visible = !showSplit;
    
    if (isAnimating && animationState) {
      // Source face animating toward target
      const dir = animationState.direction;
      
      // Calculate animation based on direction
      let finalPos: THREE.Vector3;
      let finalRot: THREE.Euler;
      
      if (dir === 'UP') {
        // Rotate around top edge
        const edgeY = 0.5;
        const edgeZ = 0.5;
        const angle = animProgress * Math.PI / 2;
        const fromEdge = new THREE.Vector3(0, -0.5, 0);
        const rotated = fromEdge.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
        const basePos = new THREE.Vector3(0, edgeY, edgeZ).add(rotated);
        const finalY = THREE.MathUtils.lerp(basePos.y, 1.5, animProgress);
        const forwardOffset = animProgress * 0.5;
        finalPos = new THREE.Vector3(0, finalY, basePos.z + forwardOffset);
        finalRot = new THREE.Euler(THREE.MathUtils.lerp(0, -Math.PI / 2, animProgress), 0, 0);
      } else if (dir === 'DOWN') {
        // Rotate around bottom edge
        const edgeY = -0.5;
        const edgeZ = 0.5;
        const angle = animProgress * Math.PI / 2;
        const fromEdge = new THREE.Vector3(0, 0.5, 0);
        const rotated = fromEdge.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -angle);
        const basePos = new THREE.Vector3(0, edgeY, edgeZ).add(rotated);
        const finalY = THREE.MathUtils.lerp(basePos.y, -1.5, animProgress);
        const forwardOffset = animProgress * 0.5;
        finalPos = new THREE.Vector3(0, finalY, basePos.z + forwardOffset);
        finalRot = new THREE.Euler(THREE.MathUtils.lerp(0, Math.PI / 2, animProgress), 0, 0);
      } else if (dir === 'LEFT') {
        // Rotate around left edge
        const edgeX = -0.5;
        const edgeZ = 0.5;
        const angle = animProgress * Math.PI / 2;
        const fromEdge = new THREE.Vector3(0.5, 0, 0);
        const rotated = fromEdge.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const basePos = new THREE.Vector3(edgeX, 0, edgeZ).add(rotated);
        const finalX = THREE.MathUtils.lerp(basePos.x, -1.5, animProgress);
        const forwardOffset = animProgress * 0.5;
        finalPos = new THREE.Vector3(finalX, 0, basePos.z + forwardOffset);
        finalRot = new THREE.Euler(0, THREE.MathUtils.lerp(0, Math.PI / 2, animProgress), 0);
      } else { // RIGHT
        // Rotate around right edge
        const edgeX = 0.5;
        const edgeZ = 0.5;
        const angle = animProgress * Math.PI / 2;
        const fromEdge = new THREE.Vector3(-0.5, 0, 0);
        const rotated = fromEdge.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
        const basePos = new THREE.Vector3(edgeX, 0, edgeZ).add(rotated);
        const finalX = THREE.MathUtils.lerp(basePos.x, 1.5, animProgress);
        const forwardOffset = animProgress * 0.5;
        finalPos = new THREE.Vector3(finalX, 0, basePos.z + forwardOffset);
        finalRot = new THREE.Euler(0, THREE.MathUtils.lerp(0, -Math.PI / 2, animProgress), 0);
      }
      
      groupRef.current.position.copy(finalPos);
      groupRef.current.rotation.set(finalRot.x, finalRot.y, finalRot.z);
      
      // Hide source face
      const opacity = THREE.MathUtils.lerp(0.7, 0, animProgress);
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = opacity;
      }
      meshRef.current.visible = animProgress < 0.95;
      groupRef.current.visible = animProgress < 0.95;
      
      labelGroupRef.current.position.set(0, 0, 0);
    } else if (isTarget && animationState) {
      // Target face scales and moves forward
      const scaleY = 1 + animProgress; // Scale to double height
      const forwardZ = THREE.MathUtils.lerp(0, 0.5, animProgress);
      const targetFaceIndex = animationState.targetFace - 1;
      const targetPos = FACE_3D_POSITIONS[targetFaceIndex];
      
      groupRef.current.position.set(...targetPos.pos as [number, number, number]);
      groupRef.current.position.z += forwardZ;
      groupRef.current.rotation.set(...targetPos.rot as [number, number, number]);
      meshRef.current.scale.set(1, scaleY, 1);
      
      // Update split meshes during animation - align colors properly
      // Reverse order: target (stays in place) should be at bottom, source (moves) at top
      let currentCombined: number[] = [];
      if (animationState && isTarget) {
        const existingCombined = allFaceStates[animationState.targetFace - 1]?.combinedFaces || [];
        // Preserve order based on direction
        // For initial combination (empty existingCombined), use source and target
        // When reversed, first in array goes to bottom, last goes to top
        if (existingCombined.length === 0) {
          if (animationState.direction === 'UP') {
            // Source moves UP, goes on top; target stays, goes on bottom
            // Order from top to bottom: [source, target] → array: [target, source] → reversed: [source, target]
            currentCombined = [animationState.targetFace, animationState.sourceFace];
          } else if (animationState.direction === 'DOWN') {
            // Source moves DOWN, goes on bottom; target stays, goes on top
            // Order from top to bottom: [target, source] → array: [source, target] → reversed: [target, source]
            currentCombined = [animationState.sourceFace, animationState.targetFace];
          } else if (animationState.direction === 'LEFT') {
            // Source moves LEFT, goes on left (top); target stays, goes on right (bottom)
            // Order from top to bottom: [source, target] → array: [target, source] → reversed: [source, target]
            currentCombined = [animationState.targetFace, animationState.sourceFace];
          } else { // RIGHT
            // Source moves RIGHT, goes on right (bottom); target stays, goes on left (top)
            // Order from top to bottom: [target, source] → array: [source, target] → reversed: [target, source]
            currentCombined = [animationState.sourceFace, animationState.targetFace];
          }
        } else {
          // For adding to existing combination
          // When Face 2 moves UP to Face 3 (which has Face 1), order should be: [2, 3, 1] from top to bottom
          // So in array (before reverse): [1, 3, 2] → after reverse: [2, 3, 1]
          // Target face (Face 3) should stay in middle position
          const targetFaceNum = animationState.targetFace;
          
          if (animationState.direction === 'UP') {
            // Source moves UP, goes on top; target stays in place (middle if already combined)
            // Order from top to bottom: [source, target, ...otherFaces]
            // So in array (before reverse): [...otherFaces, target, source] → after reverse: [source, target, ...otherFaces]
            const otherFaces = existingCombined.filter(f => f !== targetFaceNum);
            currentCombined = [...otherFaces, targetFaceNum, animationState.sourceFace];
          } else if (animationState.direction === 'DOWN') {
            // Source moves DOWN, goes on bottom; target stays in place
            // Order from top to bottom: [...otherFaces, target, source]
            // So in array (before reverse): [source, target, ...otherFaces] → after reverse: [...otherFaces, target, source]
            const otherFaces = existingCombined.filter(f => f !== targetFaceNum);
            currentCombined = [animationState.sourceFace, targetFaceNum, ...otherFaces];
          } else if (animationState.direction === 'LEFT') {
            // Source moves LEFT, goes on left (top); target stays in place
            // Order from top to bottom: [source, target, ...otherFaces]
            // So in array (before reverse): [...otherFaces, target, source] → after reverse: [source, target, ...otherFaces]
            const otherFaces = existingCombined.filter(f => f !== targetFaceNum);
            currentCombined = [...otherFaces, targetFaceNum, animationState.sourceFace];
          } else { // RIGHT
            // Source moves RIGHT, goes on right (bottom); target stays in place
            // Order from top to bottom: [...otherFaces, target, source]
            // So in array (before reverse): [source, target, ...otherFaces] → after reverse: [...otherFaces, target, source]
            const otherFaces = existingCombined.filter(f => f !== targetFaceNum);
            currentCombined = [animationState.sourceFace, targetFaceNum, ...otherFaces];
          }
        }
        // Reverse so first in array is at bottom (stays in place)
        currentCombined = currentCombined.reverse();
      }
      const numCombined = Math.max(2, currentCombined.length || 1);
      const segmentHeight = scaleY / numCombined;
      
      // For Face 4 (bottom face), ensure it stays centered at its original position
      const isFace4 = targetFaceIndex === 3;
      
      // Move up by 25% when 3 faces combine (0.25 units)
      // Also move more toward second face position when 3 faces combine
      // But for Face 4, adjust offsets to keep it centered
      let upOffset = numCombined === 3 ? 0.25 : 0;
      let face2Offset = numCombined === 3 ? 0.15 : 0;
      
      // For Face 4, adjust offsets to ensure bottom segment stays at original position
      if (isFace4) {
        if (numCombined === 2) {
          // For 2 faces, no offset needed - segments should be perfectly aligned
          upOffset = 0;
          face2Offset = 0;
        } else if (numCombined === 3) {
          // For 3 faces, adjust offset to keep Face 4 centered
          upOffset = 0.15;
          face2Offset = 0.15;
        }
      }
      
      segmentRefs.current.forEach((seg, idx) => {
        if (seg && idx < numCombined && currentCombined.length > 0) {
          // Position from top: each segment gets equal space, aligned at edges
          // Top segment starts at scaleY/2, bottom segment ends at -scaleY/2
          // currentCombined is reversed: [top, ..., bottom]
          // segments array is also reversed from combinedFaces
          // We position idx 0 at top, so we need to match currentCombined[idx] to segment at idx
          const segmentTop = scaleY * 0.5 - idx * segmentHeight;
          const segmentCenter = segmentTop - segmentHeight * 0.5 + upOffset + face2Offset;
          seg.scale.set(1, segmentHeight, 1);
          seg.position.set(0, segmentCenter, 0);
          
          // Update material color to match currentCombined order during animation
          // currentCombined is reversed: [top, ..., bottom] so idx 0 = top face
          // Use idx directly to match the material assignment
          if (seg.material instanceof THREE.MeshStandardMaterial && idx < currentCombined.length) {
            const faceNum = currentCombined[idx];
            const faceColor = FACE_COLORS[faceNum - 1];
            seg.material.color.set(faceColor);
          }
        }
      });
      
      labelGroupRef.current.position.set(0, 0, 0);
    } else if (faceState.unfolded) {
      // Face is in unfolded state
      const scaleY = faceState.combinedFaces.length;
      const forwardZ = 0.5;
      const targetPos = FACE_3D_POSITIONS[faceIndex];
      
      groupRef.current.position.set(...targetPos.pos as [number, number, number]);
      groupRef.current.position.z += forwardZ;
      groupRef.current.rotation.set(...targetPos.rot as [number, number, number]);
      meshRef.current.scale.set(1, scaleY, 1);
      
      // Update split meshes for combined faces - equal distribution with proper alignment
      if (faceState.combinedFaces.length > 1) {
        const numSegments = faceState.combinedFaces.length;
        const segmentHeight = scaleY / numSegments;
        
        // For Face 4 (bottom face), ensure it stays centered at its original position
        // Face 4 is at index 3, original position y = -0.5
        const isFace4 = faceIndex === 3;
        
        // Move up by 25% when 3 faces combine (0.25 units)
        // Also move more toward second face position when 3 faces combine
        // But for Face 4, we need to adjust offsets to keep it centered
        let upOffset = numSegments === 3 ? 0.25 : 0;
        let face2Offset = numSegments === 3 ? 0.25 : 0;
        
        // For Face 4, adjust offsets to ensure bottom segment stays at original position
        if (isFace4) {
          // When Face 4 combines, the bottom segment should stay at y = 0 relative to group center
          // The group is already positioned at Face 4's original position
          // So we need to ensure the bottom segment (last idx) is at the correct position
          // For 2 faces: bottom segment should be at -scaleY/2 = -1
          // For 3 faces: bottom segment should be at -scaleY/2 = -1.5
          // But we want Face 4 to appear centered, so we adjust the offset
          if (numSegments === 2) {
            // For 2 faces, no offset needed - segments should be perfectly aligned
            upOffset = 0;
            face2Offset = 0;
          } else if (numSegments === 3) {
            // For 3 faces, adjust offset to keep Face 4 centered
            // The bottom segment (Face 4) should be at the bottom of the combined face
            // We reduce the offset to keep it more centered
            upOffset = 0.15;
            face2Offset = 0.15;
          }
        }
        
        segmentRefs.current.forEach((seg, idx) => {
          if (seg && idx < numSegments) {
            // Position from top: each segment gets equal space, aligned at edges
            // Top segment starts at scaleY/2, bottom segment ends at -scaleY/2
            // Each segment is perfectly aligned with no gaps
            // segments array: segments[0] = top face, segments[last] = bottom face
            // combinedFaces = [bottom, top], reversed = [top, bottom] = segments order
            const segmentTop = scaleY * 0.5 - idx * segmentHeight;
            const segmentCenter = segmentTop - segmentHeight * 0.5 + upOffset + face2Offset;
            seg.scale.set(1, segmentHeight, 1);
            seg.position.set(0, segmentCenter, 0);
            
            // Ensure material color matches the correct face
            // segments[idx] already has the correct color for position idx
            // Materials are assigned directly from segments, so they should match
            if (seg.material instanceof THREE.MeshStandardMaterial && idx < segments.length) {
              const expectedColor = segments[idx].color;
              const currentColor = '#' + seg.material.color.getHexString();
              if (currentColor.toUpperCase() !== expectedColor.toUpperCase()) {
                seg.material.color.set(expectedColor);
              }
            }
          }
        });
      }
      
      labelGroupRef.current.position.set(0, 0, 0);
    } else {
      // Reset to original position
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
      meshRef.current.scale.set(1, 1, 1);
      
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.opacity = 0.7;
      }
      meshRef.current.visible = true;
      groupRef.current.visible = true;
      
      segmentRefs.current.forEach(seg => {
        if (seg) {
          seg.visible = false;
          seg.scale.set(1, 1, 1);
          seg.position.set(0, 0, 0);
        }
      });
      
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

  // Materials for each segment when combined
  const segmentMaterials = useMemo(() => {
    if (segments.length <= 0) return [];
    return segments.map(seg => 
      new THREE.MeshStandardMaterial({ 
        color: seg.color,
        transparent: true, 
        opacity: 0.7, 
        metalness: 0.1, 
        roughness: 0.3,
        side: THREE.DoubleSide
      })
    );
  }, [segments]);

  // Get label text
  const labelText = faceState.combinedFaces.length > 1 
    ? faceState.combinedFaces.join('×')
    : label;

  // Get formula text
  const formulaText = faceState.formula || "x²";

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={material}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Split meshes when combined - equal distribution */}
      {/* For 2 faces: combinedFaces = [3, 1], segments = [1, 3], segmentMaterials = [Pink, Light Blue] */}
      {/* Colors are swapped, so we need to reverse the material assignment */}
      {/* idx 0 (top) should get segmentMaterials[1] (Light Blue), idx 1 (bottom) should get segmentMaterials[0] (Pink) */}
      {/* Actually wait - if colors are swapped, we need: top = Pink, bottom = Light Blue */}
      {/* segments[0] = Face 1 (Pink), segments[1] = Face 3 (Light Blue) */}
      {/* So segmentMaterials[0] = Pink, segmentMaterials[1] = Light Blue */}
      {/* But user says it's swapped, so we need to swap the assignment */}
      {segmentMaterials.map((_mat, idx) => {
        // segmentMaterials are created from segments
        // segments[0] = Face 1 (Pink, top), segments[1] = Face 3 (Light Blue, bottom)
        // segmentMaterials[0] = Pink, segmentMaterials[1] = Light Blue
        // Use idx directly - materials should match segments
        const materialIdx = idx;
        return (
          <mesh 
            key={`segment-${idx}-${faceState.combinedFaces.join('-')}`}
            ref={(el) => {
              if (el) {
                segmentRefs.current[idx] = el;
              } else if (segmentRefs.current[idx]) {
                segmentRefs.current[idx] = null as unknown as THREE.Mesh;
              }
            }}
            material={segmentMaterials[materialIdx]} 
            visible={false}
          >
            <planeGeometry args={[1, 1]} />
          </mesh>
        );
      })}
      {/* Label in top-right corner */}
      <group ref={labelGroupRef}>
        <Text
          fontSize={0.2}
          color="#000000"
          fillOpacity={0.7}
          anchorX="right"
          anchorY="top"
          position={
            faceState.unfolded && faceState.combinedFaces.length > 1
              ? [0.4, 0.5 * faceState.combinedFaces.length - 0.1, 0.01]
              : [0.4, 0.4, 0.01]
          }
        >
          {labelText}
        </Text>
      </group>
      {/* Formula in center */}
      <group position={[0, 0, 0.01]}>
        <Text
          fontSize={0.4}
          color="#000000"
          fillOpacity={0.7}
          anchorX="center"
          anchorY="middle"
        >
          {formulaText}
        </Text>
      </group>
    </group>
  );
}

// Main 3D Cube component
function Cube3D({ 
  faceStates, 
  animationState 
}: { 
  faceStates: FaceState[];
  animationState: AnimationState | null;
}) {
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
          faceState={faceStates[index]}
          animationState={animationState}
          allFaceStates={faceStates}
        />
      ))}
    </group>
  );
}

// Face Adjacency UI Component
function FaceAdjacencyPanel({ 
  onDirectionClick,
  faceStates
}: { 
  onDirectionClick: (face: number, direction: string) => void;
  faceStates: FaceState[];
}) {
  return (
    <div className="absolute right-4 top-4 bottom-4 w-[420px] bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl border border-gray-200/50 p-5 flex flex-col">
      <div className="mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Cube Net Unfolding</h2>
        <p className="text-xs text-gray-500 text-center mt-1">Cube face relationships</p>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1">
        {FACE_ADJACENCY.map((faceData) => {
          const state = faceStates[faceData.face - 1];
          const isUnfolded = state.unfolded;
          const canUnfold = !isUnfolded; // Can only unfold if not already unfolded
          
          return (
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
                {isUnfolded && (
                  <div className="text-xs text-blue-600 font-semibold">
                    {state.formula}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onDirectionClick(faceData.face, 'UP')}
                  disabled={!canUnfold}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border shadow-sm hover:shadow-md transition-all ${
                    canUnfold 
                      ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200/50 hover:bg-blue-100 cursor-pointer' 
                      : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">UP</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">→</span>
                    <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.up}</span>
                  </div>
                </button>
                <button
                  onClick={() => onDirectionClick(faceData.face, 'DOWN')}
                  disabled={!canUnfold}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border shadow-sm hover:shadow-md transition-all ${
                    canUnfold 
                      ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200/50 hover:bg-gray-100 cursor-pointer' 
                      : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">DOWN</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">→</span>
                    <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.down}</span>
                  </div>
                </button>
                <button
                  onClick={() => onDirectionClick(faceData.face, 'LEFT')}
                  disabled={!canUnfold}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border shadow-sm hover:shadow-md transition-all ${
                    canUnfold 
                      ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200/50 hover:bg-gray-100 cursor-pointer' 
                      : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">LEFT</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">→</span>
                    <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.left}</span>
                  </div>
                </button>
                <button
                  onClick={() => onDirectionClick(faceData.face, 'RIGHT')}
                  disabled={!canUnfold}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border shadow-sm hover:shadow-md transition-all ${
                    canUnfold 
                      ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200/50 hover:bg-gray-100 cursor-pointer' 
                      : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">RIGHT</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">→</span>
                    <span className="text-base font-bold text-gray-800 w-6 text-center">{faceData.right}</span>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main page component
function CubeSolvingPage() {
  // Initialize face states
  const [faceStates, setFaceStates] = useState<FaceState[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      unfolded: false,
      animProgress: 0,
      gridX: 0,
      gridY: 0,
      attachedTo: null,
      direction: null,
      formula: "x²",
      combinedFaces: [i + 1]
    }))
  );

  const [animationState, setAnimationState] = useState<AnimationState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [history, setHistory] = useState<FaceState[]>([]);

  // Calculate formula for combined faces
  const calculateFormula = (combinedFaces: number[]): string => {
    if (combinedFaces.length === 1) return "x²";
    return `${combinedFaces.length}x²`;
  };

  const handleDirectionClick = (face: number, direction: string) => {
    const faceIndex = face - 1;
    const currentState = faceStates[faceIndex];
    
    // Can only unfold if not already unfolded
    if (currentState.unfolded || isAnimating) return;

    // Get target face from adjacency
    const adjacency = FACE_ADJACENCY.find(f => f.face === face);
    if (!adjacency) return;

    let targetFace: number;
    if (direction === 'UP') targetFace = adjacency.up;
    else if (direction === 'DOWN') targetFace = adjacency.down;
    else if (direction === 'LEFT') targetFace = adjacency.left;
    else targetFace = adjacency.right;

    const targetIndex = targetFace - 1;
    const targetState = faceStates[targetIndex];

    // Check if target is already unfolded (combined)
    if (targetState.unfolded) {
      // Combine with existing unfolded face
      setIsAnimating(true);
      setHistory([...faceStates.map(s => ({ ...s }))]);

      setAnimationState({
        sourceFace: face,
        targetFace: targetFace,
        direction: direction,
        progress: 0
      });

      // Animate
      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to({ progress: 0 }, {
        progress: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function() {
          const progress = this.targets()[0].progress;
          setAnimationState(prev => prev ? { ...prev, progress } : null);
          
          // Update anim progress for both faces
          setFaceStates(prev => prev.map((state, idx) => {
            if (idx === faceIndex) {
              return { ...state, animProgress: progress };
            } else if (idx === targetIndex) {
              return { ...state, animProgress: progress };
            }
            return state;
          }));
        },
        onComplete: () => {
          // Complete the combination
          setFaceStates(prev => prev.map((state, idx) => {
            if (idx === faceIndex) {
              // Hide source face
              return { ...state, unfolded: true, animProgress: 1, visible: false };
            } else if (idx === targetIndex) {
              // Update target face with combined info
              // When Face 2 moves UP to Face 3 (which has Face 1), order should be: [2, 3, 1] from top to bottom
              // So in array (before reverse): [1, 3, 2] → after reverse: [2, 3, 1]
              // Target face (Face 3) should stay in middle position
              const targetFaceNum = targetFace;
              const otherFaces = state.combinedFaces.filter(f => f !== targetFaceNum);
              
              let newCombined: number[];
              if (direction === 'UP') {
                // Moving UP: source face goes on top, target stays in place (middle)
                // Order from top to bottom: [source, target, ...otherFaces]
                // So in array (before reverse): [...otherFaces, target, source] → after reverse: [source, target, ...otherFaces]
                newCombined = [...otherFaces, targetFaceNum, face];
              } else if (direction === 'DOWN') {
                // Moving DOWN: source goes on bottom, target stays in place
                // Order from top to bottom: [...otherFaces, target, source]
                // So in array (before reverse): [source, target, ...otherFaces] → after reverse: [...otherFaces, target, source]
                newCombined = [face, targetFaceNum, ...otherFaces];
              } else if (direction === 'LEFT') {
                // Moving LEFT: source goes on left (top), target stays in place
                // Order from top to bottom: [source, target, ...otherFaces]
                // So in array (before reverse): [...otherFaces, target, source] → after reverse: [source, target, ...otherFaces]
                newCombined = [...otherFaces, targetFaceNum, face];
              } else { // RIGHT
                // Moving RIGHT: source goes on right (bottom), target stays in place
                // Order from top to bottom: [...otherFaces, target, source]
                // So in array (before reverse): [source, target, ...otherFaces] → after reverse: [...otherFaces, target, source]
                newCombined = [face, targetFaceNum, ...otherFaces];
              }
              return {
                ...state,
                unfolded: true,
                animProgress: 1,
                combinedFaces: newCombined,
                formula: calculateFormula(newCombined)
              };
            }
            return state;
          }));
          setAnimationState(null);
          setIsAnimating(false);
        }
      });
    } else {
      // First face to unfold - just mark it as unfolded
      setIsAnimating(true);
      setHistory([...faceStates.map(s => ({ ...s }))]);

      setAnimationState({
        sourceFace: face,
        targetFace: targetFace,
        direction: direction,
        progress: 0
      });

      if (animationRef.current) {
        animationRef.current.kill();
      }

      animationRef.current = gsap.to({ progress: 0 }, {
        progress: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function() {
          const progress = this.targets()[0].progress;
          setAnimationState(prev => prev ? { ...prev, progress } : null);
          
          setFaceStates(prev => prev.map((state, idx) => {
            if (idx === faceIndex) {
              return { ...state, animProgress: progress };
            } else if (idx === targetIndex) {
              return { ...state, animProgress: progress };
            }
            return state;
          }));
        },
        onComplete: () => {
          // Complete the combination
          setFaceStates(prev => prev.map((state, idx) => {
            if (idx === faceIndex) {
              return { ...state, unfolded: true, animProgress: 1, visible: false };
            } else if (idx === targetIndex) {
              // Preserve order based on direction for initial combination too
              // When source moves UP to target, source goes on top, target on bottom
              // When source moves DOWN to target, source goes on bottom, target on top
              let newCombined: number[];
              if (direction === 'UP') {
                // Moving UP: source face goes on top, target stays on bottom
                // Order from top to bottom: [source, target] → array: [target, source] → reversed: [source, target]
                newCombined = [targetFace, face];
              } else if (direction === 'DOWN') {
                // Moving DOWN: target stays on top, source goes on bottom
                // Order from top to bottom: [target, source] → array: [source, target] → reversed: [target, source]
                newCombined = [face, targetFace];
              } else if (direction === 'LEFT') {
                // Moving LEFT: source goes on left (top), target on right (bottom)
                // Order from top to bottom: [source, target] → array: [target, source] → reversed: [source, target]
                newCombined = [targetFace, face];
              } else { // RIGHT
                // Moving RIGHT: target stays on left (top), source goes on right (bottom)
                // Order from top to bottom: [target, source] → array: [source, target] → reversed: [target, source]
                newCombined = [face, targetFace];
              }
              return {
                ...state,
                unfolded: true,
                animProgress: 1,
                combinedFaces: newCombined,
                formula: calculateFormula(newCombined)
              };
            }
            return state;
          }));
          setAnimationState(null);
          setIsAnimating(false);
        }
      });
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      setIsAnimating(true);
      
      if (animationRef.current) {
        animationRef.current.kill();
      }

      // Reverse animation
      const currentProgress = faceStates.find(s => s.animProgress > 0)?.animProgress || 1;
      
      animationRef.current = gsap.to({ progress: currentProgress }, {
        progress: 0,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: function() {
          const progress = this.targets()[0].progress;
          
          setFaceStates(prev => prev.map(state => ({
            ...state,
            animProgress: progress
          })));
        },
        onComplete: () => {
          // Restore previous state
          if (history.length > 0) {
            setFaceStates(history);
            setHistory([]);
          }
          setAnimationState(null);
          setIsAnimating(false);
        }
      });
    }
  };

  const hasUnfoldedFaces = faceStates.some(s => s.unfolded);

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
          <Cube3D faceStates={faceStates} animationState={animationState} />
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
      {hasUnfoldedFaces && (
        <button
          onClick={handleUndo}
          disabled={isAnimating}
          className="absolute top-4 left-64 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md transition-all font-semibold disabled:cursor-not-allowed"
        >
          Undo
        </button>
      )}
      <FaceAdjacencyPanel onDirectionClick={handleDirectionClick} faceStates={faceStates} />
    </div>
  );
}

export default CubeSolvingPage;
