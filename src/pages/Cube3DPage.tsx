import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import * as THREE from 'three';

// Face colors for the cube - same as CubeSolvingPage
const FACE_COLORS = [
  '#F7DDB3', // Pink - Front (Face 1)
  '#F6D2E8', // Peach - Back (Face 2)
  '#B6E59C', // Light Blue - Top (Face 3)
  '#A8E4FA', // Light Green - Bottom (Face 4)
  '#FDFFA3', // Lemon Chiffon - Right (Face 5)
  '#E89A88', // Peru - Left (Face 6)
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

// Folded (cube) positions and rotations
const FOLDED_POSITIONS = [
  { pos: [0, 0, FACE_SIZE / 2], rot: [0, 0, 0] },           // Front
  { pos: [0, 0, -FACE_SIZE / 2], rot: [0, Math.PI, 0] },    // Back
  { pos: [0, FACE_SIZE / 2, 0], rot: [-Math.PI / 2, 0, 0] },// Top
  { pos: [0, -FACE_SIZE / 2, 0], rot: [Math.PI / 2, 0, 0] },// Bottom
  { pos: [FACE_SIZE / 2, 0, 0], rot: [0, Math.PI / 2, 0] }, // Right
  { pos: [-FACE_SIZE / 2, 0, 0], rot: [0, -Math.PI / 2, 0] }// Left
];

const HALF_FACE = FACE_SIZE / 2;
const DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

type FaceBaseInfo = {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

const FACE_BASE_INFO: FaceBaseInfo[] = FOLDED_POSITIONS.map(({ pos, rot }) => {
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const center = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
  return { center, normal, up, right, quaternion };
});

const BASE_MATRICES = FACE_BASE_INFO.map(info => {
  const matrix = new THREE.Matrix4();
  matrix.compose(info.center.clone(), info.quaternion.clone(), new THREE.Vector3(1, 1, 1));
  return matrix;
});

const vectorKey = (vec: THREE.Vector3) =>
  `${Math.round(vec.x)},${Math.round(vec.y)},${Math.round(vec.z)}`;

const NORMAL_TO_FACE: Record<string, number> = {};
FACE_BASE_INFO.forEach((info, idx) => {
  NORMAL_TO_FACE[vectorKey(info.normal)] = idx;
});

type HingeEntry = {
  parentFaceIndex: number;
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
  connection: THREE.Matrix4;
  childNormal: THREE.Vector3;
};

const buildParentInverseMatrix = (matrix: THREE.Matrix4) =>
  new THREE.Matrix4().copy(matrix).invert();

const matrixToMatrix3 = (matrix: THREE.Matrix4) => {
  const mat3 = new THREE.Matrix3();
  mat3.setFromMatrix4(matrix);
  return mat3;
};

const getDirectionVector = (info: FaceBaseInfo, direction: Direction) => {
  switch (direction) {
    case 'UP':
      return info.up.clone();
    case 'DOWN':
      return info.up.clone().negate();
    case 'LEFT':
      return info.right.clone().negate();
    case 'RIGHT':
    default:
      return info.right.clone();
  }
};

const getAxisVector = (info: FaceBaseInfo, direction: Direction) => {
  switch (direction) {
    case 'UP':
    case 'DOWN':
      return info.right.clone();
    case 'LEFT':
    case 'RIGHT':
    default:
      return info.up.clone();
  }
};

const HINGE_CONFIG: Array<Partial<Record<Direction, HingeEntry>>> = FACE_BASE_INFO.map(
  (info, faceIndex) => {
    const configs: Partial<Record<Direction, HingeEntry>> = {};
    DIRECTIONS.forEach(direction => {
      const directionVector = getDirectionVector(info, direction);
      const parentFaceIndex = NORMAL_TO_FACE[vectorKey(directionVector)];
      if (parentFaceIndex === undefined) {
        return;
      }

      const parentMatrix = BASE_MATRICES[parentFaceIndex];
      const parentInverse = buildParentInverseMatrix(parentMatrix);
      const parentInverseMat3 = matrixToMatrix3(parentInverse);

      const pivotWorld = info.center
        .clone()
        .add(directionVector.clone().setLength(HALF_FACE));
      const pivotParent = pivotWorld.clone().applyMatrix4(parentInverse);

      const axisWorld = getAxisVector(info, direction);
      const axisParent = axisWorld.clone().applyMatrix3(parentInverseMat3).normalize();

      const connection = parentInverse.clone().multiply(BASE_MATRICES[faceIndex]);
      const childNormalParent = info.normal.clone().applyMatrix3(parentInverseMat3).normalize();

      configs[direction] = {
        parentFaceIndex,
        pivot: pivotParent,
        axis: axisParent,
        connection,
        childNormal: childNormalParent,
      };
    });
    return configs;
  }
);

const PARENT_NORMAL_REFERENCE = new THREE.Vector3(0, 0, 1);

function buildChildMatrix(
  hinge: HingeEntry,
  angle: number,
  sign: 1 | -1
): { childMatrix: THREE.Matrix4; rotatedNormal: THREE.Vector3 } {
  const rotationQuat = new THREE.Quaternion().setFromAxisAngle(hinge.axis, sign * angle);
  const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(rotationQuat);
  const pivotTranslate = new THREE.Matrix4().makeTranslation(hinge.pivot.x, hinge.pivot.y, hinge.pivot.z);
  const pivotTranslateBack = new THREE.Matrix4().makeTranslation(-hinge.pivot.x, -hinge.pivot.y, -hinge.pivot.z);
  const hingeMatrixLocal = pivotTranslate.clone().multiply(rotationMatrix).multiply(pivotTranslateBack);
  const childMatrix = hingeMatrixLocal.clone().multiply(hinge.connection);
  const rotatedNormal = hinge.childNormal
    .clone()
    .applyMatrix3(matrixToMatrix3(rotationMatrix))
    .normalize();

  return { childMatrix, rotatedNormal };
}

function computeWorldMatrix(
  faceIndex: number,
  faceStates: FaceState[],
  cache: Array<THREE.Matrix4 | null>
): THREE.Matrix4 {
  if (cache[faceIndex]) {
    return cache[faceIndex]!;
  }

  const state = faceStates[faceIndex];
  let result: THREE.Matrix4;

  if (!state.unfolded || state.parentFace === null || !state.direction) {
    result = BASE_MATRICES[faceIndex].clone();
  } else {
    const hinge = HINGE_CONFIG[faceIndex][state.direction];
    if (!hinge) {
      result = BASE_MATRICES[faceIndex].clone();
    } else {
      const parentMatrix = computeWorldMatrix(hinge.parentFaceIndex, faceStates, cache).clone();
      const angle = (Math.PI / 2) * state.animProgress;

      const positive = buildChildMatrix(hinge, angle, 1);
      const negative = buildChildMatrix(hinge, angle, -1);
      const chosen =
        positive.rotatedNormal.dot(PARENT_NORMAL_REFERENCE) >=
        negative.rotatedNormal.dot(PARENT_NORMAL_REFERENCE)
          ? positive
          : negative;

      result = parentMatrix.multiply(chosen.childMatrix);
    }
  }

  cache[faceIndex] = result;
  return result;
}

function computeAllWorldMatrices(faceStates: FaceState[]): THREE.Matrix4[] {
  const cache = new Array<THREE.Matrix4 | null>(FACE_COLORS.length).fill(null);
  return faceStates.map((_, idx) => computeWorldMatrix(idx, faceStates, cache).clone());
}

type FaceState = {
  unfolded: boolean;
  animProgress: number;
  direction: Direction | null;
  gridX: number;
  gridY: number;
  parentFace: number | null;
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


// Component to show unfolding direction arrows
function UnfoldArrows({
  validDirections,
  onDirectionClick,
  onArrowHover,
  onArrowLeave
}: {
  validDirections: Direction[];
  onDirectionClick: (direction: Direction) => void;
  onArrowHover: () => void;
  onArrowLeave: () => void;
}) {
  const allDirections: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  return (
    <>
      {allDirections.map(direction => {
        const isValid = validDirections.includes(direction);
        return (
          <group key={direction}>
            {direction === 'UP' && (
              <Html position={[0, 0.6, 0.01]} center>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isValid) onDirectionClick('UP');
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onArrowHover();
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onArrowLeave();
                  }}
                  className={`text-4xl transition-colors rounded-full p-3 border-2 shadow-lg select-none ${
                    isValid
                      ? 'text-green-600 hover:text-green-800 active:text-green-900 bg-white/90 border-green-300 hover:bg-green-50 active:bg-green-100'
                      : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!isValid}
                >
                  ↑
                </button>
      </Html>
            )}
            {direction === 'DOWN' && (
              <Html position={[0, -0.6, 0.01]} center>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isValid) onDirectionClick('DOWN');
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onArrowHover();
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onArrowLeave();
                  }}
                  className={`text-4xl transition-colors rounded-full p-3 border-2 shadow-lg select-none ${
                    isValid
                      ? 'text-green-600 hover:text-green-800 active:text-green-900 bg-white/90 border-green-300 hover:bg-green-50 active:bg-green-100'
                      : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!isValid}
                >
                  ↓
                </button>
              </Html>
            )}
            {direction === 'LEFT' && (
              <Html position={[-0.6, 0, 0.01]} center>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isValid) onDirectionClick('LEFT');
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onArrowHover();
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onArrowLeave();
                  }}
                  className={`text-4xl transition-colors rounded-full p-3 border-2 shadow-lg select-none ${
                    isValid
                      ? 'text-green-600 hover:text-green-800 active:text-green-900 bg-white/90 border-green-300 hover:bg-green-50 active:bg-green-100'
                      : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!isValid}
                >
                  ←
                </button>
              </Html>
            )}
            {direction === 'RIGHT' && (
              <Html position={[0.6, 0, 0.01]} center>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isValid) onDirectionClick('RIGHT');
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onArrowHover();
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onArrowLeave();
                  }}
                  className={`text-4xl transition-colors rounded-full p-3 border-2 shadow-lg select-none ${
                    isValid
                      ? 'text-green-600 hover:text-green-800 active:text-green-900 bg-white/90 border-green-300 hover:bg-green-50 active:bg-green-100'
                      : 'text-gray-400 bg-gray-100 border-gray-300 cursor-not-allowed'
                  }`}
                  disabled={!isValid}
                >
                  →
                </button>
              </Html>
            )}
    </group>
        );
      })}
    </>
  );
}

// Individual Face Component with unfolding
function InteractiveCubeFace({
  faceIndex,
  color,
  mode,
  faceState,
  worldMatrix,
  onUnfold,
  onFoldBack,
  isNetComplete,
  possibleDirections,
}: {
  faceIndex: number;
  color: string;
  mode: Mode;
  faceState: FaceState;
  worldMatrix: THREE.Matrix4;
  onUnfold: (faceIndex: number, direction: Direction) => void;
  onFoldBack: (faceIndex: number) => void;
  isNetComplete: boolean;
  possibleDirections: Direction[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [showArrows, setShowArrows] = useState(false);
  const [arrowHovered, setArrowHovered] = useState(false);
  const hideArrowsTimeout = useRef<number | null>(null);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (mode === 'net-building' && faceState.unfolded) {
      onFoldBack(faceIndex);
    }
  }, [mode, faceState.unfolded, faceIndex, onFoldBack]);

  const handleDirectionClick = useCallback((direction: Direction) => {
    if (mode === 'net-building' && !faceState.unfolded) {
      setShowArrows(false);
      setArrowHovered(false);
      if (hideArrowsTimeout.current) {
        clearTimeout(hideArrowsTimeout.current);
        hideArrowsTimeout.current = null;
      }
      onUnfold(faceIndex, direction);
    }
  }, [mode, faceState.unfolded, faceIndex, onUnfold]);

  const handleArrowHover = useCallback(() => {
    setArrowHovered(true);
    if (hideArrowsTimeout.current) {
      clearTimeout(hideArrowsTimeout.current);
      hideArrowsTimeout.current = null;
    }
  }, []);

  const handleArrowLeave = useCallback(() => {
    setArrowHovered(false);
    // Only hide arrows if face is also not hovered
    if (!hovered) {
      hideArrowsTimeout.current = setTimeout(() => {
        setShowArrows(false);
      }, 200);
    }
  }, [hovered]);

  useEffect(() => {
    return () => {
      if (hideArrowsTimeout.current) {
        clearTimeout(hideArrowsTimeout.current);
      }
    };
  }, []);

  const worldMatrixRef = useRef(worldMatrix.clone());
  useEffect(() => {
    worldMatrixRef.current.copy(worldMatrix);
  }, [worldMatrix]);

  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return;
    
    worldMatrixRef.current.decompose(tempPosition, tempQuaternion, tempScale);
    groupRef.current.position.copy(tempPosition);
    groupRef.current.quaternion.copy(tempQuaternion);

    let targetScale = 1;
    if (mode === 'net-building') {
      if (!faceState.unfolded && hovered) {
        targetScale = 1.05;
      }
    }

    // Add bounce effect during unfolding animation
    if (faceState.unfolded && faceState.animProgress > 0 && faceState.animProgress < 1) {
      // Add a slight scale bounce during unfolding
      const bounce = Math.sin(faceState.animProgress * Math.PI * 2) * 0.05;
      targetScale = 1 + bounce;
    }

    // Smooth scale interpolation
    const currentScale = groupRef.current.scale.x;
    const scaleDiff = targetScale - currentScale;
    const newScale = currentScale + scaleDiff * 0.1; // Smooth interpolation
    groupRef.current.scale.set(newScale, newScale, newScale);

    // Update material opacity and emissive for highlighting
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      if (mode === 'net-building') {
        if (!faceState.unfolded && hovered) {
          meshRef.current.material.opacity = 1.0;
          meshRef.current.material.emissive = new THREE.Color(0x333333);
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
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (mode === 'net-building') {
                setHovered(true);
              if (!faceState.unfolded) {
                setShowArrows(true);
                if (hideArrowsTimeout.current) {
                  clearTimeout(hideArrowsTimeout.current);
                  hideArrowsTimeout.current = null;
                }
                document.body.style.cursor = 'pointer';
              } else {
                document.body.style.cursor = 'pointer';
              }
            }
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            if (mode === 'net-building') {
              setHovered(false);
              if (!faceState.unfolded && !arrowHovered) {
                // Only hide arrows if neither face nor arrows are hovered
                hideArrowsTimeout.current = setTimeout(() => {
                  if (!arrowHovered) {
                    setShowArrows(false);
                  }
                }, 200); // Shorter delay since arrows maintain hover
              }
              document.body.style.cursor = 'default';
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
        {/* Show x² in center when net is complete */}
        {faceState.unfolded && isNetComplete && (
          <XSquaredCenter />
        )}
        {/* Unfold arrows when hovering over folded face */}
        {mode === 'net-building' && !faceState.unfolded && showArrows && (
          <UnfoldArrows
            validDirections={possibleDirections}
            onDirectionClick={handleDirectionClick}
            onArrowHover={handleArrowHover}
            onArrowLeave={handleArrowLeave}
          />
        )}
      </group>
    </>
  );
}

// Main Cube Component
function InteractiveCube({
  mode,
  faceStates,
  onUnfold,
  onFoldBack,
  isNetComplete,
}: {
  mode: Mode;
  faceStates: FaceState[];
  onUnfold: (faceIndex: number, direction: Direction) => void;
  onFoldBack: (faceIndex: number) => void;
  isNetComplete: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const worldMatrices = useMemo(() => computeAllWorldMatrices(faceStates), [faceStates]);

  const createsCycle = useCallback(
    (candidateParent: number, faceIndex: number) => {
      let current: number | null = candidateParent;
      while (current !== null) {
        if (current === faceIndex) {
          return true;
        }
        const next: number | null =
          current !== null ? faceStates[current]?.parentFace ?? null : null;
        current = next;
      }
      return false;
    },
    [faceStates]
  );

  // Calculate possible directions for each face
  const getPossibleDirections = (faceIndex: number): Direction[] => {
    if (faceStates[faceIndex].unfolded) return [];

    const configs = HINGE_CONFIG[faceIndex];
    const valid: Direction[] = [];

    DIRECTIONS.forEach(direction => {
      const hinge = configs?.[direction];
      if (!hinge) return;
      if (createsCycle(hinge.parentFaceIndex, faceIndex)) {
        return;
      }
      valid.push(direction);
    });

    return valid;
  };

  return (
    <group ref={groupRef}>
      {FACE_COLORS.map((color, idx) => (
        <InteractiveCubeFace
          key={idx}
          faceIndex={idx}
          color={color}
          mode={mode}
          faceState={faceStates[idx]}
          worldMatrix={worldMatrices[idx]}
          onUnfold={onUnfold}
          onFoldBack={onFoldBack}
          isNetComplete={isNetComplete}
          possibleDirections={getPossibleDirections(idx)}
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

  const mode: Mode = 'net-building'; // Always in net-building mode
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
  const [unfoldHistory, setUnfoldHistory] = useState<number[]>([]); // Track order of unfolded faces
  const [currentTip, setCurrentTip] = useState(0); // Current tip index for tips box
  const [isCompletionClosed, setIsCompletionClosed] = useState(false); // Track if completion popup is closed

  // Smooth mechanical animation for box unfolding
  const animateFace = useCallback((faceIndex: number, targetProgress: number) => {
    const startTime = Date.now();
    const duration = 800; // Consistent duration for both unfold and fold
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-in-out for mechanical motion
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
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

  const handleUnfold = useCallback((faceIndex: number, direction: Direction) => {
    const hinge = HINGE_CONFIG[faceIndex][direction];
    if (!hinge) {
      return;
    }

    setFaceStates(prev => {
      const newStates = [...prev];
      newStates[faceIndex] = {
        ...newStates[faceIndex],
        unfolded: true,
        gridX: 0, // Not used in new system
        gridY: 0, // Not used in new system
        direction,
        parentFace: hinge.parentFaceIndex
      };
      return newStates;
    });

    animateFace(faceIndex, 1);
    setUnfoldHistory(prev => [...prev, faceIndex]);
  }, [animateFace]);

  const handleFoldBack = useCallback((faceIndex: number) => {
    // Allow folding back any unfolded face individually
    setFaceStates(prev => {
      const newStates = [...prev];
      newStates[faceIndex] = {
        ...newStates[faceIndex],
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
  }, [animateFace]);

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

      {/* 3D Canvas */}
      <div className="w-full h-full">
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
            onUnfold={handleUnfold}
            onFoldBack={handleFoldBack}
            isNetComplete={unfoldedCount === 6}
          />
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
            enabled={true}
            minDistance={2}
            maxDistance={15}
          />
        </Canvas>
      </div>
      
      {/* Header */}
      <div className="absolute top-20 left-4 text-gray-800 bg-white/90 px-6 py-3 rounded-lg border border-gray-300 shadow-lg">
        <h1 className="text-2xl font-bold">
          3D Cube - Net Building
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Drag to rotate • Scroll to zoom • Pan to move • Hover faces to see unfold directions
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
          <h3 className="font-bold text-blue-800 mb-2">📦 Box Unfolding</h3>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Independent unfolding:</strong> Open any face at any time
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Hover faces:</strong> See unfolding direction arrows
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Click arrows:</strong> Face rotates 90° around chosen edge
          </p>
          <p className="text-xs text-blue-700 mb-2">
            <strong>Fold back:</strong> Click any unfolded face individually
          </p>
          <p className="text-xs text-blue-600">
            🎯 Like opening flaps on a real cardboard box
          </p>
        </div>


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

        {/* Autoplay Video below tips container */}
       
    </div>
  );
}