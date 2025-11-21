import { useRef, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
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

type CubeNetTip = {
  title: string;
  content: string;
  highlights: string[];
  accent: [string, string];
  icon: string;
  tagline: string;
};

const MMC_COLORS = {
  blushPink: '#fd99c5',
  petalPink: '#feb8d7',
  aquaBlue: '#33d0fb',
  electricBlue: '#23d4ff',
  coralGlow: '#fb67a7',
  deepNavy: '#111432',
  sunshineYellow: '#ffd966',
  energyRed: '#cf2a0e',
} as const;

const PRIMARY_EMPHASIS_COLORS = [MMC_COLORS.energyRed, MMC_COLORS.electricBlue, MMC_COLORS.sunshineYellow] as const;

const createGradient = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightImportantSegments = (text: string, highlights: string[]): ReactNode[] | string => {
  if (!highlights.length) {
    return text;
  }

  const escaped = highlights.map(escapeRegExp).join('|');

  if (!escaped) {
    return text;
  }

  const regex = new RegExp(`(${escaped})`, 'gi');
  let colorIndex = 0;

  return text
    .split(regex)
    .map((segment, idx) => {
      if (!segment) {
        return null;
      }
      const matchesHighlight = highlights.some(
        highlight => highlight.toLowerCase() === segment.toLowerCase()
      );
      if (matchesHighlight) {
        const color = PRIMARY_EMPHASIS_COLORS[colorIndex % PRIMARY_EMPHASIS_COLORS.length];
        colorIndex += 1;
        return (
          <span
            key={`highlight-${segment}-${idx}`}
            style={{ color }}
            className="font-semibold"
          >
            {segment}
          </span>
        );
      }
      return (
        <span key={`text-${segment}-${idx}`}>
          {segment}
        </span>
      );
    })
    .filter(Boolean) as ReactNode[];
};

// Educational tips for cube nets and area calculations
const CUBE_NET_TIPS: CubeNetTip[] = [
  {
    title: "Understanding Cube Nets",
    content: "A cube net is a 2D arrangement of 6 squares that can be folded to form a cube. There are exactly 11 unique ways to arrange these squares, and each one represents a valid cube net. When you complete a net, you're discovering one of these mathematical patterns!",
    highlights: ["cube net", "6 squares", "11 unique ways", "mathematical patterns"],
    icon: "🧩",
    tagline: "See how flat geometry becomes a 3D shape.",
    accent: [MMC_COLORS.blushPink, MMC_COLORS.petalPink]
  },
  {
    title: "Area Formula for a Cube",
    content: "The surface area of a cube is the sum of all 6 faces. If each face has area x², then: Area = x² + x² + x² + x² + x² + x² = 6x². This formula shows that the total surface area is 6 times the area of one face.",
    highlights: ["surface area", "6 faces", "x²", "6x²"],
    icon: "🧮",
    tagline: "Total area = six identical squares.",
    accent: [MMC_COLORS.aquaBlue, MMC_COLORS.electricBlue]
  },
  {
    title: "Why 11 Unique Nets?",
    content: "Mathematically, there are exactly 11 distinct cube nets. This means no matter how you arrange the 6 squares, you'll always end up with one of these 11 patterns. Some arrangements look different but are actually the same when rotated or reflected.",
    highlights: ["11 distinct cube nets", "6 squares", "rotated or reflected"],
    icon: "🔍",
    tagline: "Different layouts can fold into the same cube.",
    accent: [MMC_COLORS.electricBlue, MMC_COLORS.blushPink]
  },
  {
    title: "Valid vs Invalid Nets",
    content: "A valid net must: (1) Have all 6 faces connected edge-to-edge, (2) Not have opposite faces adjacent (they would overlap when folded), and (3) Form a single connected shape. Invalid nets cannot be folded into a cube without overlapping.",
    highlights: ["valid net", "6 faces", "opposite faces", "single connected shape"],
    icon: "✅",
    tagline: "Three quick checks keep your nets correct.",
    accent: [MMC_COLORS.sunshineYellow, MMC_COLORS.blushPink]
  },
  {
    title: "Real-World Applications",
    content: "Understanding cube nets helps in packaging design, architecture, and 3D modeling. Engineers use this knowledge to design boxes, containers, and structures that can be manufactured from flat materials and then folded into 3D shapes.",
    highlights: ["packaging design", "architecture", "3D modeling", "flat materials"],
    icon: "🏗️",
    tagline: "From cardboard boxes to buildings.",
    accent: [MMC_COLORS.aquaBlue, MMC_COLORS.sunshineYellow]
  },
  {
    title: "Visualizing 3D from 2D",
    content: "Building cube nets develops spatial reasoning - the ability to visualize how 2D shapes transform into 3D objects. This skill is essential in geometry, engineering, and design. Practice helps you 'see' the cube even when it's unfolded!",
    highlights: ["spatial reasoning", "2D shapes", "3D objects", "geometry"],
    icon: "🧠",
    tagline: "Train your brain to rotate shapes mentally.",
    accent: [MMC_COLORS.coralGlow, MMC_COLORS.blushPink]
  },
  {
    title: "The Area Calculation",
    content: "When you see x² on each face, remember: x represents the side length of the square. The area of one face is x × x = x². With 6 faces, the total surface area is 6x². This is why we write: x² + x² + x² + x² + x² + x² = 6x².",
    highlights: ["x²", "side length", "6 faces", "6x²"],
    icon: "📏",
    tagline: "Area is just length multiplied by itself.",
    accent: [MMC_COLORS.electricBlue, MMC_COLORS.coralGlow]
  },
  {
    title: "Folding Strategy",
    content: "When building a net, start with one face and build outward. Each new face must be adjacent to an existing face on the actual cube. Think about which faces touch each other on a real cube - this helps you place faces correctly in the net.",
    highlights: ["start with one face", "adjacent", "real cube", "place faces correctly"],
    icon: "🧭",
    tagline: "Grow from the center face and mirror the cube.",
    accent: [MMC_COLORS.energyRed, MMC_COLORS.sunshineYellow]
  }
];

// Cube face size constant
const FACE_SIZE = 1.75; // Reduced from 2.0 for smaller cube
const TOTAL_FACES = FACE_COLORS.length;

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

const MATRIX_POSITION = new THREE.Vector3();
const MATRIX_NORMAL = new THREE.Vector3();
const TEMP_MATRIX3 = new THREE.Matrix3();

function getNormalFromMatrix(matrix: THREE.Matrix4): THREE.Vector3 {
  TEMP_MATRIX3.setFromMatrix4(matrix);
  return MATRIX_NORMAL.set(0, 0, 1).applyMatrix3(TEMP_MATRIX3).normalize().clone();
}

function getPlaneAxesFromMatrix(matrix: THREE.Matrix4) {
  const normal = getNormalFromMatrix(matrix);
  TEMP_MATRIX3.setFromMatrix4(matrix);
  const right = new THREE.Vector3(1, 0, 0).applyMatrix3(TEMP_MATRIX3);
  const projectedRight = right.sub(normal.clone().multiplyScalar(right.dot(normal)));
  const safeRight =
    projectedRight.lengthSq() < 1e-6
      ? new THREE.Vector3(0, 1, 0).cross(normal).normalize()
      : projectedRight.normalize();
  const up = new THREE.Vector3().crossVectors(normal, safeRight).normalize();
  return { normal, right: safeRight, up };
}

type NetCompletionStatus = {
  isComplete: boolean;
  canonicalKey?: string;
};

function evaluateNetCompletion(
  faceStates: FaceState[],
  worldMatrices: THREE.Matrix4[]
): NetCompletionStatus {
  // console.log("evaluateNetCompletion",faceStates.length, TOTAL_FACES, worldMatrices.length, TOTAL_FACES)
  if (faceStates.length !== TOTAL_FACES || worldMatrices.length !== TOTAL_FACES) {
    return { isComplete: false };
  }

  const unfoldFaces = faceStates.filter(state => !state.unfolded) 
  if (unfoldFaces.length===1) {
    return { isComplete: true };
  }

  if (
     faceStates.some(
      state => !state.unfolded || state.animProgress < 0.999 || !state.direction
    )
  ) {
    return { isComplete: false };
  }

  const { normal: planeNormal, right: planeRight, up: planeUp } = getPlaneAxesFromMatrix(
    worldMatrices[0]
  );
  const normals = worldMatrices.map(getNormalFromMatrix);
  const planar = normals.every(
    n => Math.abs(n.dot(planeNormal)) >= 0.999
  );
  if (!planar) {
    return { isComplete: false };
  }

  const tolerance = FACE_SIZE * 0.1;
  const gridMap = new Map<string, number>();

  for (let idx = 0; idx < worldMatrices.length; idx++) {
    const matrix = worldMatrices[idx];
    MATRIX_POSITION.setFromMatrixPosition(matrix);
    const u = MATRIX_POSITION.dot(planeRight);
    const v = MATRIX_POSITION.dot(planeUp);
    const gridX = Math.round(u / FACE_SIZE);
    const gridY = Math.round(v / FACE_SIZE);
    if (
      Math.abs(u - gridX * FACE_SIZE) > tolerance ||
      Math.abs(v - gridY * FACE_SIZE) > tolerance
    ) {
      return { isComplete: false };
    }
    const key = `${gridX},${gridY}`;
    if (gridMap.has(key)) {
      return { isComplete: false };
    }
    gridMap.set(key, idx);
  }

  if (gridMap.size !== TOTAL_FACES) {
    return { isComplete: false };
  }

  const canonicalKey = getCanonicalShapeKey(gridMap);
  if (!VALID_SHAPE_CANONICALS.has(canonicalKey)) {
    if (gridMap.size === TOTAL_FACES) {
      console.debug('[CubeNet] Unknown canonical net shape detected:', canonicalKey);
    }
    return { isComplete: false };
  }

  return { isComplete: true, canonicalKey };
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




// Component to show "x²" in center of face when net is complete
function XSquaredCenter() {
  return (
    <Html
      transform
      position={[0, 0, 0.02]}
      center
      distanceFactor={10}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#0f172a',
          fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
          textShadow: '0 2px 6px rgba(0,0,0,0.35)',
          letterSpacing: '1px',
        }}
      >
        x<sup style={{ fontSize: '18px', fontWeight: 600 }}>2</sup>
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
  possibleDirections,
  netIsComplete,
}: {
  faceIndex: number;
  color: string;
  mode: Mode;
  faceState: FaceState;
  worldMatrix: THREE.Matrix4;
  onUnfold: (faceIndex: number, direction: Direction) => void;
  onFoldBack: (faceIndex: number) => void;
  possibleDirections: Direction[];
    showLabel: boolean;
  netIsComplete:boolean,
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
        {/* Show x² label when the full net is displayed */}
        {/* {showLabel && faceState.unfolded && ( */}
       { netIsComplete?  <XSquaredCenter />: null}
        {/* )} */}
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
  worldMatrices,
  onUnfold,
  onFoldBack,
  showLabels,
  netIsComplete,
}: {
  mode: Mode;
  faceStates: FaceState[];
  worldMatrices: THREE.Matrix4[];
  onUnfold: (faceIndex: number, direction: Direction) => void;
  onFoldBack: (faceIndex: number) => void;
    showLabels: boolean;
  netIsComplete:boolean,
}) {
  const groupRef = useRef<THREE.Group>(null);

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
          possibleDirections={getPossibleDirections(idx)}
          showLabel={showLabels}
          netIsComplete={netIsComplete}
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
    setIsCompletionClosed(false);
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
    setIsCompletionClosed(false);
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
    
    setIsCompletionClosed(false);
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
    setIsCompletionClosed(false);
  }, []);

  const worldMatrices = useMemo(() => computeAllWorldMatrices(faceStates), [faceStates]);
  const netStatus = useMemo(
    () => evaluateNetCompletion(faceStates, worldMatrices),
    [faceStates, worldMatrices]
  );
  const netIsComplete = netStatus.isComplete;
  const currentTipData = CUBE_NET_TIPS[currentTip];
  const highlightedTipContent = useMemo(
    () => highlightImportantSegments(currentTipData.content, currentTipData.highlights),
    [currentTipData]
  );

  // console.log("netIsComplete",netStatus, netIsComplete)
  const unfoldedCount = faceStates.filter(f => f.unfolded).length;
  const progressCount = netIsComplete ? TOTAL_FACES : unfoldedCount;

  const shouldShowCompletion = netIsComplete && !isCompletionClosed;

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
            worldMatrices={worldMatrices}
            onUnfold={handleUnfold}
            onFoldBack={handleFoldBack}
            showLabels={netIsComplete}
            netIsComplete={netIsComplete}
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
      <div
        className="absolute top-16 left-4 w-[420px] max-w-md rounded-3xl overflow-hidden shadow-[0_24px_55px_rgba(17,20,50,0.35)]"
        style={{ background: createGradient(MMC_COLORS.deepNavy, MMC_COLORS.coralGlow) }}
      >
        <div className="relative p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-3xl">
                ✨
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.45em] text-white/60">Immersive Lab</p>
                <h1 className="text-2xl font-black tracking-tight">3D Cube · Net Studio</h1>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
              style={{ backgroundColor: `${MMC_COLORS.aquaBlue}33`, color: MMC_COLORS.sunshineYellow }}
            >
              STEAM
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/90">
            <span style={{ color: MMC_COLORS.sunshineYellow, fontWeight: 600 }}>Drag</span> to explore every face,
            <span style={{ color: MMC_COLORS.electricBlue, fontWeight: 600 }}> orbit</span> to reveal new angles,
            and <span style={{ color: MMC_COLORS.energyRed, fontWeight: 600 }}>hover</span> to preview each fold
            before you commit.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide">
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
              <span role="img" aria-label="Orbit">🌀</span> Orbit
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
              <span role="img" aria-label="Drag">🖱️</span> Drag to Rotate
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
              <span role="img" aria-label="Zoom">🔍</span> Scroll to Zoom
            </span>
            <span
              className="flex items-center gap-2 rounded-full px-3 py-1"
              style={{ backgroundColor: `${MMC_COLORS.sunshineYellow}33`, color: MMC_COLORS.deepNavy }}
            >
              <span role="img" aria-label="Aim">🎯</span> Precision Mode
            </span>
          </div>
        </div>
        <div
          className="h-1 w-full"
          style={{ background: createGradient(MMC_COLORS.aquaBlue, MMC_COLORS.sunshineYellow) }}
        />
      </div>

      {/* Progress Counter */}
        <div
          className="absolute top-16 right-4 w-72 max-w-xs rounded-3xl overflow-hidden shadow-[0_22px_40px_rgba(35,212,255,0.35)]"
          style={{ background: createGradient(MMC_COLORS.aquaBlue, MMC_COLORS.electricBlue) }}
        >
          <div className="relative p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Progress</p>
                <p className="text-3xl font-black leading-tight">{progressCount} / {TOTAL_FACES}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">Faces</span>
                <span className="text-xs text-white/70">{Math.round((progressCount / TOTAL_FACES) * 100)}%</span>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/25">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (progressCount / TOTAL_FACES) * 100)}%`,
                  background: createGradient(MMC_COLORS.sunshineYellow, MMC_COLORS.coralGlow)
                }}
              />
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={handleUndo}
                  disabled={unfoldHistory.length === 0}
                  className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition-transform ${
                    unfoldHistory.length === 0 ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5'
                  }`}
                  style={{
                    background: unfoldHistory.length === 0
                      ? 'rgba(255,255,255,0.2)'
                      : createGradient(MMC_COLORS.coralGlow, MMC_COLORS.energyRed),
                    color: '#fff'
                  }}
                >
                  ↶ Undo
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: '#ffffff', color: MMC_COLORS.deepNavy }}
                >
                  Reset All
                </button>
              </div>
              <button
                onClick={handleFoldToCube}
                disabled={unfoldedCount === 0}
                className={`w-full rounded-2xl px-3 py-3 text-sm font-semibold text-white shadow-lg transition-transform ${
                  unfoldedCount === 0 ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5'
                }`}
                style={{
                  background: createGradient(MMC_COLORS.sunshineYellow, MMC_COLORS.aquaBlue)
                }}
              >
                🎲 Fold to Cube
              </button>
            </div>
          </div>
        </div>
      
      {/* Color Legend */}
      <div className="absolute bottom-4 right-4 w-80 max-w-sm drop-shadow-2xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Palette</p>
              <h2 className="text-lg font-extrabold text-slate-900">Face Moodboard</h2>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase"
              style={{ backgroundColor: `${MMC_COLORS.petalPink}33`, color: MMC_COLORS.coralGlow }}
            >
              6 hues
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {FACE_COLORS.map((color, idx) => (
              <div
                key={`${color}-${idx}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/70 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-2xl border border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{FACE_LABELS[idx]}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{color.toUpperCase()}</p>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: idx % 2 === 0 ? MMC_COLORS.deepNavy : MMC_COLORS.coralGlow }}
                >
                  Layer {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
        <div
          className="absolute bottom-4 left-4 w-72 max-w-xs overflow-hidden rounded-3xl shadow-[0_18px_45px_rgba(255,153,197,0.35)]"
          style={{ background: createGradient(MMC_COLORS.sunshineYellow, MMC_COLORS.petalPink) }}
        >
          <div className="bg-white/80 px-5 py-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Flow</p>
                <h3 className="text-lg font-bold text-slate-900">Box Unfold Ritual</h3>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                <span style={{ color: MMC_COLORS.energyRed, fontWeight: 700 }}>Independent Unfolds:</span> pop any face
                open at the moment inspiration strikes.
              </p>
              <p>
                <span style={{ color: MMC_COLORS.electricBlue, fontWeight: 700 }}>Hover Highlights:</span> follow neon
                arrows to preview the next rotation.
              </p>
              <p>
                <span style={{ color: MMC_COLORS.sunshineYellow, fontWeight: 700 }}>90° Clicks:</span> tap an arrow to
                swing a square with satisfying precision.
              </p>
              <p>
                <span style={{ color: MMC_COLORS.coralGlow, fontWeight: 700 }}>Fold-Back Magic:</span> reattach any panel
                with a single click if you want to reimagine the layout.
              </p>
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600">
              🎯 Think of it as remixing a luxury gift box.
            </p>
          </div>
        </div>


      {/* Completion Message */}
      {shouldShowCompletion && (
        <div
          style={{ zIndex: 23232323, transform: 'translate(-50%, -50%)' }}
          className="absolute top-1/2 left-1/2 w-[440px] max-w-[90vw] overflow-hidden rounded-3xl shadow-[0_30px_60px_rgba(17,23,77,0.4)]"
        >
          <div
            className="relative border border-white/40 px-8 pb-8 pt-10 text-center text-white"
            style={{ background: createGradient(MMC_COLORS.sunshineYellow, MMC_COLORS.coralGlow) }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseCompletion}
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-3xl">
              🎉
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wide">Perfect Net!</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.4em] text-white/80">Geometry unlocked</p>
            <p className="mt-4 text-base text-white/90">
              You just shaped one of the
              <span style={{ color: MMC_COLORS.deepNavy, fontWeight: 700 }}> 11 iconic cube nets</span> — a true spatial victory!
            </p>
            
            {/* Area Formula Display */}
            <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Surface area mantra</p>
              <p className="mt-2 text-lg font-semibold text-white">Area = sum of 6 radiant squares</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1 text-2xl font-black">
                {FACE_COLORS.map((color, idx) => (
                  <span key={`area-${idx}`} style={{ color }}>
                    x<sup className="text-lg">2</sup>
                    {idx < 5 && <span className="mx-1 text-white/80">+</span>}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-2xl font-black text-white">
                = <span style={{ color: MMC_COLORS.deepNavy }}>6x</span>
                <sup className="text-lg text-white/80">2</sup>
              </p>
            </div>
          </div>
        </div>
      )}

        <div className="absolute left-4 top-4 z-20 w-[420px] max-w-md drop-shadow-2xl">
          <div
            className="relative overflow-hidden rounded-3xl border border-white/40 shadow-[0_20px_45px_rgba(15,23,42,0.25)]"
            style={{
              background: `linear-gradient(135deg, ${currentTipData.accent[0]}, ${currentTipData.accent[1]})`
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), transparent 45%)'
              }}
            />
            <div className="relative p-1">
              <div className="rounded-3xl bg-white/95 px-6 py-5 backdrop-blur">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="text-2xl">{currentTipData.icon}</span>
                    Cube Net Tips
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-[11px]"
                    style={{
                      backgroundColor: `${currentTipData.accent[0]}22`,
                      color: currentTipData.accent[0]
                    }}
                  >
                    {currentTip + 1} / {CUBE_NET_TIPS.length}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-xl font-black leading-snug text-slate-900">
                    {currentTipData.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {currentTipData.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-900">
                    {highlightedTipContent}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
                  {PRIMARY_EMPHASIS_COLORS.map((color, idx) => (
                    <span
                      key={color}
                      className="rounded-full px-2 py-1"
                      style={{
                        backgroundColor: `${color}1a`,
                        color
                      }}
                    >
                      {idx === 0 ? 'Primary Red' : idx === 1 ? 'Primary Blue' : 'Primary Yellow'}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={prevTip}
                    aria-label="Show previous tip"
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:text-slate-900"
                  >
                    <span className="text-lg">‹</span>
                    Prev
                  </button>

                  <div className="flex flex-1 items-center justify-center gap-2">
                    {CUBE_NET_TIPS.map((tipEntry, index) => (
                      <span
                        key={tipEntry.title}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: index === currentTip ? '36px' : '10px',
                          backgroundColor:
                            index === currentTip ? currentTipData.accent[0] : '#ffdbe8',
                          opacity: index === currentTip ? 1 : 0.6
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextTip}
                    aria-label="Show next tip"
                    className="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${currentTipData.accent[0]}, ${currentTipData.accent[1]})`
                    }}
                  >
                    Next
                    <span className="text-lg">›</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Autoplay Video below tips container */}
       
    </div>
  );
}