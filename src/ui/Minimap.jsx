import { useEffect, useMemo, useRef, useState } from 'react'
import { player, travel, useGame, IS_TOUCH } from '../state/store'
import { BOUNDS, PITCH, LANE, PLAZA, POND, CAMPFIRE, POIS, isFree, mulberry32, zoneAt } from '../scene/layout'
import { GRAVEYARD } from '../scene/Halloween'
import { HALLOWEEN } from '../season'
import { sfx } from '../audio/sfx'

const W = IS_TOUCH ? 176 : 204
const H = Math.round((W * (BOUNDS.maxZ - BOUNDS.minZ)) / (BOUNDS.maxX - BOUNDS.minX))
const sx = (x) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * W
const sz = (z) => ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * H
// En pantalla el "norte" (−z, hacia donde mira la cámara) queda arriba
const py = (z) => H - sz(z)
const su = (d) => (d / (BOUNDS.maxX - BOUNDS.minX)) * W // metros → píxeles

const ICONS = {
  room: '🏠',
  plaza: '⛲',
  links: '🔗',
  projects: '💼',
  campfire: '🔥',
  pond: '🦆',
  football: '⚽',
  bowling: '🎳',
  graveyard: '🪦',
}

// Puntos de viaje: los del mapa + el cementerio en Halloween
const PLACES = HALLOWEEN
  ? [...POIS, { id: 'graveyard', label: 'Cementerio', x: GRAVEYARD[0] + 0.6, z: GRAVEYARD[1] + 5.4, icon: GRAVEYARD, color: '#ff8a1f' }]
  : POIS

const ZONE_LABELS = {
  'zone-links': 'Enlaces y contacto',
  'zone-projects': 'Proyectos',
  'zone-football': 'Campo de fútbol',
  'zone-bowling': 'Bolera',
  'zone-campfire': 'Hoguera',
  'zone-pond': 'Estanque',
}

function placeName(x, z) {
  if (Math.abs(x) < 4.6 && z > -4.6 && z < 4.6) return 'Habitación'
  const zone = zoneAt(x, z)
  if (zone) return ZONE_LABELS[zone]
  if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 7) return 'Plaza'
  if (HALLOWEEN && Math.hypot(x - GRAVEYARD[0], z - GRAVEYARD[1]) < 5) return 'Cementerio'
  if (Math.abs(x) < 2 && z < -4) return 'Camino'
  return 'Bosque'
}

// ---------- Capa estática (se pinta una sola vez) ----------
function paintStatic(ctx) {
  // Fondo: degradado nocturno
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1d1830')
  bg.addColorStop(1, '#120f1c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Bosque: copas de árbol donde el mapa está libre
  const r = mulberry32(5)
  for (let i = 0; i < 900; i++) {
    const x = BOUNDS.minX + r() * (BOUNDS.maxX - BOUNDS.minX)
    const z = BOUNDS.minZ + r() * (BOUNDS.maxZ - BOUNDS.minZ)
    if (!isFree(x, z, 1.4)) continue
    const tone = r()
    ctx.fillStyle = tone < 0.33 ? 'rgba(61,79,120,0.4)' : tone < 0.66 ? 'rgba(75,63,122,0.36)' : 'rgba(54,90,107,0.36)'
    ctx.beginPath()
    ctx.arc(sx(x), py(z), 1.4 + r() * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let gx = 0; gx < W; gx += 16) {
    ctx.beginPath()
    ctx.moveTo(gx + 0.5, 0)
    ctx.lineTo(gx + 0.5, H)
    ctx.stroke()
  }
  for (let gy = 0; gy < H; gy += 16) {
    ctx.beginPath()
    ctx.moveTo(0, gy + 0.5)
    ctx.lineTo(W, gy + 0.5)
    ctx.stroke()
  }

  // Caminos: borde ancho + línea central discontinua
  const paths = () => {
    ctx.beginPath()
    ctx.moveTo(sx(0), py(-4.5))
    ctx.lineTo(sx(0), py(-39))
    ctx.moveTo(sx(PITCH.x1 + 8), py(-39))
    ctx.lineTo(sx(LANE.x), py(-39))
    ctx.moveTo(sx(-9), py(-22))
    ctx.lineTo(sx(9), py(-22))
    ctx.moveTo(sx(CAMPFIRE[0]), py(CAMPFIRE[1]))
    ctx.lineTo(sx(0), py(-9))
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(232,230,242,0.16)'
  ctx.lineWidth = 6
  paths()
  ctx.setLineDash([3, 4])
  ctx.strokeStyle = 'rgba(232,230,242,0.45)'
  ctx.lineWidth = 1
  paths()
  ctx.setLineDash([])

  // Zonas
  const zone = (x1, x2, z1, z2, fill, stroke) => {
    ctx.fillStyle = fill
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(sx(x1), py(z2), sx(x2) - sx(x1), py(z1) - py(z2), 4)
    ctx.fill()
    ctx.stroke()
  }
  zone(-4.6, 4.6, -4.6, 4.6, 'rgba(217,212,230,0.4)', 'rgba(255,255,255,0.6)')
  zone(-22.5, -8.5, -30, -17, 'rgba(134,239,172,0.14)', 'rgba(134,239,172,0.5)')
  zone(8.5, 23, -30, -17, 'rgba(245,184,74,0.14)', 'rgba(245,184,74,0.5)')
  zone(PITCH.x1, PITCH.x2, PITCH.z1, PITCH.z2, 'rgba(74,222,128,0.28)', 'rgba(74,222,128,0.7)')
  // Líneas del campo
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(sx((PITCH.x1 + PITCH.x2) / 2), py(PITCH.z2), su(3), Math.PI, 0)
  ctx.stroke()
  zone(LANE.x - 1.6, LANE.x + 1.6, LANE.z1, LANE.z2, 'rgba(244,114,182,0.3)', 'rgba(244,114,182,0.75)')

  const circle = ([x, z], r, fill, stroke) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(sx(x), py(z), su(r), 0, Math.PI * 2)
    ctx.fill()
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
  }
  circle(PLAZA, 5.5, 'rgba(139,139,255,0.25)', 'rgba(139,139,255,0.6)')
  circle(POND, 3.8, 'rgba(125,211,252,0.4)', 'rgba(125,211,252,0.7)')
  if (HALLOWEEN) circle(GRAVEYARD, 4.6, 'rgba(255,138,31,0.12)', 'rgba(255,138,31,0.55)')

  // Iconos de cada lugar
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${IS_TOUCH ? 12 : 13}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  // Cada icono va sobre una chapa oscura para que se lea sobre cualquier fondo
  const icon = (id, x, z) => {
    ctx.fillStyle = 'rgba(10,8,18,0.75)'
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(sx(x), py(z), IS_TOUCH ? 9 : 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.fillText(ICONS[id], sx(x), py(z) + 1)
  }
  icon('room', 0, 0)
  icon('plaza', PLAZA[0], PLAZA[1])
  icon('links', -15.5, -23.5)
  icon('projects', 15.75, -23.5)
  icon('campfire', CAMPFIRE[0], CAMPFIRE[1])
  icon('pond', POND[0], POND[1])
  icon('football', (PITCH.x1 + PITCH.x2) / 2, (PITCH.z1 + PITCH.z2) / 2)
  icon('bowling', LANE.x, (LANE.z1 + LANE.z2) / 2)
  if (HALLOWEEN) {
    icon('graveyard', GRAVEYARD[0], GRAVEYARD[1])
    // Calabacitas a lo largo del camino
    ctx.fillStyle = '#ff8a1f'
    for (const [x, z] of [[1.3, -5.3], [1.45, -9.4], [-1.45, -13.4], [1.45, -17.2], [-1.45, -31.5], [1.45, -35.8]]) {
      ctx.beginPath()
      ctx.arc(sx(x), py(z), 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Brújula
  const cx = W - 14
  const cy = 14
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f87171'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 7)
  ctx.lineTo(cx + 3, cy)
  ctx.lineTo(cx - 3, cy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#e8e6f2'
  ctx.font = '700 7px Inter, sans-serif'
  ctx.fillText('N', cx, cy + 4)
}

export default function Minimap() {
  const canvas = useRef()
  const [hover, setHover] = useState(null)
  const [fading, setFading] = useState(false)
  const [where, setWhere] = useState('Habitación')
  const hoverRef = useRef(null)
  hoverRef.current = hover

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

  // La capa estática se pinta una vez en un canvas aparte
  const staticLayer = useMemo(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const c = document.createElement('canvas')
    c.width = W * dpr
    c.height = H * dpr
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    paintStatic(ctx)
    return c
  }, [])

  useEffect(() => {
    if (!open) return
    const ctx = canvas.current.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.current.width = W * dpr
    canvas.current.height = H * dpr
    ctx.scale(dpr, dpr)
    let id
    let lastName = ''
    let frame = 0
    const draw = (now) => {
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(staticLayer, 0, 0, W, H)

      const x = sx(player.position.x)
      const y = py(player.position.z)

      // Barrido de radar centrado en el jugador
      const sweep = (t * 1.4) % (Math.PI * 2)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 46)
      grad.addColorStop(0, HALLOWEEN ? 'rgba(255,138,31,0.22)' : 'rgba(139,139,255,0.22)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, 46, sweep, sweep + 0.7)
      ctx.closePath()
      ctx.fill()

      // Puntos de viaje (el que está bajo el ratón, más grande y con nombre)
      PLACES.forEach((p) => {
        const hovered = p.id === hoverRef.current
        const px = sx(p.x)
        const pz = py(p.z)
        ctx.fillStyle = p.color
        ctx.globalAlpha = hovered ? 1 : 0.85
        ctx.beginPath()
        ctx.arc(px, pz, hovered ? 4.5 : 2.6, 0, Math.PI * 2)
        ctx.fill()
        if (hovered) {
          ctx.strokeStyle = p.color
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(px, pz, 7 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      })

      // Pulso bajo el jugador
      const pulse = (t * 1.2) % 1
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pulse)})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x, y, 4 + pulse * 12, 0, Math.PI * 2)
      ctx.stroke()

      // Cono de visión + flecha según hacia dónde mira
      const a = player.facing
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.PI - a)
      const cone = ctx.createLinearGradient(0, 0, 0, -26)
      cone.addColorStop(0, 'rgba(255,255,255,0.28)')
      cone.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = cone
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-11, -26)
      ctx.lineTo(11, -26)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = HALLOWEEN ? '#ff8a1f' : '#8b8bff'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(0, -7.5)
      ctx.lineTo(5.5, 5.5)
      ctx.lineTo(0, 2.5)
      ctx.lineTo(-5.5, 5.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Nombre del sitio donde está el jugador (sin re-renderizar en cada frame)
      if (++frame % 15 === 0) {
        const name = placeName(player.position.x, player.position.z)
        if (name !== lastName) {
          lastName = name
          setWhere(name)
        }
      }
      id = requestAnimationFrame(draw)
    }
    id = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(id)
  }, [open, staticLayer])

  const poiAt = (e) => {
    const r = canvas.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    const y = ((e.clientY - r.top) / r.height) * H
    let best = null
    let bestD = 16
    PLACES.forEach((p) => {
      const d = Math.hypot(sx(p.x) - x, py(p.z) - y)
      if (d < bestD) {
        best = p
        bestD = d
      }
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

  const hovered = PLACES.find((p) => p.id === hover)

  return (
    <>
      {fading && <div className="fade" />}
      <div className={`minimap ${open ? '' : 'minimap--closed'} ${HALLOWEEN ? 'minimap--halloween' : ''}`}>
        <div className="minimap__head">
          {open && (
            <span className="minimap__where">
              <span className="minimap__dot" /> {where}
            </span>
          )}
          <button className="minimap__toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Ocultar mapa' : 'Mostrar mapa'}>
            {HALLOWEEN ? '🎃 ' : ''}
            {open ? 'Mapa ▾' : 'Mapa ▸'}
          </button>
        </div>
        {open && (
          <>
            <canvas
              ref={canvas}
              style={{ width: W, height: H }}
              onPointerMove={(e) => setHover(poiAt(e)?.id ?? null)}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => go(poiAt(e))}
            />
            <p className="minimap__label">{hovered ? `Ir a ${hovered.label}` : 'Toca un punto o un icono para viajar'}</p>
            <div className="minimap__places" style={{ width: W }}>
              {PLACES.map((p) => (
                <button
                  key={p.id}
                  className={`minimap__place ${hover === p.id ? 'is-hover' : ''}`}
                  title={p.label}
                  aria-label={`Viajar a ${p.label}`}
                  onPointerEnter={() => setHover(p.id)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => go(p)}
                >
                  {ICONS[p.id]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
