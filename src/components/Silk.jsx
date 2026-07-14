import React, { useEffect, useRef } from 'react'

/**
 * Silk Background Component
 * Inspired by ReactBits Silk-JS-CSS
 * Creates an animated flowing gradient background with organic orb movement.
 */
export default function Silk({ 
  color = '#7620BF', 
  speed = 1, 
  opacity = 0.12,
  className = '' 
}) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w, h
    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Parse hex color to RGB
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    // Define organic orbs
    const orbs = [
      { x: 0.3, y: 0.2, radius: 0.45, phase: 0, speedX: 0.4, speedY: 0.3 },
      { x: 0.7, y: 0.8, radius: 0.55, phase: 2, speedX: 0.3, speedY: 0.5 },
      { x: 0.5, y: 0.5, radius: 0.35, phase: 4, speedX: 0.5, speedY: 0.2 },
      { x: 0.2, y: 0.7, radius: 0.4, phase: 1, speedX: 0.35, speedY: 0.45 },
    ]

    const animate = (time) => {
      const t = time * 0.001 * speed
      ctx.clearRect(0, 0, w, h)

      for (const orb of orbs) {
        const cx = (orb.x + Math.sin(t * orb.speedX + orb.phase) * 0.15) * w
        const cy = (orb.y + Math.cos(t * orb.speedY + orb.phase) * 0.15) * h
        const rad = orb.radius * Math.min(w, h)

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`)
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.4})`)
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [color, speed, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      style={{ filter: 'blur(60px)' }}
    />
  )
}
