import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, Shape, ShapeGeometry } from 'three'
import { theme } from '../theme'
import { player } from '../state/store'

// Partículas reutilizables (pool fijo, 1 draw call por tipo). Se disparan desde cualquier sitio:
// effects.dust(x, y, z, n) · effects.confetti(x, y, z) · effects.hearts(x, y, z)
const DUST = 48
const CONFETTI = 160
const HEARTS = 12

const dust = Array.from({ length: DUST }, () => ({ life: 0 }))
const confetti = Array.from({ length: CONFETTI }, () => ({ life: 0 }))
const hearts = Array.from({ length: HEARTS }, () => ({ life: 0 }))
let dustCursor = 0
let heartCursor = 0
const CONFETTI_COLORS = [theme.accent, '#f5b84a', '#86efac', '#f472b6', '#7dd3fc', '#ffffff']

export const effects = {
  dust(x, y, z, n = 6, power = 1) {
    for (let i = 0; i < n; i++) {
      const p = dust[dustCursor++ % DUST]
      const a = Math.random() * Math.PI * 2
      const s = (0.6 + Math.random() * 1.2) * power
      Object.assign(p, {
        x: x + Math.cos(a) * 0.15, y: y + 0.05, z: z + Math.sin(a) * 0.15,
        vx: Math.cos(a) * s, vy: 0.4 + Math.random() * 0.8 * power, vz: Math.sin(a) * s,
        life: 1, max: 0.45 + Math.random() * 0.35, size: 0.12 + Math.random() * 0.12,
      })
    }
  },
  confetti(x, y, z) {
    confetti.forEach((p) => {
      const a = Math.random() * Math.PI * 2
      const s = 2 + Math.random() * 5
      Object.assign(p, {
        x, y, z,
        vx: Math.cos(a) * s * 0.6, vy: 5 + Math.random() * 7, vz: Math.sin(a) * s * 0.6,
        rx: Math.random() * 6, ry: Math.random() * 6, spin: 4 + Math.random() * 10,
        life: 1, max: 2.2 + Math.random() * 1.4,
      })
    })
  },
  hearts(x, y, z) {
    for (let i = 0; i < 4; i++) {
      const p = hearts[heartCursor++ % HEARTS]
      Object.assign(p, { x: x + (Math.random() - 0.5) * 0.5, y, z: z + (Math.random() - 0.5) * 0.3, life: 1, max: 1.4 + Math.random() * 0.5, delay: i * 0.12 })
    }
  },
}

export default function Effects() {
  const dustMesh = useRef()
  const confettiMesh = useRef()
  const heartMesh = useRef()
  const o = useRef(new Object3D()).current

  useLayoutEffect(() => {
    const c = new Color()
    for (let i = 0; i < CONFETTI; i++) confettiMesh.current.setColorAt(i, c.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]))
    confettiMesh.current.instanceColor.needsUpdate = true
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    dust.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt / p.max
        p.vx *= 1 - 3 * dt
        p.vz *= 1 - 3 * dt
        p.vy -= 1.5 * dt
        p.x += p.vx * dt
        p.y = Math.max(0.02, p.y + p.vy * dt)
        p.z += p.vz * dt
        o.position.set(p.x, p.y, p.z)
        o.scale.setScalar(p.size * (1.6 - p.life) * Math.max(p.life, 0))
      } else o.scale.setScalar(0)
      o.rotation.set(0, 0, 0)
      o.updateMatrix()
      dustMesh.current.setMatrixAt(i, o.matrix)
    })
    dustMesh.current.instanceMatrix.needsUpdate = true

    confetti.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt / p.max
        p.vy -= 9 * dt
        p.vx *= 1 - 1.2 * dt
        p.vz *= 1 - 1.2 * dt
        if (p.vy < -2.5) p.vy = -2.5 // planea al caer
        p.x += p.vx * dt
        p.y = Math.max(0.03, p.y + p.vy * dt)
        p.z += p.vz * dt
        p.rx += p.spin * dt
        p.ry += p.spin * 0.7 * dt
        o.position.set(p.x, p.y, p.z)
        o.rotation.set(p.rx, p.ry, 0)
        o.scale.setScalar(Math.min(1, p.life * 4))
      } else o.scale.setScalar(0)
      o.updateMatrix()
      confettiMesh.current.setMatrixAt(i, o.matrix)
    })
    confettiMesh.current.instanceMatrix.needsUpdate = true

    hearts.forEach((p, i) => {
      if (p.life > 0) {
        if (p.delay > 0) p.delay -= dt
        else {
          p.life -= dt / p.max
          p.y += dt * 0.7
        }
        o.position.set(p.x + Math.sin(p.life * 9) * 0.06, p.y, p.z)
        o.rotation.set(0, 0, 0)
        o.scale.setScalar(p.delay > 0 ? 0 : 0.11 * Math.min(1, p.life * 3))
      } else o.scale.setScalar(0)
      o.updateMatrix()
      heartMesh.current.setMatrixAt(i, o.matrix)
    })
    heartMesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <AimArrow />
      <instancedMesh ref={dustMesh} args={[undefined, undefined, DUST]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#b9b2cf" transparent opacity={0.55} flatShading />
      </instancedMesh>
      <instancedMesh ref={confettiMesh} args={[undefined, undefined, CONFETTI]} frustumCulled={false}>
        <planeGeometry args={[0.12, 0.2]} />
        <meshBasicMaterial side={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={heartMesh} args={[undefined, undefined, HEARTS]} frustumCulled={false}>
        <HeartGeometry />
        <meshBasicMaterial color="#f472b6" toneMapped={false} side={2} />
      </instancedMesh>
    </>
  )
}

// Flecha en el suelo que indica dirección y fuerza del chut mientras se carga
export function AimArrow() {
  const group = useRef()
  const shaft = useRef()
  const head = useRef()
  useFrame(() => {
    const a = player.aim
    const g = group.current
    if (!g) return
    g.visible = a.active
    if (!a.active) return
    const len = 0.8 + a.charge * 3.2
    g.position.set(a.x, 0.05, a.z)
    g.rotation.y = Math.atan2(a.dx, a.dz)
    shaft.current.scale.y = len
    shaft.current.position.z = 0.35 + len / 2
    head.current.position.z = 0.35 + len + 0.18
    const col = shaft.current.material.color
    col.setRGB(0.545 + a.charge * 0.42, 0.545 + a.charge * 0.18, 1 - a.charge * 0.7)
    head.current.material.color.copy(col)
  })
  return (
    <group ref={group} visible={false}>
      <mesh ref={shaft} rotation-x={Math.PI / 2}>
        <planeGeometry args={[0.12, 1]} />
        <meshBasicMaterial transparent opacity={0.8} toneMapped={false} depthWrite={false} side={2} />
      </mesh>
      <mesh ref={head} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.24, 3, Math.PI / 2]} />
        <meshBasicMaterial transparent opacity={0.9} toneMapped={false} depthWrite={false} side={2} />
      </mesh>
    </group>
  )
}

function HeartGeometry() {
  const geometry = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0.5)
    s.bezierCurveTo(0, 0.8, -0.6, 0.9, -0.6, 0.4)
    s.bezierCurveTo(-0.6, 0.1, -0.2, -0.2, 0, -0.5)
    s.bezierCurveTo(0.2, -0.2, 0.6, 0.1, 0.6, 0.4)
    s.bezierCurveTo(0.6, 0.9, 0, 0.8, 0, 0.5)
    return new ShapeGeometry(s)
  }, [])
  return <primitive object={geometry} attach="geometry" />
}
