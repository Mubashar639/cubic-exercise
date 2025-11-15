// CubeNetExerciseFinal.jsx
// Full single-file interactive cube-net exercise (Option A behavior)
// - Open any face in any direction from the start
// - Pivot face auto-attaches if missing
// - Buttons colored by face, disabled only on real overlap
// - Undo + Reset
// - Slight transparency, labels on faces
// - Detects which of the 11 canonical nets when complete

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Text } from "@react-three/drei";
import * as THREE from "three";

/* ---------- CONFIG ---------- */
const FACE_SIZE = 1;
const GRID_STEP = 1.15;
const FACE_COLORS = ["#FFB3BA", "#FFD4A3", "#B0E0E6", "#90EE90", "#FFFACD", "#CD853F"];

// 3D base face transforms: index order 0..5
const FACE_3D = [
  { pos: [0, 0, 0.5], rot: [0, 0, 0] },           // 0 front
  { pos: [0, 0, -0.5], rot: [0, Math.PI, 0] },    // 1 back
  { pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] },// 2 top
  { pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] },// 3 bottom
  { pos: [0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },// 4 right
  { pos: [-0.5, 0, 0], rot: [0, Math.PI / 2, 0] } // 5 left
];

// Real cube adjacency map (face -> direction -> adjacent face)
const ADJ = {
  0: { UP: 2, DOWN: 3, LEFT: 5, RIGHT: 4 },
  1: { UP: 2, DOWN: 3, LEFT: 4, RIGHT: 5 },
  2: { UP: 1, DOWN: 0, LEFT: 5, RIGHT: 4 },
  3: { UP: 0, DOWN: 1, LEFT: 4, RIGHT: 5 },
  4: { UP: 2, DOWN: 3, LEFT: 0, RIGHT: 1 },
  5: { UP: 2, DOWN: 3, LEFT: 1, RIGHT: 0 },
};

// Direction vectors for grid movement
const DIR_VEC = {
  UP: new THREE.Vector3(0, 1, 0),
  DOWN: new THREE.Vector3(0, -1, 0),
  LEFT: new THREE.Vector3(-1, 0, 0),
  RIGHT: new THREE.Vector3(1, 0, 0),
};

// canonical 11 nets (used for detection)
const CANONICAL_NETS = [
  [{ x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 }, { x: 1, y: 0, face: 3 }, { x: 0, y: 1, face: 4 }, { x: 0, y: 2, face: 5 }],
  [{ x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 }, { x: 1, y: 0, face: 3 }, { x: 2, y: 0, face: 4 }, { x: 0, y: 1, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 }, { x: 0, y: 1, face: 3 }, { x: 0, y: 2, face: 4 }, { x: 1, y: 2, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 0, y: 1, face: 2 }, { x: 0, y: 2, face: 3 }, { x: 1, y: 2, face: 4 }, { x: 2, y: 2, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 }, { x: 2, y: 1, face: 3 }, { x: 2, y: 2, face: 4 }, { x: 3, y: 2, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 }, { x: 2, y: 1, face: 3 }, { x: 1, y: 1, face: 4 }, { x: 0, y: 1, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 2, y: 0, face: 2 }, { x: 3, y: 0, face: 3 }, { x: 1, y: 1, face: 4 }, { x: 1, y: -1, face: 5 }],
  [{ x: 0, y: -1, face: 0 }, { x: -1, y: 0, face: 1 }, { x: 0, y: 0, face: 2 }, { x: 1, y: 0, face: 3 }, { x: 0, y: 1, face: 4 }, { x: 1, y: 1, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 0, y: 1, face: 2 }, { x: 1, y: 1, face: 3 }, { x: 0, y: 2, face: 4 }, { x: -1, y: 1, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 }, { x: 1, y: 2, face: 3 }, { x: 2, y: 2, face: 4 }, { x: 2, y: 1, face: 5 }],
  [{ x: 0, y: 0, face: 0 }, { x: 1, y: 0, face: 1 }, { x: 1, y: 1, face: 2 }, { x: 0, y: 1, face: 3 }, { x: -1, y: 1, face: 4 }, { x: -1, y: 0, face: 5 }],
];

/* ---------- UTIL ---------- */
function cloneAttachments(map) {
  return new Map(Array.from(map.entries()).map(([k, v]) => [k, v ? { ...v } : v]));
}

function buildAdjacencyFromLayout(layout) {
  const minX = Math.min(...layout.map(s => s.x));
  const minY = Math.min(...layout.map(s => s.y));
  const adj = new Map();
  layout.forEach(s => adj.set(s.face, new Set()));
  for (const s of layout) {
    for (const t of layout) {
      if (s.face === t.face) continue;
      const dx = Math.abs((s.x - minX) - (t.x - minX));
      const dy = Math.abs((s.y - minY) - (t.y - minY));
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) adj.get(s.face).add(t.face);
    }
  }
  return adj;
}

function adjacencyMapsEqual(a, b) {
  for (let i = 0; i < 6; i++) {
    const sa = a.get(i) || new Set();
    const sb = b.get(i) || new Set();
    if (sa.size !== sb.size) return false;
    for (const v of sa) if (!sb.has(v)) return false;
  }
  return true;
}

/* ---------- R3F Face component ---------- */
function FaceMesh({ index, state, attachments }: { index: number; state: any; attachments: any }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const base = FACE_3D[index];
    const { unfolded, hingeDir, anim, gridX, gridY } = state;

    if (!unfolded) {
      ref.current.position.set(...base.pos);
      ref.current.rotation.set(...base.rot);
      return;
    }

    // Get pivot face info
    const attachInfo = attachments.get(index);
    if (!attachInfo || attachInfo.parent === -1) {
      // Root face - just position in grid, flat (0 angle)
      const p2 = new THREE.Vector3((gridX || 0) * GRID_STEP, -(gridY || 0) * GRID_STEP, 0);
      ref.current.position.copy(p2);
      // All root faces should be flat on Z=0 plane (0 angle) - always enforce this
      ref.current.rotation.set(0, 0, 0);
      ref.current.quaternion.set(0, 0, 0, 1); // Also set quaternion to identity to ensure flat
      return;
    }

    const pivotIndex = attachInfo.parent;
    const pivotBase = FACE_3D[pivotIndex];
    
    // Calculate pivot face position in grid (for reference, not used in rotation calc)
    // const pivotGridPos = new THREE.Vector3(
    //   (pivotAttach?.gridX || 0) * GRID_STEP,
    //   -((pivotAttach?.gridY || 0) * GRID_STEP),
    //   0
    // );

    // Calculate current face 3D position and normal
    const face3DPos = new THREE.Vector3(...base.pos);
    const pivot3DPos = new THREE.Vector3(...pivotBase.pos);
    const faceNormal = new THREE.Vector3(...base.pos).normalize();
    const pivotNormal = new THREE.Vector3(...pivotBase.pos).normalize();

    // Calculate edge direction (the hinge axis) - along the shared edge
    // This is the cross product of the two face normals
    let rotationAxis = new THREE.Vector3().crossVectors(faceNormal, pivotNormal);
    // If cross product is zero (shouldn't happen for adjacent faces), use a fallback
    if (rotationAxis.length() < 0.001 && hingeDir) {
      // Fallback: use direction based on the unfold direction
      const dirVec = DIR_VEC[hingeDir];
      if (dirVec) {
        rotationAxis = new THREE.Vector3(dirVec.x, dirVec.y, dirVec.z);
      }
    }
    if (rotationAxis.length() < 0.001) {
      // Ultimate fallback: use Y axis
      rotationAxis = new THREE.Vector3(0, 1, 0);
    }
    rotationAxis.normalize();

    // Calculate edge center in 3D (midpoint between face centers)
    const edgeCenter3D = face3DPos.clone().add(pivot3DPos).multiplyScalar(0.5);
    
    // Vector from edge center to face center (this will be rotated)
    const toFaceCenter = face3DPos.clone().sub(edgeCenter3D);

    // Smooth animation: rotation and translation happen together
    // Rotation completes at 0.7, translation starts earlier for smoother motion
    const rotationPhase = Math.min(anim / 0.7, 1); // 0-0.7: rotation
    const translationPhase = Math.min(anim / 1.0, 1); // 0-1: translation (starts immediately)

    // Calculate rotation angle (90 degrees)
    const rotationAngle = rotationPhase * (Math.PI / 2);

    // Determine rotation direction: should unfold outward
    // Test both directions and choose the one that moves away from cube center
    const testAngle = Math.PI / 6;
    const testRot1 = toFaceCenter.clone().applyAxisAngle(rotationAxis, testAngle);
    const testRot2 = toFaceCenter.clone().applyAxisAngle(rotationAxis, -testAngle);
    const testPos1 = edgeCenter3D.clone().add(testRot1);
    const testPos2 = edgeCenter3D.clone().add(testRot2);
    const rotationSign = testPos1.length() > testPos2.length() ? 1 : -1;

    // Apply rotation around edge
    const rotatedOffset = toFaceCenter.clone().applyAxisAngle(
      rotationAxis,
      rotationSign * rotationAngle
    );
    const rotated3DPos = edgeCenter3D.clone().add(rotatedOffset);

    // Calculate final position - connect edge to edge with pivot face (no gap)
    // Get pivot face's grid position
    const pivotAttach = attachments.get(pivotIndex);
    const pivotGridX = pivotAttach?.gridX || 0;
    const pivotGridY = pivotAttach?.gridY || 0;
    const pivotGridPos = new THREE.Vector3(
      pivotGridX * GRID_STEP,
      -(pivotGridY * GRID_STEP),
      0
    );
    
    // Calculate Face 4's edge position (where it connects to Face 1)
    // Face 4's edge is exactly FACE_SIZE/2 from its center in the direction of Face 1
    let face4EdgeDirection = new THREE.Vector3(0, 0, 0);
    if (hingeDir === "UP") {
      face4EdgeDirection = new THREE.Vector3(0, 1, 0);
    } else if (hingeDir === "DOWN") {
      face4EdgeDirection = new THREE.Vector3(0, -1, 0);
    } else if (hingeDir === "LEFT") {
      face4EdgeDirection = new THREE.Vector3(-1, 0, 0);
    } else if (hingeDir === "RIGHT") {
      face4EdgeDirection = new THREE.Vector3(1, 0, 0);
    }
    
    // The shared edge is at Face 4's center + FACE_SIZE/2 in the direction
    const sharedEdgePos = pivotGridPos.clone().add(face4EdgeDirection.clone().multiplyScalar(FACE_SIZE * 0.5));
    
    // Face 1 rotates around this shared edge
    // When Face 1 is at 90 degrees, its center is FACE_SIZE/2 away from the edge
    // In the direction perpendicular to the edge (away from Face 4)
    // And FACE_SIZE/2 in Z direction (since it's rotated upward)
    const face1CenterFromEdge = face4EdgeDirection.clone().multiplyScalar(FACE_SIZE * 0.5);
    
    // Z offset: when at 90 degrees, Face 1's center is FACE_SIZE/2 above the edge
    const zOffset = rotationPhase * FACE_SIZE * 0.5;
    
    // Final position: shared edge + offset to Face 1's center
    const finalGridPos = sharedEdgePos.clone().add(face1CenterFromEdge);
    finalGridPos.z = zOffset;

    // Interpolate position: from rotated 3D to final calculated position
    // When rotation is complete, use the exact calculated position to ensure edge-to-edge connection
    const easedTranslation = translationPhase < 0.5 
      ? 2 * translationPhase * translationPhase 
      : 1 - Math.pow(-2 * translationPhase + 2, 2) / 2;
    
    // When rotation is complete, ensure exact edge-to-edge connection
    // Use the calculated final position which accounts for exact FACE_SIZE spacing
    if (rotationPhase >= 0.9 || anim >= 0.95) {
      // Use the exact calculated position to ensure edges connect perfectly
      ref.current.position.copy(finalGridPos);
    } else {
      // During animation, interpolate smoothly from 3D rotation to final position
      const currentPos = rotated3DPos.clone().lerp(finalGridPos, easedTranslation);
      ref.current.position.copy(currentPos);
    }

    // Apply rotation to face orientation
    // When unfolded, face rotates 90 degrees around the edge and stays at that angle
    if (unfolded) {
      // Apply base rotation + hinge rotation (90 degrees)
      const baseEuler = new THREE.Euler(...base.rot);
      const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler);
      const hingeQuat = new THREE.Quaternion().setFromAxisAngle(
        rotationAxis,
        rotationSign * rotationAngle
      );
      
      // Combine base rotation with hinge rotation - this gives us the 90-degree rotated position
      const finalQuat = baseQuat.clone().multiply(hingeQuat);
      ref.current.quaternion.copy(finalQuat);
    } else {
      // Not unfolded - use base 3D rotation
      const baseEuler = new THREE.Euler(...base.rot);
      ref.current.rotation.setFromEuler(baseEuler);
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[FACE_SIZE * 0.98, FACE_SIZE * 0.98, 0.02]} />
        <meshStandardMaterial color={FACE_COLORS[index]} transparent opacity={0.45} metalness={0.05} roughness={0.7} />
      </mesh>
      <Text position={[0, 0, 0.03]} fontSize={0.32} color="#222">{index + 1}</Text>
    </group>
  );
}

/* ---------- Combined Face Component (for joined faces) ---------- */
function CombinedFaceMesh({ 
  face1Index, 
  face2Index, 
  state1, 
  state2, 
  attachments,
  hingeDir 
}: { 
  face1Index: number; 
  face2Index: number; 
  state1: any; 
  state2: any; 
  attachments: any;
  hingeDir: string;
}) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!ref.current) return;
    
    // Get pivot face (face1Index) position
    const pivotAttach = attachments.get(face1Index);
    const pivotGridX = pivotAttach?.gridX || 0;
    const pivotGridY = pivotAttach?.gridY || 0;
    const pivotGridPos = new THREE.Vector3(
      pivotGridX * GRID_STEP,
      -(pivotGridY * GRID_STEP),
      0
    );
    
    // Calculate direction for the combined face (how face2 extends from face1)
    let direction = new THREE.Vector3(0, 0, 0);
    if (hingeDir === "UP") {
      direction = new THREE.Vector3(0, 1, 0);
    } else if (hingeDir === "DOWN") {
      direction = new THREE.Vector3(0, -1, 0);
    } else if (hingeDir === "LEFT") {
      direction = new THREE.Vector3(-1, 0, 0);
    } else if (hingeDir === "RIGHT") {
      direction = new THREE.Vector3(1, 0, 0);
    }
    
    // Position combined face so Face 4 (face1Index) stays at exactly the same position
    // Combined face center = Face 4 center - half FACE_SIZE in the direction
    // This ensures Face 4's half of the combined face is at Face 4's original position
    const combinedCenter = pivotGridPos.clone().sub(direction.clone().multiplyScalar(FACE_SIZE * 0.5));
    
    // Position the combined face
    ref.current.position.copy(combinedCenter);
    ref.current.rotation.set(0, 0, 0); // Flat
    ref.current.quaternion.set(0, 0, 0, 1);
  });
  
  // Blend colors for the combined face
  const color1 = FACE_COLORS[face1Index];
  
  // Determine width and height based on hinge direction
  let width, height;
  if (hingeDir === "UP" || hingeDir === "DOWN") {
    // Vertical connection - double height
    width = FACE_SIZE * 0.98;
    height = FACE_SIZE * 1.96;
  } else {
    // Horizontal connection - double width
    width = FACE_SIZE * 1.96;
    height = FACE_SIZE * 0.98;
  }
  
  // Label positions based on direction
  // Face 4 (face1Index) label should be at Face 4's original position (offset from combined center)
  // Face 1 (face2Index) label should be at Face 1's position (offset from combined center)
  let label1Pos, label2Pos;
  if (hingeDir === "UP" || hingeDir === "DOWN") {
    // Face 4 is at -FACE_SIZE/2 from center, Face 1 is at +FACE_SIZE/2 from center
    label1Pos = new THREE.Vector3(0, -FACE_SIZE * 0.5, 0.03);
    label2Pos = new THREE.Vector3(0, FACE_SIZE * 0.5, 0.03);
  } else {
    // Face 4 is at -FACE_SIZE/2 from center, Face 1 is at +FACE_SIZE/2 from center
    label1Pos = new THREE.Vector3(-FACE_SIZE * 0.5, 0, 0.03);
    label2Pos = new THREE.Vector3(FACE_SIZE * 0.5, 0, 0.03);
  }
  
  return (
    <group ref={ref}>
      {/* Double width/height face - 2x FACE_SIZE in connection direction */}
      <mesh>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial 
          color={color1} 
          transparent 
          opacity={0.4} 
          metalness={0.05} 
          roughness={0.7} 
        />
      </mesh>
      {/* Show both labels - 50% each */}
      <Text position={label1Pos} fontSize={0.32} color="#222">
        {face1Index + 1}
      </Text>
      <Text position={label2Pos} fontSize={0.32} color="#222">
        {face2Index + 1}
      </Text>
    </group>
  );
}

/* ---------- MAIN COMPONENT ---------- */
export default function CubeNetExerciseFinal() {
  // face state: unfolded bool, hingeDir string, anim 0..1, grid coords
  const [faceStates, setFaceStates] = useState(() =>
    Array.from({ length: 6 }, () => ({ unfolded: false, hingeDir: null, anim: 0, gridX: 0, gridY: 0 }))
  );

  // attachments: map face -> { parent, dir, gridX, gridY }
  // start with empty attachments (Option A will attach pivot when needed)
  const [attachments, setAttachments] = useState(() => new Map());
  const [history, setHistory] = useState([]); // undo stack
  const [discovered, setDiscovered] = useState(new Set());
  const [detectedNet, setDetectedNet] = useState(null);
  const [warning, setWarning] = useState(null);

  // animation tick - smoother animation
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setFaceStates(prev => prev.map(s => {
        const target = s.unfolded ? 1 : 0;
        const diff = target - s.anim;
        if (Math.abs(diff) < 0.001) {
          // Snap to target when very close to avoid floating point issues
          // Ensure unfolded faces reach exactly 1.0 for proper flattening
          return { ...s, anim: s.unfolded ? 1.0 : 0 };
        }
        // Faster animation for smoother motion
        return { ...s, anim: s.anim + diff * 0.18 };
      }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // fast occupancy lookup
  const gridOccupancy = useMemo(() => {
    const occ = new Map();
    attachments.forEach((v, face) => {
      if (v && typeof v.gridX === "number" && typeof v.gridY === "number") {
        occ.set(`${v.gridX},${v.gridY}`, Number(face));
      }
    });
    return occ;
  }, [attachments]);

  // compute target grid cell for face->dir, pivot = adjacent face
  function computeTarget(faceIndex, dir) {
    const pivot = ADJ[faceIndex][dir];
    // if pivot not attached yet, Option A: attach pivot at a sensible spot.
    // Strategy:
    // - If attachments is empty => place pivot at (0,0)
    // - Else if pivot already attached => use its coords
    // - Else place pivot near existing structure (we choose grid 0,0 if available otherwise find free neighbor of root)
    let pivotAttach = attachments.get(pivot);
    if (!pivotAttach) {
      // find a root coordinate candidate
      if (attachments.size === 0) {
        pivotAttach = { parent: -1, dir: "CENTER", gridX: 0, gridY: 0 };
      } else {
        // try to find some existing face to anchor pivot near (use first entry)
        const any = attachments.entries().next();
        if (!any.done) {
          const [anyFace, anyV] = any.value;
          pivotAttach = { parent: -1, dir: "CENTER", gridX: anyV.gridX + 0, gridY: anyV.gridY + 0 };
        } else {
          pivotAttach = { parent: -1, dir: "CENTER", gridX: 0, gridY: 0 };
        }
      }
    }

    const gx = pivotAttach.gridX;
    const gy = pivotAttach.gridY;
    if (dir === "UP") return { x: gx, y: gy - 1, pivot };
    if (dir === "DOWN") return { x: gx, y: gy + 1, pivot };
    if (dir === "LEFT") return { x: gx - 1, y: gy, pivot };
    if (dir === "RIGHT") return { x: gx + 1, y: gy, pivot };
    return null;
  }

  // is move disabled? only when target occupied by another face (not self) OR fold would be blocked by children
  function isMoveDisabled(faceIndex, dir) {
    const fs = faceStates[faceIndex];
    // cannot change hinge direction if already unfolded (must fold first)
    if (fs.unfolded && fs.hingeDir && fs.hingeDir !== dir) return true;

    const tgt = computeTarget(faceIndex, dir);
    if (!tgt) return true; // shouldn't happen, but be safe

    const occ = gridOccupancy.get(`${tgt.x},${tgt.y}`);
    if (occ !== undefined && occ !== faceIndex) return true;

    // folding/back: if face has children attached -> locked
    if (fs.unfolded) {
      for (const [f, v] of attachments.entries()) {
        if (v.parent === faceIndex) return true;
      }
    }

    return false;
  }

  // toggle unfold/fold
  function handleToggle(faceIndex, dir) {
    if (isMoveDisabled(faceIndex, dir)) return;

    setHistory(prev => [...prev, { faceStates: JSON.parse(JSON.stringify(faceStates)), attachments: cloneAttachments(attachments) }]);
    setWarning(null);

    const tgt = computeTarget(faceIndex, dir);
    if (!tgt) {
      setWarning("Cannot compute target grid.");
      return;
    }

    // Calculate pivot position first
    let pivotGridX, pivotGridY;
    const existingPivot = attachments.get(tgt.pivot);
    if (!existingPivot) {
      // Pivot not attached yet - calculate where to place it
      if (attachments.size === 0) {
        // First face - place pivot at (0, 0)
        pivotGridX = 0;
        pivotGridY = 0;
      } else {
        // Find a good spot for pivot - use first existing face's position as reference
        const firstEntry = attachments.entries().next();
        if (!firstEntry.done) {
          const [, firstV] = firstEntry.value;
          pivotGridX = firstV.gridX;
          pivotGridY = firstV.gridY;
        } else {
          pivotGridX = 0;
          pivotGridY = 0;
        }
      }
      // Check if pivot position is occupied, if so find a free spot
      if (gridOccupancy.has(`${pivotGridX},${pivotGridY}`)) {
        const tries = [[pivotGridX+1,pivotGridY],[pivotGridX-1,pivotGridY],[pivotGridX,pivotGridY+1],[pivotGridX,pivotGridY-1],[0,0]];
        for (const [nx, ny] of tries) {
          if (!gridOccupancy.has(`${nx},${ny}`)) { 
            pivotGridX = nx; 
            pivotGridY = ny; 
            break; 
          }
        }
      }
    } else {
      // Pivot already attached - use its coordinates
      pivotGridX = existingPivot.gridX;
      pivotGridY = existingPivot.gridY;
    }
    
    // Calculate final face position based on actual pivot position
    let finalFaceGridX, finalFaceGridY;
    if (dir === "UP") {
      finalFaceGridX = pivotGridX;
      finalFaceGridY = pivotGridY - 1;
    } else if (dir === "DOWN") {
      finalFaceGridX = pivotGridX;
      finalFaceGridY = pivotGridY + 1;
    } else if (dir === "LEFT") {
      finalFaceGridX = pivotGridX - 1;
      finalFaceGridY = pivotGridY;
    } else if (dir === "RIGHT") {
      finalFaceGridX = pivotGridX + 1;
      finalFaceGridY = pivotGridY;
    } else {
      finalFaceGridX = pivotGridX;
      finalFaceGridY = pivotGridY;
    }

    // Check if pivot needs to be unfolded
    const pivotNeedsUnfolding = !attachments.has(tgt.pivot);
    
    // ensure pivot exists in attachments (Option A)
    setAttachments(prev => {
      const copy = cloneAttachments(prev);
      
      if (!copy.has(tgt.pivot)) {
        // Place pivot at calculated position
        copy.set(tgt.pivot, { parent: -1, dir: "CENTER", gridX: pivotGridX, gridY: pivotGridY });
      }
      
      // then set face if unfolding
      const wasUnfolded = faceStates[faceIndex].unfolded;
      if (!wasUnfolded) {
        // place face adjacent to pivot using the calculated position
        copy.set(faceIndex, { parent: tgt.pivot, dir, gridX: finalFaceGridX, gridY: finalFaceGridY });
      } else {
        // folding: remove face and its descendants
        copy.delete(faceIndex);
        for (const [f, v] of Array.from(copy.entries())) if (v.parent === faceIndex) copy.delete(f);
      }
      return copy;
    });

    // update faceStates toggling - also mark pivot as unfolded if needed
    setFaceStates(prev => prev.map((s, i) => {
      // Mark pivot as unfolded if it was just placed
      if (pivotNeedsUnfolding && i === tgt.pivot && !s.unfolded) {
        return { ...s, unfolded: true, hingeDir: null, anim: 1, gridX: pivotGridX, gridY: pivotGridY };
      }
      // Update the face being toggled
      if (i !== faceIndex) return s;
      if (!s.unfolded) {
        return { ...s, unfolded: true, hingeDir: dir, anim: 0, gridX: finalFaceGridX, gridY: finalFaceGridY };
      } else {
        return { ...s, unfolded: false, hingeDir: null, anim: 1, gridX: 0, gridY: 0 };
      }
    }));
  }

  // undo
  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(prev => prev.slice(0, prev.length - 1));
    setFaceStates(last.faceStates);
    setAttachments(cloneAttachments(last.attachments));
    setWarning(null);
  }

  // reset
  function resetAll() {
    setFaceStates(Array.from({ length: 6 }, () => ({ unfolded: false, hingeDir: null, anim: 0, gridX: 0, gridY: 0 })));
    setAttachments(new Map());
    setHistory([]);
    setDetectedNet(null);
    setWarning(null);
    setDiscovered(new Set());
  }

  // detect net when all 6 unfolded
  useEffect(() => {
    const opened = faceStates.filter(f => f.unfolded).length;
    if (opened !== 6) {
      setDetectedNet(null);
      return;
    }

    // build layout for faces that have grid coords
    const layout = [];
    attachments.forEach((v, face) => {
      if (v && typeof v.gridX === "number" && typeof v.gridY === "number") {
        layout.push({ x: v.gridX, y: v.gridY, face: Number(face) });
      }
    });

    // must have 6 positions to compare
    if (layout.length < 6) return;

    const currentAdj = buildAdjacencyFromLayout(layout);
    let matched = null;
    for (let i = 0; i < CANONICAL_NETS.length; i++) {
      const netAdj = buildAdjacencyFromLayout(CANONICAL_NETS[i]);
      if (adjacencyMapsEqual(currentAdj, netAdj)) { matched = i; break; }
    }
    if (matched !== null) {
      setDetectedNet(matched);
      setDiscovered(prev => new Set(prev).add(matched));
    } else {
      setDetectedNet(null);
      setWarning("All faces opened but arrangement does not match any of the 11 canonical nets.");
    }
  }, [attachments, faceStates]);

  /* ---------- Render UI ---------- */
  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="border border-gray-300 rounded-lg overflow-hidden" style={{ width: 820, height: 560 }}>
              <Canvas camera={{ position: [0, 0, 6], fov: 50 }} onCreated={({ gl }) => gl.setClearColor("#ffffff")}>
                <PerspectiveCamera makeDefault position={[0, 0, 6]} />
                <OrbitControls enablePan={false} minDistance={3} maxDistance={12} />
                <ambientLight intensity={0.95} />
                <directionalLight position={[5, 5, 5]} intensity={0.6} />
                {(() => {
                  // Track which faces are rendered as combined to avoid duplicates
                  const renderedCombined = new Set<number>();
                  
                  return faceStates.map((s, i) => {
                    // Check if this face is part of a combined face (child of another face)
                    const attachInfo = attachments.get(i);
                    const isChild = attachInfo && attachInfo.parent !== -1;
                    const parentIndex = attachInfo?.parent;
                    
                    // If this is a child face that's unfolded, render as combined face with parent
                    // Combine immediately when unfolded (don't wait for animation to complete)
                    if (isChild && s.unfolded && parentIndex !== undefined && !renderedCombined.has(parentIndex)) {
                      const parentState = faceStates[parentIndex];
                      if (parentState && parentState.unfolded) {
                        // Mark both faces as rendered
                        renderedCombined.add(parentIndex);
                        renderedCombined.add(i);
                        
                        // Render combined face
                        return (
                          <CombinedFaceMesh
                            key={`combined-${parentIndex}-${i}`}
                            face1Index={parentIndex}
                            face2Index={i}
                            state1={parentState}
                            state2={s}
                            attachments={attachments}
                            hingeDir={s.hingeDir || "RIGHT"}
                          />
                        );
                      }
                    }
                    
                    // If this face is already part of a combined face, skip individual rendering
                    if (renderedCombined.has(i)) {
                      return null;
                    }
                    
                    // Render individual face
                    return (
                      <FaceMesh 
                        key={i} 
                        index={i} 
                        state={{ ...s, gridX: attachments.get(i)?.gridX ?? 0, gridY: attachments.get(i)?.gridY ?? 0 }}
                        attachments={attachments}
                      />
                    );
                  });
                })()}
              </Canvas>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-4">
            <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4 w-full max-w-md">
              <h3 className="text-lg font-bold text-indigo-900 mb-2">Cube Net Exercise</h3>
              <p className="text-sm text-indigo-700 mb-2">Open any face in any direction. Pivot faces are attached automatically (Option A).</p>
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-semibold text-indigo-700">Nets discovered</div>
                <div className="text-lg font-bold text-indigo-900">{discovered.size} / 11</div>
              </div>
              {detectedNet !== null ? (
                <div className="bg-green-50 border-l-4 border-green-400 text-green-800 p-2 rounded">🎉 You made Net {detectedNet + 1}!</div>
              ) : (
                <div className="text-sm text-indigo-700">Current net: not detected</div>
              )}
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 w-full max-w-md">
              <div className="flex gap-2 mb-3">
                <button onClick={undo} className="px-3 py-2 rounded-md bg-yellow-400 text-white font-semibold">Undo</button>
                <button onClick={resetAll} className="px-3 py-2 rounded-md bg-red-500 text-white font-semibold">Reset</button>
              </div>

              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const disabled = {
                    UP: isMoveDisabled(i, "UP"),
                    DOWN: isMoveDisabled(i, "DOWN"),
                    LEFT: isMoveDisabled(i, "LEFT"),
                    RIGHT: isMoveDisabled(i, "RIGHT"),
                  };
                  const color = FACE_COLORS[i];
                  const attachInfo = attachments.get(i);
                  return (
                    <div key={i} className="p-2 rounded-lg border bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Face {i + 1}</div>
                        <div className="text-sm text-gray-500">Attached to: {attachInfo ? (attachInfo.parent === -1 ? "root" : attachInfo.parent + 1) : "-"}</div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {(["UP", "DOWN", "LEFT", "RIGHT"]).map(dir => (
                          <button
                            key={dir}
                            onClick={() => handleToggle(i, dir)}
                            disabled={disabled[dir]}
                            style={{ 
                              backgroundColor: disabled[dir] ? "#e5e7eb" : color,
                              opacity: 1
                            }}
                            className={`px-3 py-1 rounded-full font-semibold ${disabled[dir] ? "text-gray-500" : "text-white"}`}
                          >
                            {dir} → {ADJ[i][dir] + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {warning && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 w-full max-w-md">
                <p className="text-yellow-800 font-semibold text-center">{warning}</p>
              </div>
            )}

            <div className="bg-white border-2 rounded-lg p-4 w-full max-w-md">
              <h4 className="font-semibold mb-2">Surface area</h4>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-md bg-white shadow flex items-center justify-center">
                  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(8,8)">
                      <rect x="24" y="6" width="24" height="24" fill="#B0E0E6" stroke="#999" />
                      <rect x="6" y="18" width="24" height="24" fill="#FFB3BA" stroke="#999" />
                      <rect x="24" y="30" width="24" height="24" fill="#CD853F" stroke="#999" />
                    </g>
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-600">One face area</div>
                  <div className="text-xl font-bold">a²</div>
                  <div className="text-sm text-gray-600 mt-1">Total surface area</div>
                  <div className="text-xl font-bold text-indigo-700">6 × a²</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}