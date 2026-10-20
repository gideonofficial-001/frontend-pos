import { useMemo } from 'react'

export const ObsidianParticles = () => {
  // Generate 36 particles with staggered positions and delays so they are immediately visible
  const particles = useMemo(() => {
    return Array.from({ length: 36 }).map((_, i) => {
      const left = Math.round(((i * 2.8) + (i % 7) * 3.7) % 100)
      const size = 2.5 + ((i % 4) * 1.2) // 2.5px to 6.1px
      const duration = 7 + ((i * 1.3) % 9) // 7s to 16s
      const delay = -((i * 1.7) % 16) // negative delay so they start across the screen instantly
      const driftDuration = 3 + (i % 4)
      const opacity = 0.45 + ((i % 5) * 0.1) // 0.45 to 0.85
      const color = i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#22d3ee' : '#4ea8ff'

      return {
        id: i,
        left: `${left}%`,
        size: `${size}px`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        driftDuration: `${driftDuration}s`,
        opacity,
        color,
      }
    })
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Floating dual ambient glow matching sleek-tech style.css */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.14), transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(34, 211, 238, 0.16), transparent 50%),
            radial-gradient(circle at 50% 15%, rgba(14, 165, 233, 0.12), transparent 40%)
          `,
          animation: 'obsidianAmbientFloat 12s infinite alternate ease-in-out',
        }}
      />

      {/* Floating upward glowing particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
            opacity: p.opacity,
            animation: `obsidianFloatUp ${p.duration} linear infinite, obsidianDrift ${p.driftDuration} ease-in-out infinite alternate`,
            animationDelay: `${p.delay}, ${p.delay}`,
          }}
        />
      ))}
    </div>
  )
}
