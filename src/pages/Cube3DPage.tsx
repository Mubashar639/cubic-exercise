import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

// Face colors for the cube - same as CubeSolvingPage
const FACE_COLORS = [
  '#FFB3BA', // Pink - Front (Face 1)
  '#FFD4A3', // Peach - Back (Face 2)
  '#B0E0E6', // Light Blue - Top (Face 3)
  '#90EE90', // Light Green - Bottom (Face 4)
  '#FFFACD', // Lemon Chiffon - Right (Face 5)
  '#CD853F', // Peru - Left (Face 6)
];

type Mode = 'interaction' | 'net-building';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const FACE_LABELS = ['Front', 'Back', 'Top', 'Bottom', 'Right', 'Left'];

// Educational tips for cube nets and area calculations
const CUBE_NET_TIPS = [
  {
    title: "Understanding Cube Nets",
    content: "A cube net is a 2D arrangement of 6 squares that can be folded to form a cube. There are exactly 11 unique ways to arrange these squares, and each one represents a valid cube net. When you complete a net, you're discovering one of these mathematical patterns!"
  },
  {
    title: "Area Formula for a Cube",
    content: "The surface area of a cube is the sum of all 6 faces. If each face has area x², then: Area = x² + x² + x² + x² + x² + x² = 6x². This formula shows that the total surface area is 6 times the area of one face."
  },
  {
    title: "Why 11 Unique Nets?",
    content: "Mathematically, there are exactly 11 distinct cube nets. This means no matter how you arrange the 6 squares, you'll always end up with one of these 11 patterns. Some arrangements look different but are actually the same when rotated or reflected."
  },
  {
    title: "Valid vs Invalid Nets",
    content: "A valid net must: (1) Have all 6 faces connected edge-to-edge, (2) Not have opposite faces adjacent (they would overlap when folded), and (3) Form a single connected shape. Invalid nets cannot be folded into a cube without overlapping."
  },
  {
    title: "Real-World Applications",
    content: "Understanding cube nets helps in packaging design, architecture, and 3D modeling. Engineers use this knowledge to design boxes, containers, and structures that can be manufactured from flat materials and then folded into 3D shapes."
  },
  {
    title: "Visualizing 3D from 2D",
    content: "Building cube nets develops spatial reasoning - the ability to visualize how 2D shapes transform into 3D objects. This skill is essential in geometry, engineering, and design. Practice helps you 'see' the cube even when it's unfolded!"
  },
  {
    title: "The Area Calculation",
    content: "When you see x² on each face, remember: x represents the side length of the square. The area of one face is x × x = x². With 6 faces, the total surface area is 6x². This is why we write: x² + x² + x² + x² + x² + x² = 6x²."
  },
  {
    title: "Folding Strategy",
    content: "When building a net, start with one face and build outward. Each new face must be adjacent to an existing face on the actual cube. Think about which faces touch each other on a real cube - this helps you place faces correctly in the net."
  }
];

// Cube face size constant
const FACE_SIZE = 1.5; // Reduced from 2.0 for smaller cube
const NET_OFFSET_X = 2.5; // Offset for unfolded net from cube (reduced from 5 for closer first drop)

// Folded (cube) positions and rotations
const FOLDED_POSITIONS = [
  { pos: [0, 0, FACE_SIZE / 2], rot: [0, 0, 0] },           // Front
  { pos: [0, 0, -FACE_SIZE / 2], rot: [0, Math.PI, 0] },    // Back
  { pos: [0, FACE_SIZE / 2, 0], rot: [-Math.PI / 2, 0, 0] },// Top
  { pos: [0, -FACE_SIZE / 2, 0], rot: [Math.PI / 2, 0, 0] },// Bottom
  { pos: [FACE_SIZE / 2, 0, 0], rot: [0, Math.PI / 2, 0] }, // Right
  { pos: [-FACE_SIZE / 2, 0, 0], rot: [0, -Math.PI / 2, 0] }// Left
];

type FaceState = {
  unfolded: boolean;
  animProgress: number;
  direction: Direction | null;
  gridX: number;
  gridY: number;
  parentFace: number | null;
};

type DropZone = {
  targetFaceIndex: number;
  direction: Direction;
  gridX: number;
  gridY: number;
};

type ValidDropZone = {
  parentFaceIndex: number;
  direction: Direction;
  gridX: number;
  gridY: number;
};

// Cube face relationships - which faces are opposite to each other
const OPPOSITE_FACES: Record<number, number> = {
  0: 1, // Front (0) is opposite to Back (1)
  1: 0, // Back (1) is opposite to Front (0)
  2: 3, // Top (2) is opposite to Bottom (3)
  3: 2, // Bottom (3) is opposite to Top (2)
  4: 5, // Right (4) is opposite to Left (5)
  5: 4, // Left (5) is opposite to Right (4)
};

// Face adjacency on a real cube - which faces share an edge
const ADJACENT_ON_CUBE: Record<number, number[]> = {
  0: [2, 3, 4, 5], // Front touches: Top, Bottom, Right, Left
  1: [2, 3, 4, 5], // Back touches: Top, Bottom, Right, Left
  2: [0, 1, 4, 5], // Top touches: Front, Back, Right, Left
  3: [0, 1, 4, 5], // Bottom touches: Front, Back, Right, Left
  4: [0, 1, 2, 3], // Right touches: Front, Back, Top, Bottom
  5: [0, 1, 2, 3], // Left touches: Front, Back, Top, Bottom
};

// Precomputed canonical representations of the 11 valid cube net shapes
const VALID_SHAPE_CANONICALS = new Set([
  '0,0;0,1;0,2;0,3;1,0;2,0',
  '0,0;0,1;0,2;1,0;1,2;2,1',
  '0,0;0,1;0,2;1,1;2,1;3,1',
  '0,0;0,1;0,2;1,2;1,3;2,3',
  '0,0;0,1;1,0;1,1;1,2;2,2',
  '0,0;0,1;1,1;1,2;1,3;2,2',
  '0,0;0,1;1,1;1,2;1,3;2,3',
  '0,0;0,1;1,1;1,2;2,2;2,3',
  '0,1;1,0;1,1;1,2;1,3;2,1'
]);

// Function to compute canonical representation of the net shape
function getCanonicalShapeKey(gridMap: Map<string, number>): string {
  const positions: [number, number][] = Array.from(gridMap.keys()).map(p => p.split(',').map(Number) as [number, number]);

  const canons: string[] = [];
  let ps = positions;

  for (let flip = 0; flip < 2; flip++) {
    if (flip === 1) {
      ps = ps.map(([x, y]) => [x, -y]);
    }
    let currentPs = ps;
    for (let rot = 0; rot < 4; rot++) {
      if (rot === 1) {
        currentPs = currentPs.map(([x, y]) => [y, -x]);
      } else if (rot === 2) {
        currentPs = currentPs.map(([x, y]) => [-x, -y]);
      } else if (rot === 3) {
        currentPs = currentPs.map(([x, y]) => [-y, x]);
      }

      const minX = Math.min(...currentPs.map(([x]) => x));
      const minY = Math.min(...currentPs.map(([, y]) => y));
      const shifted = currentPs
        .map(([x, y]) => [x - minX, y - minY] as [number, number])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const key = shifted.map(([x, y]) => `${x},${y}`).join(';');
      canons.push(key);
    }
  }

  canons.sort();
  return canons[0]; // The lexicographically smallest
}

// Enhanced overlap detection for cube nets
function wouldCreateOverlap(
  gridMap: Map<string, number>,
  newFaceIndex: number,
  newGridX: number,
  newGridY: number
): boolean {
  const oppositeFace = OPPOSITE_FACES[newFaceIndex];
  const allPositions = Array.from(gridMap.entries());

  // Check 1: Opposite faces cannot be adjacent (immediate overlap)
  for (const [pos, faceIdx] of allPositions) {
    if (faceIdx === oppositeFace) {
      const [x, y] = pos.split(',').map(Number);
      const distance = Math.abs(x - newGridX) + Math.abs(y - newGridY);
      if (distance === 1) {
        return true; // Adjacent opposite faces = guaranteed overlap
      }
    }
  }

  // Check 2: Prevent opposites from being too close in non-adjacent positions
  for (const [pos, faceIdx] of allPositions) {
    if (faceIdx === oppositeFace) {
      const [x, y] = pos.split(',').map(Number);
      const dx = Math.abs(x - newGridX);
      const dy = Math.abs(y - newGridY);
      if (dx + dy === 3 && Math.min(dx, dy) === 1) { // Knight's move distance
        return true; // Potential overlap in folding
      }
    }
  }

  return false;
}

// Comprehensive validation for cube net placement
function isValidNetPlacement(
  newFaceIndex: number,
  newGridX: number,
  newGridY: number,
  newParentIndex: number,
  currentFaceStates: FaceState[]
): boolean {
  // Build maps of current grid positions
  const gridMap = new Map<string, number>();
  currentFaceStates.forEach((state, idx) => {
    if (state.unfolded) {
      const pos = `${state.gridX},${state.gridY}`;
      gridMap.set(pos, idx);
    }
  });

  // Rule 1: Position must not be occupied
  if (gridMap.has(`${newGridX},${newGridY}`)) {
    return false;
  }

  // Rule 2: New face must be adjacent to parent on the real cube
  if (!ADJACENT_ON_CUBE[newFaceIndex].includes(newParentIndex)) {
    return false;
  }

  // Rule 3: No overlap configurations
  if (wouldCreateOverlap(gridMap, newFaceIndex, newGridX, newGridY)) {
    return false;
  }

  // Temporarily add new face for comprehensive validation
  const tempGridMap = new Map(gridMap);
  tempGridMap.set(`${newGridX},${newGridY}`, newFaceIndex);

  // Rule 4: Enhanced straight line validation
  if (!validateStraightLineConfigurations(tempGridMap, newFaceIndex, newGridX, newGridY)) {
    return false;
  }

  // Rule 5: Validate connectivity - net must remain connected
  if (!validateConnectivity(tempGridMap)) {
    return false;
  }

  // Rule 6: Prevent invalid branching patterns
  if (!validateBranchingPatterns(tempGridMap, newFaceIndex, newGridX, newGridY)) {
    return false;
  }

  // Rule 7: Validate against known invalid patterns
  if (!validateKnownInvalidPatterns(tempGridMap)) {
    return false;
  }

  // Rule 8: For complete nets, check if shape matches one of the 11 valid canonical shapes
  if (tempGridMap.size === 6) {
    const canonicalKey = getCanonicalShapeKey(tempGridMap);
    if (!VALID_SHAPE_CANONICALS.has(canonicalKey)) {
      return false;
    }
  }

  return true;
}

// Validate straight line configurations (enhanced)
function validateStraightLineConfigurations(
  gridMap: Map<string, number>,
  _newFaceIndex: number,
  newGridX: number,
  newGridY: number
): boolean {
  // Check horizontal lines
  const horizontalFaces = Array.from(gridMap.entries())
    .filter(([pos]) => {
      const [, y] = pos.split(',').map(Number);
      return y === newGridY;
    })
    .sort((a, b) => {
      const [x1] = a[0].split(',').map(Number);
      const [x2] = b[0].split(',').map(Number);
      return x1 - x2;
    });

  if (horizontalFaces.length >= 4) {
    const firstFace = horizontalFaces[0][1];
    const lastFace = horizontalFaces[horizontalFaces.length - 1][1];
    if (OPPOSITE_FACES[firstFace] === lastFace) {
      return false; // Opposite faces at ends of 4+ face line
    }
  }

  if (horizontalFaces.length > 4) {
    return false; // Strictly forbid lines of 5+
  }

  // Check vertical lines
  const verticalFaces = Array.from(gridMap.entries())
    .filter(([pos]) => {
      const [x] = pos.split(',').map(Number);
      return x === newGridX;
    })
    .sort((a, b) => {
      const [, y1] = a[0].split(',').map(Number);
      const [, y2] = b[0].split(',').map(Number);
      return y1 - y2;
    });

  if (verticalFaces.length >= 4) {
    const firstFace = verticalFaces[0][1];
    const lastFace = verticalFaces[verticalFaces.length - 1][1];
    if (OPPOSITE_FACES[firstFace] === lastFace) {
      return false; // Opposite faces at ends of 4+ face line
    }
  }

  if (verticalFaces.length > 4) {
    return false; // Strictly forbid lines of 5+
  }

  // Check for diagonal lines that might cause issues
  if (!validateDiagonalConfigurations(gridMap, newGridX, newGridY)) {
    return false;
  }

  return true;
}

// Validate diagonal configurations
function validateDiagonalConfigurations(
  gridMap: Map<string, number>,
  centerX: number,
  centerY: number
): boolean {
  // Check for problematic diagonal patterns
  // This prevents certain configurations that look valid but cause folding issues

  const diagonals = [
    [[centerX-1, centerY-1], [centerX+1, centerY+1]], // Main diagonal
    [[centerX-1, centerY+1], [centerX+1, centerY-1]]  // Anti-diagonal
  ];

  for (const diagonal of diagonals) {
    const [pos1, pos2] = diagonal;
    const face1 = gridMap.get(`${pos1[0]},${pos1[1]}`);
    const face2 = gridMap.get(`${pos2[0]},${pos2[1]}`);

    if (face1 !== undefined && face2 !== undefined) {
      if (OPPOSITE_FACES[face1] === face2) {
        return false; // Opposite faces on diagonal
      }
    }
  }

  return true;
}

// Validate that the net remains connected
function validateConnectivity(gridMap: Map<string, number>): boolean {
  if (gridMap.size <= 1) return true;

  const positions = Array.from(gridMap.keys());
  const visited = new Set<string>();
  const queue = [positions[0]];

  visited.add(positions[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const [x, y] = current.split(',').map(Number);

    // Check all 4 adjacent positions
    const adjacent = [
      [x+1, y], [x-1, y], [x, y+1], [x, y-1]
    ];

    for (const [adjX, adjY] of adjacent) {
      const adjPos = `${adjX},${adjY}`;
      if (gridMap.has(adjPos) && !visited.has(adjPos)) {
        visited.add(adjPos);
        queue.push(adjPos);
      }
    }
  }

  return visited.size === gridMap.size;
}

// Validate branching patterns to prevent invalid nets
function validateBranchingPatterns(
  gridMap: Map<string, number>,
  _newFaceIndex: number,
  newGridX: number,
  newGridY: number
): boolean {
  // Count how many faces are adjacent to the new position
  let adjacentCount = 0;
  const adjacentPositions = [
    [newGridX+1, newGridY], [newGridX-1, newGridY],
    [newGridX, newGridY+1], [newGridX, newGridY-1]
  ];

  for (const [x, y] of adjacentPositions) {
    if (gridMap.has(`${x},${y}`)) {
      adjacentCount++;
    }
  }

  // Must attach to exactly one existing face to avoid cycles
  if (adjacentCount !== 1) {
    return false;
  }

  return true;
}

// Validate against known invalid patterns
function validateKnownInvalidPatterns(gridMap: Map<string, number>): boolean {
  // This function can be expanded to check for specific known invalid configurations
  // For now, we'll rely on the other validation rules

  // Check for certain 2x2 square patterns that are invalid
  const positions = Array.from(gridMap.keys());
  if (positions.length >= 4) {
    // Check for 2x2 squares
    for (const pos of positions) {
      const [x, y] = pos.split(',').map(Number);
      const squarePositions = [
        `${x},${y}`, `${x+1},${y}`,
        `${x},${y+1}`, `${x+1},${y+1}`
      ];

      if (squarePositions.every(p => gridMap.has(p))) {
        return false; // Any 2x2 block is invalid for cube nets
      }
    }
  }

  return true;
}

// Test function to verify validation logic (for development)
function testCubeNetValidation() {
  console.log('Testing cube net validation...');

  // Test 1: Basic adjacency validation
  const testFaceStates: FaceState[] = [
    { unfolded: true, animProgress: 1, direction: 'UP', gridX: 0, gridY: 0, parentFace: null }, // Face 0 at origin
  ];

  // Face 2 (Top) should be adjacent to Face 0 (Front) on cube
  const test1 = isValidNetPlacement(2, 0, -1, 0, testFaceStates);
  console.log('Test 1 - Face 2 adjacent to Face 0:', test1); // Should be true

  // Face 1 (Back) should NOT be adjacent to Face 0 (Front) on cube
  const test2 = isValidNetPlacement(1, 0, -1, 0, testFaceStates);
  console.log('Test 2 - Face 1 adjacent to Face 0:', test2); // Should be false

  // Test 3: Opposite faces should not be adjacent
  const testFaceStates2: FaceState[] = [
    { unfolded: true, animProgress: 1, direction: 'UP', gridX: 0, gridY: 0, parentFace: null }, // Face 0
    { unfolded: true, animProgress: 1, direction: 'DOWN', gridX: 0, gridY: 1, parentFace: 0 }, // Face 3 (Bottom)
  ];

  // Try to place Face 1 (Back - opposite of Front) adjacent to Face 0 (Front)
  const test3 = isValidNetPlacement(1, 1, 0, 0, testFaceStates2);
  console.log('Test 3 - Opposite faces adjacent:', test3); // Should be false

  // Additional Test 4: Prevent cycle (e.g., attempting to close a loop)
  const testFaceStates3: FaceState[] = [
    { unfolded: true, animProgress: 1, direction: 'UP', gridX: 0, gridY: 0, parentFace: null }, // Face 0
    { unfolded: true, animProgress: 1, direction: 'RIGHT', gridX: 1, gridY: 0, parentFace: 0 }, // Face 4
    { unfolded: true, animProgress: 1, direction: 'DOWN', gridX: 1, gridY: 1, parentFace: 4 }, // Face 3
  ];

  // Try to place Face 5 next to both Face 0 and Face 3 (would create cycle if allowed)
  const test4 = isValidNetPlacement(5, 0, 1, 0, testFaceStates3); // Parent is 0, but adjacent to 3 too
  console.log('Test 4 - Cycle prevention:', test4); // Should be false due to adjacentCount >1

  console.log('Validation tests completed.');
}

// Calculate all valid drop zones for a dragged face
function calculateAllValidDropZones(
  draggedFaceIndex: number,
  currentFaceStates: FaceState[]
): ValidDropZone[] {
  const validDropZones: ValidDropZone[] = [];
  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  
  // For each unfolded face
  currentFaceStates.forEach((faceState, parentFaceIndex) => {
    if (!faceState.unfolded) return;
    
    // Check all 4 directions around this face
    directions.forEach(direction => {
      // Calculate the grid position for this direction
      let newGridX = faceState.gridX;
      let newGridY = faceState.gridY;
      
      switch (direction) {
        case 'UP':
          newGridY = faceState.gridY - 1;
          break;
        case 'DOWN':
          newGridY = faceState.gridY + 1;
          break;
        case 'LEFT':
          newGridX = faceState.gridX - 1;
          break;
        case 'RIGHT':
          newGridX = faceState.gridX + 1;
          break;
      }
      
      // Validate this placement
      const isValid = isValidNetPlacement(
        draggedFaceIndex,
        newGridX,
        newGridY,
        parentFaceIndex,
        currentFaceStates
      );
      
      if (isValid) {
        validDropZones.push({
          parentFaceIndex,
          direction,
          gridX: newGridX,
          gridY: newGridY
        });
      }
    });
  });
  
  return validDropZones;
}

// Helper to detect which edge of a face is closest to a point
function getClosestEdge(localPoint: THREE.Vector3): Direction {
  const x = localPoint.x;
  const y = localPoint.y;
  
  // Determine which edge is closest
  const distances = {
    UP: Math.abs(y - 1),      // Top edge at y=1
    DOWN: Math.abs(y + 1),    // Bottom edge at y=-1
    LEFT: Math.abs(x + 1),    // Left edge at x=-1
    RIGHT: Math.abs(x - 1),   // Right edge at x=1
  };
  
  let closestEdge: Direction = 'UP';
  let minDistance = Infinity;
  
  Object.entries(distances).forEach(([edge, dist]) => {
    if (dist < minDistance) {
      minDistance = dist;
      closestEdge = edge as Direction;
    }
  });
  
  return closestEdge;
}

// Component to show "x²" in center of face
function XSquaredCenter() {
  const fontSize = 0.4;
  
  return (
    <Html position={[0, 0, 0.01]} center>
      <div style={{
        fontSize: `${fontSize * 100}px`,
        fontWeight: 700,
        color: '#1a202c',
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        userSelect: 'none',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        x<sup style={{ fontSize: '0.65em', fontWeight: 600 }}>2</sup>
      </div>
    </Html>
  );
}

// Drop indicator component
function DropIndicator({ 
  position, 
  direction 
}: { 
  position: [number, number, number];
  direction: Direction;
}) {
  const indicatorSize = FACE_SIZE * 1.1; // Slightly larger than face
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[indicatorSize, indicatorSize]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(indicatorSize, indicatorSize)]} />
        <lineBasicMaterial color="#00ff00" linewidth={4} />
      </lineSegments>
      {/* Arrow indicator */}
      <Html center>
        <div className="text-4xl pointer-events-none">
          {direction === 'UP' && '↑'}
          {direction === 'DOWN' && '↓'}
          {direction === 'LEFT' && '←'}
          {direction === 'RIGHT' && '→'}
        </div>
      </Html>
    </group>
  );
}

// Individual Face Component with drag and drop
function InteractiveCubeFace({
  faceIndex,
  color,
  mode,
  faceState,
  isDragging,
  dropZone,
  onDragStart,
  onDragOver,
  onDrop,
  onFoldBack,
  isNetComplete,
}: {
  faceIndex: number;
  color: string;
  mode: Mode;
  faceState: FaceState;
  isDragging: boolean;
  dropZone: DropZone | null;
  onDragStart: (faceIndex: number) => void;
  onDragOver: (faceIndex: number, point: THREE.Vector3) => void;
  onDrop: (faceIndex: number) => void;
  onFoldBack: (faceIndex: number) => void;
  isNetComplete: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (mode === 'net-building' && !faceState.unfolded) {
      // @ts-expect-error - setPointerCapture exists on event target
      e.target.setPointerCapture(e.pointerId);
      onDragStart(faceIndex);
    }
  }, [mode, faceState.unfolded, faceIndex, onDragStart]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (mode === 'net-building' && faceState.unfolded && isDragging) {
      e.stopPropagation();
      // Convert intersection point to local coordinates
      const worldPoint = e.point;
      const localPoint = groupRef.current?.worldToLocal(worldPoint.clone()) || new THREE.Vector3();
      setIsDragTarget(true);
      onDragOver(faceIndex, localPoint);
    } else {
      setIsDragTarget(false);
    }
  }, [mode, faceState.unfolded, isDragging, faceIndex, onDragOver]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (mode === 'net-building') {
      // @ts-expect-error - releasePointerCapture exists on event target
      e.target.releasePointerCapture(e.pointerId);
      // Call drop if we're dragging and hovering over an unfolded face
      if (isDragging && faceState.unfolded) {
        console.log('Pointer up on unfolded face:', faceIndex);
        onDrop(faceIndex);
      }
    }
  }, [mode, isDragging, faceState.unfolded, faceIndex, onDrop]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (mode === 'net-building' && faceState.unfolded && !isDragging) {
      onFoldBack(faceIndex);
    }
  }, [mode, faceState.unfolded, isDragging, faceIndex, onFoldBack]);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return;
    
    const foldedPos = FOLDED_POSITIONS[faceIndex];
    const animProgress = faceState.animProgress;
    
    if (faceState.unfolded && faceState.direction) {
      // Calculate unfolded position based on 2D grid position
      const gridX = faceState.gridX;
      const gridY = faceState.gridY;
      
      // Convert grid position to 3D position
      // Offset the net to the right so it's away from the cube
      const targetX = gridX * FACE_SIZE + NET_OFFSET_X;
      const targetY = -gridY * FACE_SIZE;
      const targetZ = 0.5;
      
      // Interpolate from folded to unfolded position
      const x = THREE.MathUtils.lerp(foldedPos.pos[0], targetX, animProgress);
      const y = THREE.MathUtils.lerp(foldedPos.pos[1], targetY, animProgress);
      const z = THREE.MathUtils.lerp(foldedPos.pos[2], targetZ, animProgress);
      
      groupRef.current.position.set(x, y, z);
      
      // Interpolate rotation to flat
      const rotX = THREE.MathUtils.lerp(foldedPos.rot[0], 0, animProgress);
      const rotY = THREE.MathUtils.lerp(foldedPos.rot[1], 0, animProgress);
      const rotZ = THREE.MathUtils.lerp(foldedPos.rot[2], 0, animProgress);
      
      groupRef.current.rotation.set(rotX, rotY, rotZ);
    } else {
      // Folded position
      groupRef.current.position.set(
        foldedPos.pos[0],
        foldedPos.pos[1],
        foldedPos.pos[2]
      );
      groupRef.current.rotation.set(
        foldedPos.rot[0],
        foldedPos.rot[1],
        foldedPos.rot[2]
      );
    }

    // Hover/drag effect
    if (mode === 'net-building') {
      if (!faceState.unfolded && hovered) {
        const scale = 1.05;
        groupRef.current.scale.set(scale, scale, scale);
      } else {
        groupRef.current.scale.set(1, 1, 1);
      }
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }

    // Update material opacity and emissive for highlighting
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      if (mode === 'net-building') {
        if (!faceState.unfolded && hovered) {
          meshRef.current.material.opacity = 1.0;
          meshRef.current.material.emissive = new THREE.Color(0x333333);
        } else if (faceState.unfolded && isDragTarget) {
          meshRef.current.material.opacity = 1.0;
          meshRef.current.material.emissive = new THREE.Color(0x444444);
        } else {
          meshRef.current.material.opacity = 0.9;
          meshRef.current.material.emissive = new THREE.Color(0x000000);
        }
      } else {
        meshRef.current.material.opacity = 0.9;
        meshRef.current.material.emissive = new THREE.Color(0x000000);
      }
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh 
          ref={meshRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (mode === 'net-building') {
              if (!faceState.unfolded) {
                setHovered(true);
                document.body.style.cursor = 'grab';
              } else if (isDragging) {
                setIsDragTarget(true);
                document.body.style.cursor = 'crosshair';
              } else {
                document.body.style.cursor = 'pointer';
              }
            }
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (mode === 'net-building') {
              setHovered(false);
              setIsDragTarget(false);
              if (!isDragging) {
                document.body.style.cursor = 'default';
              }
            }
          }}
        >
          <planeGeometry args={[FACE_SIZE, FACE_SIZE]} />
          <meshStandardMaterial
            color={color}
            transparent={true}
            opacity={0.9}
            side={THREE.DoubleSide}
            metalness={0.1}
            roughness={0.3}
          />
        </mesh>
        {/* Border edges */}
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(FACE_SIZE, FACE_SIZE)]} />
          <lineBasicMaterial color="#000000" opacity={1} transparent={false} linewidth={2} />
        </lineSegments>
        {/* Hover highlight for folded faces */}
        {mode === 'net-building' && !faceState.unfolded && hovered && (
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(FACE_SIZE * 1.05, FACE_SIZE * 1.05)]} />
            <lineBasicMaterial color="#FFD700" opacity={1} transparent={false} linewidth={3} />
          </lineSegments>
        )}
        {/* Drag target highlight for unfolded faces */}
        {mode === 'net-building' && faceState.unfolded && isDragTarget && (
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(FACE_SIZE * 1.075, FACE_SIZE * 1.075)]} />
            <lineBasicMaterial color="#00AAFF" opacity={1} transparent={false} linewidth={4} />
          </lineSegments>
        )}
        {/* Show x² in center when net is complete */}
        {faceState.unfolded && isNetComplete && (
          <XSquaredCenter />
        )}
      </group>
      {/* Drop indicator */}
      {dropZone && dropZone.targetFaceIndex === faceIndex && faceState.unfolded && (
        <DropIndicator
          position={[dropZone.gridX * FACE_SIZE + NET_OFFSET_X, -dropZone.gridY * FACE_SIZE, 0.5]}
          direction={dropZone.direction}
        />
      )}
    </>
  );
}

// Main Cube Component
function InteractiveCube({ 
  mode, 
  faceStates,
  draggedFaceIndex,
  dropZone,
  validDropZones,
  onDragStart,
  onDragOver,
  onDrop,
  onFoldBack,
  isNetComplete,
}: { 
  mode: Mode;
  faceStates: FaceState[];
  draggedFaceIndex: number | null;
  dropZone: DropZone | null;
  validDropZones: ValidDropZone[];
  onDragStart: (faceIndex: number) => void;
  onDragOver: (faceIndex: number, point: THREE.Vector3) => void;
  onDrop: (faceIndex: number) => void;
  onFoldBack: (faceIndex: number) => void;
  isNetComplete: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // No auto-rotation - cube stays in same position for both modes

  return (
    <group ref={groupRef}>
      {FACE_COLORS.map((color, idx) => (
        <InteractiveCubeFace
          key={idx}
          faceIndex={idx}
          color={color}
          mode={mode}
          faceState={faceStates[idx]}
          isDragging={draggedFaceIndex !== null}
          dropZone={dropZone}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onFoldBack={onFoldBack}
          isNetComplete={isNetComplete}
        />
      ))}
      {/* Render all valid drop zones */}
      {draggedFaceIndex !== null && validDropZones.map((zone, idx) => (
        <DropIndicator
          key={`drop-zone-${idx}`}
          position={[zone.gridX * FACE_SIZE + NET_OFFSET_X, -zone.gridY * FACE_SIZE, 0.5]}
          direction={zone.direction}
        />
      ))}
    </group>
  );
}

// Main Page Component
export default function Cube3DPage() {
  // Run validation tests on component mount (for development)
  useEffect(() => {
    testCubeNetValidation();
  }, []);

  const [mode, setMode] = useState<Mode>('net-building');
  const [faceStates, setFaceStates] = useState<FaceState[]>(
    FACE_COLORS.map(() => ({ 
      unfolded: false, 
      animProgress: 0, 
      direction: null,
      gridX: 0,
      gridY: 0,
      parentFace: null
    }))
  );
  const [draggedFaceIndex, setDraggedFaceIndex] = useState<number | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const [validDropZones, setValidDropZones] = useState<ValidDropZone[]>([]);
  const [unfoldHistory, setUnfoldHistory] = useState<number[]>([]); // Track order of unfolded faces
  const [currentTip, setCurrentTip] = useState(0); // Current tip index for tips box
  const [isCompletionClosed, setIsCompletionClosed] = useState(false); // Track if completion popup is closed

  // Animate face unfolding
  const animateFace = useCallback((faceIndex: number, targetProgress: number) => {
    const startTime = Date.now();
    const duration = 800;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setFaceStates(prev => {
        const newStates = [...prev];
        const currentProgress = prev[faceIndex].animProgress;
        newStates[faceIndex] = {
          ...newStates[faceIndex],
          animProgress: currentProgress + (targetProgress - currentProgress) * eased
        };
        return newStates;
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setFaceStates(prev => {
          const newStates = [...prev];
          newStates[faceIndex] = {
            ...newStates[faceIndex],
            animProgress: targetProgress
          };
          return newStates;
        });
      }
    };
    
    requestAnimationFrame(animate);
  }, []);

  const handleDragStart = useCallback((faceIndex: number) => {
    console.log('Drag started for face:', faceIndex);
    setDraggedFaceIndex(faceIndex);
    
    // Calculate all valid drop zones for this face
    const validZones = calculateAllValidDropZones(faceIndex, faceStates);
    console.log('Valid drop zones:', validZones);
    setValidDropZones(validZones);
    
    document.body.style.cursor = 'grabbing';
  }, [faceStates]);

  const handleDragOver = useCallback((targetFaceIndex: number, localPoint: THREE.Vector3) => {
    if (draggedFaceIndex === null) return;
    
    // Get the edge closest to where the user is hovering
    const direction = getClosestEdge(localPoint);
    
    // Calculate the grid position for this drop
    const targetFace = faceStates[targetFaceIndex];
    if (!targetFace.unfolded) return;
    
    let newGridX = targetFace.gridX;
    let newGridY = targetFace.gridY;
    
    switch (direction) {
      case 'UP':
        newGridY = targetFace.gridY - 1;
        break;
      case 'DOWN':
        newGridY = targetFace.gridY + 1;
        break;
      case 'LEFT':
        newGridX = targetFace.gridX - 1;
        break;
      case 'RIGHT':
        newGridX = targetFace.gridX + 1;
        break;
    }
    
    // Check if this position matches any of the valid drop zones
    const matchingZone = validDropZones.find(
      zone => zone.gridX === newGridX && zone.gridY === newGridY
    );
    
    if (matchingZone) {
      console.log('Hovering over valid drop zone:', matchingZone);
      setDropZone({
        targetFaceIndex,
        direction,
        gridX: newGridX,
        gridY: newGridY
      });
    } else {
      setDropZone(null);
    }
  }, [draggedFaceIndex, faceStates, validDropZones]);

  const handleDrop = useCallback((targetFaceIndex: number) => {
    console.log('Drop triggered on face:', targetFaceIndex, 'draggedFace:', draggedFaceIndex, 'dropZone:', dropZone);
    
    if (draggedFaceIndex === null) {
      console.log('No dragged face, aborting');
      setDraggedFaceIndex(null);
      setDropZone(null);
      document.body.style.cursor = 'default';
      return;
    }
    
    // Get the first unfolded face count
    const unfoldedCount = faceStates.filter(f => f.unfolded).length;
    console.log('Unfolded count:', unfoldedCount);
    
    // If this is the first face, place it at origin (targetFaceIndex === -1 means global drop)
    if (unfoldedCount === 0 && (targetFaceIndex === -1 || !dropZone)) {
      console.log('Placing first face at origin');
      setFaceStates(prev => {
        const newStates = [...prev];
        newStates[draggedFaceIndex] = {
          ...newStates[draggedFaceIndex],
          unfolded: true,
          gridX: 0,
          gridY: 0,
          direction: 'UP',
          parentFace: null
        };
        return newStates;
      });
      animateFace(draggedFaceIndex, 1);
      // Add to history
      setUnfoldHistory(prev => [...prev, draggedFaceIndex]);
    } else if (dropZone) {
      // Place the face at the drop zone - use dropZone info directly
      console.log('Placing face at drop zone:', dropZone);
      setFaceStates(prev => {
        const newStates = [...prev];
        newStates[draggedFaceIndex] = {
          ...newStates[draggedFaceIndex],
          unfolded: true,
          gridX: dropZone.gridX,
          gridY: dropZone.gridY,
          direction: dropZone.direction,
          parentFace: dropZone.targetFaceIndex
        };
        return newStates;
      });
      animateFace(draggedFaceIndex, 1);
      // Add to history
      setUnfoldHistory(prev => [...prev, draggedFaceIndex]);
    } else {
      console.log('Drop zone invalid or missing, aborting drop');
    }
    
    setDraggedFaceIndex(null);
    setDropZone(null);
    setValidDropZones([]);
    document.body.style.cursor = 'default';
  }, [draggedFaceIndex, dropZone, faceStates, animateFace]);

  const handleFoldBack = useCallback((faceIndex: number) => {
    // Check if any faces depend on this one
    const hasDependents = faceStates.some(
      (state, idx) => idx !== faceIndex && state.parentFace === faceIndex && state.unfolded
    );
    
    if (hasDependents) return;
    
    setFaceStates(prev => {
      const newStates = [...prev];
      newStates[faceIndex] = {
        unfolded: false,
        animProgress: 0,
        direction: null,
        gridX: 0,
        gridY: 0,
        parentFace: null
      };
      return newStates;
    });
    animateFace(faceIndex, 0);
    // Remove from history
    setUnfoldHistory(prev => prev.filter(idx => idx !== faceIndex));
  }, [faceStates, animateFace]);

  const handleUndo = useCallback(() => {
    if (unfoldHistory.length === 0) return;
    
    // Get the last unfolded face
    const lastFaceIndex = unfoldHistory[unfoldHistory.length - 1];
    console.log('Undoing face:', lastFaceIndex);
    
    // Check if any faces depend on this one
    const hasDependents = faceStates.some(
      (state, idx) => idx !== lastFaceIndex && state.parentFace === lastFaceIndex && state.unfolded
    );
    
    // If it has dependents, we need to undo those first (recursive undo)
    if (hasDependents) {
      // Find all faces that depend on this face
      const dependentFaces = faceStates
        .map((state, idx) => ({ idx, state }))
        .filter(({ state }) => state.parentFace === lastFaceIndex && state.unfolded)
        .map(({ idx }) => idx);
      
      // Undo dependents first (work backwards through history)
      dependentFaces.forEach(depIdx => {
        setFaceStates(prev => {
          const newStates = [...prev];
          newStates[depIdx] = {
            unfolded: false,
            animProgress: 0,
            direction: null,
            gridX: 0,
            gridY: 0,
            parentFace: null
          };
          return newStates;
        });
        animateFace(depIdx, 0);
      });
      
      // Remove dependents from history
      setUnfoldHistory(prev => prev.filter(idx => !dependentFaces.includes(idx) && idx !== lastFaceIndex));
    } else {
      // No dependents, just remove the last face
      setUnfoldHistory(prev => prev.slice(0, -1));
    }
    
    // Fold back the last face
    setFaceStates(prev => {
      const newStates = [...prev];
      newStates[lastFaceIndex] = {
        unfolded: false,
        animProgress: 0,
        direction: null,
        gridX: 0,
        gridY: 0,
        parentFace: null
      };
      return newStates;
    });
    animateFace(lastFaceIndex, 0);
  }, [unfoldHistory, faceStates, animateFace]);

  const handleModeSwitch = useCallback((newMode: Mode) => {
    setMode(newMode);
    setDraggedFaceIndex(null);
    setDropZone(null);
    // Don't reset face states - preserve unfolded state between modes
  }, []);

  const handleFoldToCube = useCallback(() => {
    // Animate all unfolded faces back to the cube
    const unfoldedFaces = faceStates
      .map((state, idx) => ({ idx, state }))
      .filter(({ state }) => state.unfolded);
    
    if (unfoldedFaces.length === 0) return;
    
    // Animate all faces back to folded position
    unfoldedFaces.forEach(({ idx }) => {
      animateFace(idx, 0);
    });
    
    // After animation completes, reset all states
    setTimeout(() => {
      setFaceStates(FACE_COLORS.map(() => ({ 
        unfolded: false, 
        animProgress: 0, 
        direction: null,
        gridX: 0,
        gridY: 0,
        parentFace: null
      })));
      setUnfoldHistory([]);
    }, 850); // Slightly longer than animation duration
  }, [faceStates, animateFace]);

  const handleReset = useCallback(() => {
    setFaceStates(FACE_COLORS.map(() => ({ 
      unfolded: false, 
      animProgress: 0, 
      direction: null,
      gridX: 0,
      gridY: 0,
      parentFace: null
    })));
    setDraggedFaceIndex(null);
    setDropZone(null);
    setValidDropZones([]);
    setUnfoldHistory([]);
  }, []);

  const unfoldedCount = faceStates.filter(f => f.unfolded).length;

  // Reset completion popup when net becomes incomplete
  const shouldShowCompletion = unfoldedCount === 6 && !isCompletionClosed;
  if (unfoldedCount < 6 && isCompletionClosed) {
    setIsCompletionClosed(false);
  }

  const nextTip = useCallback(() => {
    setCurrentTip((prev) => (prev + 1) % CUBE_NET_TIPS.length);
  }, []);

  const prevTip = useCallback(() => {
    setCurrentTip((prev) => (prev - 1 + CUBE_NET_TIPS.length) % CUBE_NET_TIPS.length);
  }, []);

  const handleCloseCompletion = useCallback(() => {
    setIsCompletionClosed(true);
  }, []);

  return (
    <div className="w-full h-screen bg-white">
      {/* Mode Switcher */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/95 px-4 py-2 rounded-lg border-2 border-gray-300 shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={() => handleModeSwitch('net-building')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'net-building'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📐 Net Building Mode
          </button>
          <button
            onClick={() => handleModeSwitch('interaction')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              mode === 'interaction'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎮 Interaction Mode
          </button>
          
        </div>
      </div>

      {/* 3D Canvas */}
      <div 
        className="w-full h-full"
        onPointerUp={(e) => {
          // Global drop handler
          if (mode === 'net-building' && draggedFaceIndex !== null) {
            e.preventDefault();
            const unfoldedCount = faceStates.filter(f => f.unfolded).length;
            
            // If first face, drop at origin
            if (unfoldedCount === 0) {
              console.log('Global drop: Placing first face at origin');
              handleDrop(-1); // -1 indicates drop anywhere
            } else if (dropZone) {
              // If we have a valid drop zone, use it
              console.log('Global drop: Using drop zone');
              handleDrop(dropZone.targetFaceIndex);
            } else {
              // No valid drop, just clear drag state
              console.log('Global drop: Invalid drop, clearing state');
              setDraggedFaceIndex(null);
              setDropZone(null);
              setValidDropZones([]);
              document.body.style.cursor = 'default';
            }
          }
        }}
      >
        <Canvas>
          <PerspectiveCamera 
            makeDefault 
            position={[4, 4, 4]} 
            fov={75} 
          />
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} />
          <directionalLight position={[-5, -5, -5]} intensity={0.8} />
          <directionalLight position={[0, 5, 0]} intensity={1} />
          <pointLight position={[0, 0, 0]} intensity={0.5} />
          <InteractiveCube 
            mode={mode} 
            faceStates={faceStates}
            draggedFaceIndex={draggedFaceIndex}
            dropZone={dropZone}
            validDropZones={validDropZones}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onFoldBack={handleFoldBack}
            isNetComplete={unfoldedCount === 6}
          />
          <OrbitControls
            enableZoom={mode === 'interaction' || draggedFaceIndex === null}
            enablePan={mode === 'interaction' || draggedFaceIndex === null}
            enableRotate={mode === 'interaction'}
            enabled={mode === 'interaction' || draggedFaceIndex === null}
            minDistance={2}
            maxDistance={15}
          />
        </Canvas>
      </div>
      
      {/* Header */}
      <div className="absolute top-20 left-4 text-gray-800 bg-white/90 px-6 py-3 rounded-lg border border-gray-300 shadow-lg">
        <h1 className="text-2xl font-bold">
          {mode === 'interaction' ? '3D Cube - Interaction' : '3D Cube - Net Building'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {mode === 'interaction' 
            ? 'Drag to rotate • Scroll to zoom • Pan to move'
            : draggedFaceIndex !== null
              ? 'Drag over an unfolded face edge to attach'
              : 'Scroll to zoom • Pan to move • Drag faces to build net'
          }
        </p>
      </div>

      {/* Progress Counter */}
        <div className="absolute top-20 right-4 bg-green-50 border-2 border-green-400 rounded-lg px-6 py-3 shadow-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600">Faces Unfolded</div>
            <div className="text-3xl font-bold text-green-600">{unfoldedCount} / 6</div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={unfoldHistory.length === 0}
                className={`flex-1 px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                  unfoldHistory.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                ↶ Undo
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Reset All
              </button>
            </div>
            <button
              onClick={handleFoldToCube}
              disabled={unfoldedCount === 0}
              className={`w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                unfoldedCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
              }`}
            >
              🎲 Fold to Cube
            </button>
          </div>
        </div>
      
      {/* Color Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 px-6 py-4 rounded-lg border border-gray-300 shadow-lg">
        <h2 className="text-gray-800 font-bold mb-3">Face Colors</h2>
        <div className="space-y-2">
          {FACE_COLORS.map((color, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded border border-gray-400" style={{ backgroundColor: color }}></div>
              <span className="text-gray-800 text-sm">{FACE_LABELS[idx]}</span>
              {mode === 'net-building' && faceStates[idx].unfolded && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-green-600 font-bold">✓</span>
                  <span className="text-xs text-gray-500">
                    ({faceStates[idx].gridX}, {faceStates[idx].gridY})
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
        <div className="absolute bottom-4 left-4 bg-blue-50 border-2 border-blue-400 rounded-lg px-4 py-3 shadow-lg max-w-xs">
          <h3 className="font-bold text-blue-800 mb-2">💡 Drag & Drop Net Building</h3>
          <p className="text-xs text-blue-700 mb-2">
            <strong>First face:</strong> Drag from cube, drop anywhere
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Next faces:</strong> Drag and drop onto an unfolded face edge
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Smart Validation:</strong> Only valid cube net placements allowed
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Fold back:</strong> Click an unfolded face or use Undo
          </p>
          <p className="text-xs text-blue-600">
            🟢 Green = Valid • ⛔ No preview = Invalid placement
          </p>
        </div>

      {/* Dragging Hint */}
      {mode === 'net-building' && draggedFaceIndex !== null && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 bg-yellow-50 border-2 border-yellow-400 rounded-lg px-6 py-3 shadow-xl">
          <p className="text-yellow-800 font-bold text-center">
            {unfoldedCount === 0 
              ? "Drop anywhere to place first face"
              : "Hover over an unfolded face edge to connect"
            }
          </p>
        </div>
      )}

      {/* Completion Message */}
      {shouldShowCompletion && (
        <div style={{ zIndex: 23232323, transform: 'translate(-50%, -50%)' }} className="absolute top-1/2 left-1/2 bg-gradient-to-r from-yellow-50 to-green-50 border-4 border-green-400 rounded-xl px-8 py-6 shadow-2xl">
          {/* Close Button */}
          <button
            onClick={handleCloseCompletion}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-3xl font-bold text-green-800 mb-2">Perfect Net!</h2>
            <p className="text-green-700 text-lg mb-3">You've created a valid cube net!</p>
            <p className="text-xs text-green-600 mb-4">One of 11 possible distinct nets</p>
            
            {/* Area Formula Display */}
            <div className="mt-4 pt-4 border-t-2 border-green-300">
              <p className="text-lg font-bold text-gray-800 mb-2">
                Area = sum of 6 squares =
              </p>
              <div className="flex items-center justify-center gap-1 flex-wrap mb-2">
                {FACE_COLORS.map((color, idx) => (
                  <span
                    key={idx}
                    className="text-2xl font-bold"
                    style={{ color: color }}
                  >
                    x<sup className="text-lg">2</sup>
                    {idx < 5 && <span className="text-gray-800 mx-1">+</span>}
                  </span>
                ))}
              </div>
              <p className="text-2xl font-bold text-gray-800">
                = 6x<sup className="text-xl">2</sup>
              </p>
            </div>
          </div>
        </div>
      )}

        <div className="absolute left-2 top-48 bg-white border-2 border-black rounded-lg p-6 w-full max-w-md z-20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevTip}
              className="text-2xl font-bold text-black hover:text-pink-500 transition-colors"
            >
              ‹
            </button>
            <h2 className="text-xl font-bold text-black">Cube Net Tips</h2>
            <button
              onClick={nextTip}
              className="text-2xl font-bold text-black hover:text-pink-500 transition-colors"
            >
              ›
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {CUBE_NET_TIPS[currentTip].title}
            </h3>
            <p className="text-black leading-relaxed text-sm">
              {CUBE_NET_TIPS[currentTip].content}
            </p>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {CUBE_NET_TIPS.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentTip ? 'bg-pink-500' : 'bg-pink-200'
                }`}
              />
            ))}
          </div>
        </div>
    </div>
  );
}