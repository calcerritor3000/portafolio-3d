import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { useGame, openUrl } from '../state/store'
import { theme } from '../theme'
import { Label, Board, Interactable } from './common'

const W = 6.2
const H = 2.9
const SCREEN_W = 2.6
const SCREEN_H = 1.625
const damp = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt))

// Cartel de proyecto: captura (o ilustración) a la izquierda que "salta" hacia ti al acercarte
export default function ProjectBoard({ project: p, position }) {
  const id = `project-${p.id}`
  const isActive = useGame((s) => s.active?.id === id)
  const screen = useRef()
  const glow = useRef()
  const shine = useRef()
  const st = useRef({ k: 0, sweep: 2 })
  const left = -W / 2 + 0.25
  const textX = left + SCREEN_W + 0.35
  const textW = W / 2 - textX - 0.2

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const s = st.current
    const prev = s.k
    s.k = damp(s.k, isActive ? 1 : 0, 7, dt)
    if (isActive && prev < 0.05) s.sweep = 0
    s.sweep = Math.min(2, s.sweep + dt * 1.4)
    if (screen.current) {
      screen.current.position.z = 0.04 + s.k * 0.42
      screen.current.position.y = s.k * 0.12
      screen.current.rotation.y = s.k * 0.14
      screen.current.rotation.x = -s.k * 0.06
      screen.current.scale.setScalar(1 + s.k * 0.12)
    }
    if (glow.current) glow.current.opacity = 0.25 + s.k * 0.75
    if (shine.current) {
      shine.current.position.x = -SCREEN_W / 2 + s.sweep * SCREEN_W * 0.75
      shine.current.material.opacity = s.sweep < 1.6 ? 0.22 * Math.sin((s.sweep / 1.6) * Math.PI) : 0
    }
  })

  const actions = [
    p.demo && { key: 'E', label: 'Probar demo', run: () => openUrl(p.demo) },
    p.code && { key: p.demo ? 'R' : 'E', label: 'Ver código', run: () => openUrl(p.code) },
  ].filter(Boolean)

  return (
    <group>
      <Board position={position} width={W} height={H} base={0.7}>
        {/* Pantalla con la captura */}
        <group position={[left + SCREEN_W / 2, 0.15, 0]}>
          <group ref={screen}>
            <mesh position-z={-0.02}>
              <planeGeometry args={[SCREEN_W + 0.16, SCREEN_H + 0.16]} />
              <meshBasicMaterial ref={glow} color={theme.accent} transparent opacity={0.25} toneMapped={false} />
            </mesh>
            <mesh position-z={-0.01}>
              <planeGeometry args={[SCREEN_W + 0.08, SCREEN_H + 0.08]} />
              <meshBasicMaterial color="#0d0b14" />
            </mesh>
            <Suspense fallback={<PlaceholderScreen />}>{p.image ? <ImageScreen url={p.image} /> : <ArtScreen project={p} />}</Suspense>
            <mesh ref={shine} position-z={0.005} rotation-z={-0.35}>
              <planeGeometry args={[0.35, SCREEN_H * 1.5]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
          <Label weight="regular" fontSize={0.09} color={theme.textMuted} position={[0, -SCREEN_H / 2 - 0.2, 0]}>
            {p.image ? 'Captura real de la demo' : 'Ilustración · sin captura disponible'}
          </Label>
        </group>

        {/* Texto */}
        <Label weight="regular" fontSize={0.13} color={theme.accent} anchorX="left" anchorY="top" position={[textX, 1.26, 0]} maxWidth={textW}>
          {p.featured ? `DESTACADA · ${p.kind}` : p.kind}
        </Label>
        <Label fontSize={0.32} anchorX="left" anchorY="top" position={[textX, 1.04, 0]} maxWidth={textW}>
          {p.title}
        </Label>
        <Label weight="regular" fontSize={0.135} color="#cfcbe0" anchorX="left" anchorY="top" lineHeight={1.4} position={[textX, 0.56, 0]} maxWidth={textW}>
          {p.summary}
        </Label>
        <Label weight="mono" fontSize={0.105} color={theme.textMuted} anchorX="left" anchorY="bottom" position={[textX, -0.98, 0]} maxWidth={textW} lineHeight={1.4}>
          {p.tech.join(' · ')}
        </Label>
        <Label weight="regular" fontSize={0.11} color={p.note ? theme.textMuted : '#86efac'} anchorX="left" anchorY="bottom" position={[textX, -1.3, 0]} maxWidth={textW}>
          {p.note ?? (p.demo ? 'Demo en vivo y código disponibles' : 'Código disponible')}
        </Label>
      </Board>
      <Interactable
        id={id}
        position={[position[0], 1, position[2] + 1.8]}
        size={[2.2, 1, 0.9]}
        title={p.title}
        subtitle={p.note ?? p.kind}
        actions={actions}
      />
    </group>
  )
}

function PlaceholderScreen() {
  return (
    <mesh>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial color="#1f1a2b" />
    </mesh>
  )
}

function ImageScreen({ url }) {
  const tex = useTexture(url)
  tex.colorSpace = SRGBColorSpace
  return (
    <mesh>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  )
}

// Ilustración generada (sin imágenes externas) para proyectos sin captura
function ArtScreen({ project: p }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 640
    c.height = 400
    const g = c.getContext('2d')
    const grad = g.createLinearGradient(0, 0, 640, 400)
    grad.addColorStop(0, '#221b36')
    grad.addColorStop(1, '#141020')
    g.fillStyle = grad
    g.fillRect(0, 0, 640, 400)
    g.strokeStyle = 'rgba(139,139,255,0.12)'
    for (let x = 0; x < 640; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 400); g.stroke() }
    for (let y = 0; y < 400; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(640, y); g.stroke() }
    const cx = 200
    const cy = 200
    if (p.art === 'qr') {
      // Patrón tipo QR determinista
      const s = 14
      let seed = 7
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
      g.fillStyle = '#e8e6f2'
      g.fillRect(cx - 120, cy - 120, 240, 240)
      g.fillStyle = '#141020'
      for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) if (rnd() > 0.52) g.fillRect(cx - 105 + i * s, cy - 105 + j * s, s, s)
      ;[[0, 0], [10, 0], [0, 10]].forEach(([i, j]) => {
        g.fillStyle = '#141020'
        g.fillRect(cx - 105 + i * s, cy - 105 + j * s, s * 5, s * 5)
        g.fillStyle = '#e8e6f2'
        g.fillRect(cx - 105 + (i + 1) * s, cy - 105 + (j + 1) * s, s * 3, s * 3)
        g.fillStyle = '#8b8bff'
        g.fillRect(cx - 105 + (i + 2) * s, cy - 105 + (j + 2) * s, s, s)
      })
    } else if (p.art === 'map') {
      g.strokeStyle = 'rgba(125,211,252,0.5)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(90, 300); g.bezierCurveTo(150, 220, 120, 140, 210, 90); g.bezierCurveTo(260, 60, 300, 120, 320, 70)
      g.stroke()
      ;[[150, 240, '#f87171'], [230, 130, '#f5b84a'], [290, 210, '#f87171']].forEach(([x, y, col]) => {
        g.fillStyle = col
        g.beginPath(); g.arc(x, y - 22, 18, Math.PI, 0); g.lineTo(x, y); g.closePath(); g.fill()
        g.fillStyle = '#141020'; g.beginPath(); g.arc(x, y - 24, 7, 0, Math.PI * 2); g.fill()
      })
    } else {
      g.strokeStyle = '#e8e6f2'
      g.lineWidth = 10
      g.beginPath(); g.arc(cx, cy, 100, 0, Math.PI * 2); g.stroke()
      g.lineWidth = 8
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 70); g.moveTo(cx, cy); g.lineTo(cx + 50, cy + 20); g.stroke()
      g.fillStyle = '#8b8bff'; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = '#e8e6f2'
    g.font = '700 34px Inter, system-ui, sans-serif'
    g.fillText(p.title, 360, 170, 260)
    g.fillStyle = '#9a96b0'
    g.font = '400 20px Inter, system-ui, sans-serif'
    p.tech.slice(0, 4).forEach((t, i) => g.fillText(t, 360, 215 + i * 30))
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [p])
  return (
    <mesh>
      <planeGeometry args={[SCREEN_W, SCREEN_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
