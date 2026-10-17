import { useEffect, useRef, useState } from 'react'
import { player, travel, useGame } from '../state/store'
import { BOUNDS, PITCH, LANE, PLAZA, POND, CAMPFIRE, POIS } from '../scene/layout'
import { sfx } from '../audio/sfx'

const W = 168
const H = Math.round((W * (BOUNDS.maxZ - BOUNDS.minZ)) / (BOUNDS.maxX - BOUNDS.minX))
const sx = (x) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * W
const sz = (z) => ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * H
// En pantalla el "norte" (−z, hacia donde mira la cámara) queda arriba
const py = (z) => H - sz(z)

export default function Minimap() {
  const canvas = useRef()
  const [hover, setHover] = useState(null)
  const [fading, setFading] = useState(false)
  // En pantallas bajas (móvil en horizontal) el mapa empieza cerrado: si no, tapa el juego y los botones
  const isShort = () => window.innerWidth <= 640 || window.innerHeight <= 500
  const [open, setOpen] = useState(() => !isShort())

  // Al girar el móvil a horizontal se cierra solo (se puede volver a abrir con el botón)
  useEffect(() => {
    let wasShort = isShort()
    const onResize = () => {
      const short = isShort()
      if (short && !wasShort) setOpen(false)
      wasShort = short
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    const ctx = canvas.current.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.current.width = W * dpr
    canvas.current.height = H * dpr
    ctx.scale(dpr, dpr)
    let id
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      // Caminos
      ctx.strokeStyle = 'rgba(232,230,242,0.22)'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(sx(0), py(-4.5)); ctx.lineTo(sx(0), py(-39))
      ctx.moveTo(sx(PITCH.x1 + 8), py(-39)); ctx.lineTo(sx(LANE.x), py(-39))
      ctx.moveTo(sx(-9), py(-22)); ctx.lineTo(sx(9), py(-22))
      ctx.stroke()
      // Zonas
      const rect = (x1, x2, z1, z2, fill) => {
        ctx.fillStyle = fill
        ctx.fillRect(sx(x1), py(z2), sx(x2) - sx(x1), py(z1) - py(z2))
      }
      rect(-4.6, 4.6, -4.6, 4.6, 'rgba(217,212,230,0.55)')
      rect(-22.5, -8.5, -30, -17, 'rgba(134,239,172,0.18)')
      rect(8.5, 23, -30, -17, 'rgba(245,184,74,0.18)')
      rect(PITCH.x1, PITCH.x2, PITCH.z1, PITCH.z2, 'rgba(74,222,128,0.35)')
      rect(LANE.x - 1.6, LANE.x + 1.6, LANE.z1, LANE.z2, 'rgba(244,114,182,0.35)')
      const circle = ([x, z], r, fill) => {
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.arc(sx(x), py(z), (r / (BOUNDS.maxX - BOUNDS.minX)) * W, 0, Math.PI * 2)
        ctx.fill()
      }
      circle(PLAZA, 5.5, 'rgba(139,139,255,0.35)')
      circle(POND, 3.8, 'rgba(125,211,252,0.45)')
      circle(CAMPFIRE, 1.2, 'rgba(255,154,60,0.7)')
      // Puntos de interés
      POIS.forEach((p) => {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(sx(p.x), py(p.z), p.id === hover ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fill()
      })
      // Jugador (flecha según hacia dónde mira)
      const a = player.facing
      const x = sx(player.position.x)
      const y = py(player.position.z)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.PI - a)
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#8b8bff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(-5, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(id)
  }, [open, hover])

  const poiAt = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    let best = null
    let bestD = 14
    POIS.forEach((p) => {
      const d = Math.hypot(sx(p.x) - x, py(p.z) - y)
      if (d < bestD) { best = p; bestD = d }
    })
    return best
  }

  const go = (p) => {
    if (!p || fading) return
    sfx.open()
    setFading(true)
    setTimeout(() => {
      travel.to?.(p.x, p.z)
      if (isShort()) setOpen(false) // en horizontal, cerrar el mapa para dejar libres los botones
      useGame.getState().setActive(null)
    }, 280)
    setTimeout(() => setFading(false), 620)
  }

  const hovered = POIS.find((p) => p.id === hover)

  return (
    <>
      {fading && <div className="fade" />}
      <div className={`minimap ${open ? '' : 'minimap--closed'}`}>
        <button className="minimap__toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Ocultar mapa' : 'Mostrar mapa'}>
          {open ? 'Mapa ▾' : 'Mapa ▸'}
        </button>
        {open && (
          <>
            <canvas
              ref={canvas}
              style={{ width: W, height: H }}
              onPointerMove={(e) => setHover(poiAt(e)?.id ?? null)}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => go(poiAt(e))}
            />
            <p className="minimap__label">{hovered ? `Ir a ${hovered.label}` : 'Toca un punto para viajar'}</p>
          </>
        )}
      </div>
    </>
  )
}
