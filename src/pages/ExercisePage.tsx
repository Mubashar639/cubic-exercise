import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import '../App.css'


interface Point {
  x: number
  y: number
}

interface CircleState {
  center: Point
  radius: number
  rotation: number
  pointA: Point
  pointB: Point
  pointC: Point
  diameterOffset: number
  circumferenceOffset: number
}

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 500
const CIRCLE_RADIUS = 150
const POINT_RADIUS = 8

const THEOREM_INFO: Record<string, { title: string; subtitle: string; tips: Array<{ title: string; content: string }> }> = {
  'angle-in-semicircle': {
    title: 'Circle Theorem 5 - Angle In A SemiCircle',
    subtitle: 'Drag the points on the circle',
    tips: [
      {
        title: "Introduction to the theorem",
        content: "The angle in a semicircle is always 90°. This fundamental theorem states that any angle formed by drawing lines from the endpoints of a diameter to any point on the circumference will always be a right angle."
      },
      {
        title: "Why it's often overlooked",
        content: "It's the most unrecognized theorem yet easiest to spot. Many students miss this theorem because they don't recognize the pattern of a diameter forming a triangle with a point on the circumference."
      },
      {
        title: "How to spot it",
        content: "Look for a diameter and see if it forms a triangle. When you see a circle with a diameter drawn, check if there's a third point on the circumference that creates a triangle - if so, the angle at that point is 90°."
      },
      {
        title: "Exam keywords requirement",
        content: "When explaining this theorem in an exam you must use the keywords: 'The angle in a semicircle is 90°'. Examiners look for this specific phrasing to award marks."
      },
      {
        title: "Mathematical proof concept",
        content: "Based on the fact that the diameter subtends a right angle. The proof relies on the property that the angle at the center is twice the angle at the circumference, and since the diameter creates a 180° angle at the center, the angle at the circumference must be 90°."
      },
      {
        title: "Real-world applications",
        content: "Used in construction, engineering, and navigation. This theorem helps in creating right angles without measuring tools, designing circular structures, and solving navigation problems involving circular paths."
      },
      {
        title: "Common mistakes to avoid",
        content: "Don't confuse with other circle theorems. Remember: this theorem specifically requires a diameter (not just any chord) and the angle must be at the circumference, not at the center."
      },
      {
        title: "Practice tips",
        content: "Always check for diameter first when solving circle problems. If you see a diameter in a circle problem, immediately check if it forms a triangle with a point on the circumference - this could be your key to solving the problem quickly."
      }
    ]
  },
  'angles-in-same-segment': {
    title: 'Circle Theorem 1 - Angles In The Same Segment',
    subtitle: 'Coming soon - Interactive exercise under development',
    tips: [
      {
        title: "Introduction",
        content: "Angles in the same segment are equal. This theorem states that angles subtended by the same arc at the circumference are equal."
      }
    ]
  },
  'angle-at-center': {
    title: 'Circle Theorem 2 - Angle At The Center',
    subtitle: 'Coming soon - Interactive exercise under development',
    tips: [
      {
        title: "Introduction",
        content: "The angle at the center is twice the angle at the circumference. This fundamental relationship connects central and inscribed angles."
      }
    ]
  },
  'opposite-angles-cyclic-quadrilateral': {
    title: 'Circle Theorem 3 - Opposite Angles In Cyclic Quadrilateral',
    subtitle: 'Coming soon - Interactive exercise under development',
    tips: [
      {
        title: "Introduction",
        content: "Opposite angles in a cyclic quadrilateral sum to 180°. This theorem helps identify and work with quadrilaterals inscribed in circles."
      }
    ]
  },
  'tangent-and-radius': {
    title: 'Circle Theorem 4 - Tangent And Radius',
    subtitle: 'Coming soon - Interactive exercise under development',
    tips: [
      {
        title: "Introduction",
        content: "A tangent is perpendicular to the radius at the point of contact. This creates right angles in tangent problems."
      }
    ]
  },
  'alternate-segment-theorem': {
    title: 'Circle Theorem 6 - Alternate Segment Theorem',
    subtitle: 'Coming soon - Interactive exercise under development',
    tips: [
      {
        title: "Introduction",
        content: "The angle between a tangent and a chord equals the angle in the alternate segment. This theorem connects tangents and inscribed angles."
      }
    ]
  }
}

export default function ExercisePage() {
  const location = useLocation()
  const pathname = location.pathname
  const activeTheoremId = pathname === '/exercise' 
    ? 'angle-in-semicircle' 
    : pathname.substring(1) || 'angle-in-semicircle'
  const theoremInfo = THEOREM_INFO[activeTheoremId] || THEOREM_INFO['angle-in-semicircle']
  const EDUCATIONAL_TIPS = theoremInfo.tips
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [currentTip, setCurrentTip] = useState(0)
  const [circleState, setCircleState] = useState<CircleState>({
    center: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    radius: CIRCLE_RADIUS,
    rotation: 0,
    pointA: { x: CANVAS_WIDTH / 2 - CIRCLE_RADIUS, y: CANVAS_HEIGHT / 2 },
    pointB: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 - CIRCLE_RADIUS + CIRCLE_RADIUS + CIRCLE_RADIUS },
    pointC: { x: CANVAS_WIDTH / 2 + CIRCLE_RADIUS, y: CANVAS_HEIGHT / 2 },
    diameterOffset: 0.5,
    circumferenceOffset: 0.5
  })

  // Get point on circle at angle
  const getPointOnCircle = (center: Point, radius: number, angle: number): Point => {
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    }
  }

  // Constrain point A or C to circumference (anywhere on the circle)
  const constrainToCircumference = (point: Point, center: Point, radius: number): Point => {
    const dx = point.x - center.x
    const dy = point.y - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // If point is at center or very close, return a default position
    if (distance < 0.1) {
      return getPointOnCircle(center, radius, 0)
    }
    
    // Normalize to circle radius to keep point on circumference
    const angle = Math.atan2(dy, dx)
    return getPointOnCircle(center, radius, angle)
  }

  // Constrain point B to semicircle arc
  const constrainToSemicircle = (point: Point, center: Point, radius: number, rotation: number, currentB?: Point, pointA?: Point, pointC?: Point): Point => {
    const dx = point.x - center.x
    const dy = point.y - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // If point is at center or very close, use current B position or default
    if (distance < 0.1) {
      if (currentB) {
        const bDx = currentB.x - center.x
        const bDy = currentB.y - center.y
        const bAngle = Math.atan2(bDy, bDx)
        return getPointOnCircle(center, radius, bAngle)
      }
      return getPointOnCircle(center, radius, rotation + Math.PI / 2)
    }
    
    // Calculate the angle of the mouse position
    const mouseAngle = Math.atan2(dy, dx)
    
    // The diameter goes from rotation (point A) to rotation + π (point C)
    // We want B to be on the semicircle above the diameter (from rotation to rotation + π)
    const diameterStartAngle = rotation
    
    // Calculate relative angle from diameter start
    let relativeAngle = mouseAngle - diameterStartAngle
    
    // Normalize to -π to π
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI
    
    // Constrain to upper semicircle (0 to π relative to diameter start)
    // But keep a larger margin from the endpoints to prevent snapping to A or C
    const margin = 0.15 // Larger margin in radians (~8.6 degrees) to prevent snapping
    if (relativeAngle < margin) {
      relativeAngle = margin // Keep away from point A
    } else if (relativeAngle > Math.PI - margin) {
      relativeAngle = Math.PI - margin // Keep away from point C
    }
    
    const finalAngle = diameterStartAngle + relativeAngle
    const constrainedPoint = getPointOnCircle(center, radius, finalAngle)
    
    // Additional check: if the constrained point is too close to C, move it away
    if (pointA && pointC) {
      const angleA = Math.atan2(pointA.y - center.y, pointA.x - center.x)
      const constrainedAngle = Math.atan2(constrainedPoint.y - center.y, constrainedPoint.x - center.x)
      
      // Normalize angles for comparison
      let normalizedConstrained = constrainedAngle - angleA
      while (normalizedConstrained > Math.PI) normalizedConstrained -= 2 * Math.PI
      while (normalizedConstrained < -Math.PI) normalizedConstrained += 2 * Math.PI
      
      // If too close to C (within 0.2 radians), push it away
      if (normalizedConstrained > Math.PI - 0.2) {
        relativeAngle = Math.PI - 0.2
        return getPointOnCircle(center, radius, diameterStartAngle + relativeAngle)
      }
    }
    
    return constrainedPoint
  }

  // Draw the diagram
  const drawDiagram = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const { center, radius, rotation, pointA, pointB, pointC } = circleState

    // Draw semicircle arc (yellow)
    ctx.save()
    ctx.translate(center.x, center.y)
    ctx.rotate(rotation)
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI)
    ctx.strokeStyle = '#FFEB3B'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()

    // Draw full circle outline (black, thin)
    ctx.beginPath()
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw diameter line
    ctx.beginPath()
    ctx.moveTo(pointA.x, pointA.y)
    ctx.lineTo(pointC.x, pointC.y)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw triangle
    ctx.beginPath()
    ctx.moveTo(pointA.x, pointA.y)
    ctx.lineTo(pointB.x, pointB.y)
    ctx.lineTo(pointC.x, pointC.y)
    ctx.closePath()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Draw angle indicator at point B (pink square for right angle)
    const v1 = { x: pointA.x - pointB.x, y: pointA.y - pointB.y }
    const v2 = { x: pointC.x - pointB.x, y: pointC.y - pointB.y }
    const angle1 = Math.atan2(v1.y, v1.x)
    const angle2 = Math.atan2(v2.y, v2.x)
    const avgAngle = (angle1 + angle2) / 2
    
    // Draw right angle square indicator
    const indicatorSize = 12
    ctx.save()
    ctx.translate(pointB.x, pointB.y)
    ctx.rotate(angle1)
    ctx.fillStyle = '#FF69B4'
    ctx.strokeStyle = '#FF69B4'
    ctx.lineWidth = 2
    // Draw square in the corner
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(indicatorSize, 0)
    ctx.lineTo(indicatorSize, indicatorSize)
    ctx.lineTo(0, indicatorSize)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Draw angle label (90°)
    ctx.fillStyle = '#FF69B4'
    ctx.font = 'bold 16px Arial'
    const labelX = pointB.x + Math.cos(avgAngle) * 25
    const labelY = pointB.y + Math.sin(avgAngle) * 25
    ctx.fillText('90°', labelX, labelY)

    // Draw center point O
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(center.x, center.y, 4, 0, 2 * Math.PI)
    ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.font = '14px Arial'
    ctx.fillText('O', center.x + 10, center.y - 10)

    // Draw points A, B, C (red)
    const points = [
      { point: pointA, label: 'A' },
      { point: pointB, label: 'B' },
      { point: pointC, label: 'C' }
    ]

    points.forEach(({ point, label }) => {
      ctx.fillStyle = '#DC2626'
      ctx.beginPath()
      ctx.arc(point.x, point.y, POINT_RADIUS, 0, 2 * Math.PI)
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
      
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 14px Arial'
      const labelOffset = label === 'B' ? -20 : label === 'A' ? -15 : 15
      ctx.fillText(label, point.x + labelOffset, point.y - 10)
    })
  }

  useEffect(() => {
    drawDiagram()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleState])

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const point = { x, y }

    // Use a larger threshold for better click detection
    const threshold = POINT_RADIUS * 3
    
    // Calculate distances to all points
    const distToB = Math.sqrt(
      Math.pow(point.x - circleState.pointB.x, 2) + 
      Math.pow(point.y - circleState.pointB.y, 2)
    )
    const distToA = Math.sqrt(
      Math.pow(point.x - circleState.pointA.x, 2) + 
      Math.pow(point.y - circleState.pointA.y, 2)
    )
    const distToC = Math.sqrt(
      Math.pow(point.x - circleState.pointC.x, 2) + 
      Math.pow(point.y - circleState.pointC.y, 2)
    )

    // Check each point individually with threshold (prioritize exact matches)
    if (distToB < threshold && distToB <= distToA && distToB <= distToC) {
      setIsDragging('B')
    } else if (distToA < threshold && distToA <= distToC) {
      setIsDragging('A')
    } else if (distToC < threshold) {
      setIsDragging('C')
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newPoint = { x, y }

    setCircleState(prev => {
      const { center, radius, rotation } = prev
      const updatedState = { ...prev }

      if (isDragging === 'A') {
        updatedState.pointA = constrainToCircumference(newPoint, center, radius)
        // Keep point C on opposite side of circumference (maintain diameter)
        const angle = Math.atan2(updatedState.pointA.y - center.y, updatedState.pointA.x - center.x)
        updatedState.pointC = getPointOnCircle(center, radius, angle + Math.PI)
        // Update rotation to match new diameter orientation
        updatedState.rotation = angle
        // Keep point B on the semicircle relative to new diameter
        const currentBAngle = Math.atan2(prev.pointB.y - center.y, prev.pointB.x - center.x)
        const relativeBAngle = currentBAngle - prev.rotation
        const newBAngle = angle + relativeBAngle
        // Ensure B stays in upper semicircle
        let normalizedBAngle = newBAngle - angle
        while (normalizedBAngle > Math.PI) normalizedBAngle -= 2 * Math.PI
        while (normalizedBAngle < -Math.PI) normalizedBAngle += 2 * Math.PI
        if (normalizedBAngle < 0) normalizedBAngle = 0
        if (normalizedBAngle > Math.PI) normalizedBAngle = Math.PI
        updatedState.pointB = getPointOnCircle(center, radius, angle + normalizedBAngle)
      } else if (isDragging === 'C') {
        updatedState.pointC = constrainToCircumference(newPoint, center, radius)
        // Keep point A on opposite side of circumference (maintain diameter)
        const angle = Math.atan2(updatedState.pointC.y - center.y, updatedState.pointC.x - center.x)
        updatedState.pointA = getPointOnCircle(center, radius, angle + Math.PI)
        // Update rotation to match new diameter orientation
        updatedState.rotation = angle
        // Keep point B on the semicircle relative to new diameter
        const currentBAngle = Math.atan2(prev.pointB.y - center.y, prev.pointB.x - center.x)
        const relativeBAngle = currentBAngle - prev.rotation
        const newBAngle = angle + relativeBAngle
        // Ensure B stays in upper semicircle
        let normalizedBAngle = newBAngle - angle
        while (normalizedBAngle > Math.PI) normalizedBAngle -= 2 * Math.PI
        while (normalizedBAngle < -Math.PI) normalizedBAngle += 2 * Math.PI
        if (normalizedBAngle < 0) normalizedBAngle = 0
        if (normalizedBAngle > Math.PI) normalizedBAngle = Math.PI
        updatedState.pointB = getPointOnCircle(center, radius, angle + normalizedBAngle)
      } else if (isDragging === 'B') {
        // When dragging B, use the current rotation value (don't change it)
        // Pass current B position and A/C to prevent jumping to C
        const constrainedB = constrainToSemicircle(newPoint, center, radius, rotation, prev.pointB, prev.pointA, prev.pointC)
        updatedState.pointB = constrainedB
        // Don't modify A or C when dragging B
      }

      return updatedState
    })
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  // Generate random triangle
  const generateRandomTriangle = () => {
    const { center, radius, rotation } = circleState
    const randomAngle = Math.random() * Math.PI // Random angle in upper semicircle
    const randomDiameterOffset = (Math.random() - 0.5) * 0.3 // Small random offset
    
    const newRotation = rotation + randomDiameterOffset
    const angleA = newRotation
    const angleC = newRotation + Math.PI
    const angleB = newRotation + randomAngle

    setCircleState(prev => ({
      ...prev,
      rotation: newRotation,
      pointA: getPointOnCircle(center, radius, angleA),
      pointB: getPointOnCircle(center, radius, angleB),
      pointC: getPointOnCircle(center, radius, angleC)
    }))
  }

  // Handle slider changes
  const handleDiameterSlider = (value: number) => {
    const offset = (value - 0.5) * 0.5 // -0.25 to 0.25
    setCircleState(prev => {
      const { center, radius, rotation } = prev
      const newRotation = rotation + offset
      const angleA = newRotation
      const angleC = newRotation + Math.PI
      
      return {
        ...prev,
        rotation: newRotation,
        diameterOffset: value,
        pointA: getPointOnCircle(center, radius, angleA),
        pointC: getPointOnCircle(center, radius, angleC)
      }
    })
  }

  const handleCircumferenceSlider = (value: number) => {
    setCircleState(prev => {
      const { center, radius, rotation } = prev
      const angle = rotation + (value * Math.PI) // 0 to π
      
      return {
        ...prev,
        circumferenceOffset: value,
        pointB: getPointOnCircle(center, radius, angle)
      }
    })
  }

  const handleRotateSlider = (value: number) => {
    const rotationAngle = (value - 0.5) * 2 * Math.PI // Full rotation
    setCircleState(prev => {
      const { center, radius } = prev
      const angleA = rotationAngle
      const angleC = rotationAngle + Math.PI
      const currentBAngle = Math.atan2(prev.pointB.y - center.y, prev.pointB.x - center.x)
      const relativeBAngle = currentBAngle - prev.rotation
      const angleB = rotationAngle + relativeBAngle
      
      return {
        ...prev,
        rotation: rotationAngle,
        pointA: getPointOnCircle(center, radius, angleA),
        pointB: getPointOnCircle(center, radius, angleB),
        pointC: getPointOnCircle(center, radius, angleC)
      }
    })
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
          <p className="text-sm text-pink-400 mb-1">Interactive Learning</p>
          <h1 className="text-4xl font-bold text-black mb-2">{theoremInfo.title}</h1>
          <p className="text-red-600 italic">{theoremInfo.subtitle}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Canvas Diagram */}
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-gray-300 rounded-lg cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Right: Information Box */}
          <div className="flex-1 flex flex-col items-center">
            <div className="bg-white border-2 border-black rounded-lg p-6 w-full max-w-md relative">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevTip}
                  className="text-2xl font-bold text-black hover:text-pink-500 transition-colors"
                >
                  ‹
                </button>
                <h2 className="text-xl font-bold text-black">Don't Miss This Theorem</h2>
                <button
                  onClick={nextTip}
                  className="text-2xl font-bold text-black hover:text-pink-500 transition-colors"
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
                      index === currentTip ? 'bg-pink-500' : 'bg-pink-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={generateRandomTriangle}
              className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black font-medium rounded-lg transition-colors"
            >
              Generate Random Triangle
            </button>

            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-black w-32">move diameter</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={circleState.diameterOffset}
                  onChange={(e) => handleDiameterSlider(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-blue"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-black w-32">move circumference</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={circleState.circumferenceOffset}
                  onChange={(e) => handleCircumferenceSlider(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider-purple"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-black w-32">rotate circle</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={(circleState.rotation / (2 * Math.PI)) + 0.5}
                  onChange={(e) => handleRotateSlider(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider-black"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

