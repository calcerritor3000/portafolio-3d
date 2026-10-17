import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { AdditiveBlending, CatmullRomCurve3, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, Shape, Vector3 } from 'three'
import { useGame } from '../state/store'
import { theme } from '../theme'
import { Board, Label } from './common'
import { CAMPFIRE, LANE, PITCH_CX, PLAZA, mulberry32 } from './layout'

// ---------- Ubicaciones ----------
export const GRAVEYARD = [-20, -7]

const PATH_PUMPKINS = [
  // Puerta de la habitación y camino principal (alternando lados)
  [-1.3, -5.3], [1.3, -5.3], [1.45, -9.4], [-1.45, -13.4], [1.45, -17.2],
  // Plaza
  ...[0.4, 1.3, 2.2, 3.4, 4.3, 5.4].map((a) => [PLAZA[0] + Math.cos(a) * 5.9, PLAZA[1] + Math.sin(a) * 5.9]),
  // Camino a los minijuegos y cruce
  [-1.45, -31.5], [1.45, -35.8], [-10.5, -38.6], [10.5, -41.2],
  // Entradas del fútbol y los bolos
  [PITCH_CX - 2.4, -39.4], [PITCH_CX + 2.4, -39.4], [LANE.x - 2.3, -39.4], [LANE.x + 2.3, -39.4],
  // Enlaces, proyectos y hoguera
  [-15.5, -15.2], [15.75, -15.2], [CAMPFIRE[0] + 2.6, CAMPFIRE[1] + 1.2], [CAMPFIRE[0] - 2.4, CAMPFIRE[1] - 1.6],
  // Cementerio
  [GRAVEYARD[0] + 3.4, GRAVEYARD[1] + 2.6], [GRAVEYARD[0] - 3.4, GRAVEYARD[1] + 2.6],
]

// Cada calabaza mira hacia el camino o la plaza más cercana
function faceTarget(x, z) {
  if (Math.hypot(x - PLAZA[0], z - PLAZA[1]) < 7) return PLAZA
  if (z < -37) return [x, -38.8]
  if (Math.abs(x) < 3) return [0, z]
  return [x * 0.5, z + 2]
}

// ---------- Materiales compartidos (un solo useFrame anima todo) ----------
const pumpkinMat = new MeshStandardMaterial({ color: '#f97316', roughness: 0.55, flatShading: true })
const stemMat = new MeshStandardMaterial({ color: '#4d7c0f', flatShading: true })
const glowMat = new MeshBasicMaterial({ color: '#ffb347', toneMapped: false })
const stoneMat = new MeshStandardMaterial({ color: '#6d6880', roughness: 0.9, flatShading: true })
const ghostMat = new MeshStandardMaterial({ color: '#f1f0ff', emissive: '#b8b4ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.82, flatShading: true })
const batMat = new MeshBasicMaterial({ color: '#0b0812', side: DoubleSide })
const bulbOrange = new MeshBasicMaterial({ color: '#ff8a1f', toneMapped: false })
const bulbPurple = new MeshBasicMaterial({ color: '#b87bff', toneMapped: false })
const eyeMat = new MeshBasicMaterial({ color: '#1a1325' })

export default function Halloween() {
  const high = useGame((s) => s.quality === 'high')

  // Parpadeo de las velas de las calabazas y de las guirnaldas
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const f = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23.7) * 0.07
    glowMat.color.setRGB(1 * f, 0.68 * f, 0.26 * f)
    const pulse = 0.75 + Math.sin(t * 2.2) * 0.25
    bulbOrange.color.setRGB(1 * pulse, 0.54 * pulse, 0.12 * pulse)
    bulbPurple.color.setRGB(0.72 * (1.5 - pulse), 0.48 * (1.5 - pulse), 1 * (1.5 - pulse))
  })

  return (
    <group>
      {PATH_PUMPKINS.map(([x, z], i) => {
        const [tx, tz] = faceTarget(x, z)
        return <Pumpkin key={i} position={[x, 0, z]} rotation={Math.atan2(tx - x, tz - z)} scale={0.85 + ((i * 37) % 10) / 40} />
      })}
      <Graveyard high={high} />
      <Ghost center={GRAVEYARD} radius={2.6} height={1.5} speed={0.45} phase={0} />
      <Ghost center={GRAVEYARD} radius={3.6} height={2.1} speed={-0.32} phase={2} />
      <Ghost center={PLAZA} radius={7.5} height={3.4} speed={0.22} phase={1} />
      <Ghost center={[LANE.x, -50]} radius={3} height={2.6} speed={0.38} phase={3} />
      <Bats center={PLAZA} count={high ? 12 : 6} radius={[6, 11]} height={[5, 8]} seed={3} />
      <Bats center={[PITCH_CX, -52]} count={high ? 8 : 4} radius={[5, 9]} height={[6, 9]} seed={7} />
      <Bats center={GRAVEYARD} count={high ? 6 : 3} radius={[2, 4]} height={[3.5, 5]} seed={11} />
      <PlazaLights />
      <WelcomeBoard />
      {high && (
        <>
          <pointLight position={[GRAVEYARD[0], 1.4, GRAVEYARD[1]]} intensity={10} distance={10} decay={1.6} color="#ff8a1f" />
          <pointLight position={[0, 1.2, -5.6]} intensity={6} distance={6} decay={1.8} color="#ff8a1f" />
          <pointLight position={[PITCH_CX, 1.2, -39.6]} intensity={6} distance={7} decay={1.8} color="#ff8a1f" />
          <pointLight position={[LANE.x, 1.2, -39.6]} intensity={6} distance={7} decay={1.8} color="#ff8a1f" />
        </>
      )}
    </group>
  )
}

// ---------- Calabaza tallada (Jack-o'-lantern) ----------
const triangle = (() => {
  const s = new Shape()
  s.moveTo(0, 0.06)
  s.lineTo(0.05, -0.035)
  s.lineTo(-0.05, -0.035)
  s.closePath()
  return s
})()
const mouth = (() => {
  const s = new Shape()
  s.moveTo(-0.13, 0.02)
  s.lineTo(-0.08, -0.01)
  s.lineTo(-0.05, 0.02)
  s.lineTo(0, -0.01)
  s.lineTo(0.05, 0.02)
  s.lineTo(0.08, -0.01)
  s.lineTo(0.13, 0.02)
  s.quadraticCurveTo(0.08, -0.09, 0, -0.09)
  s.quadraticCurveTo(-0.08, -0.09, -0.13, 0.02)
  return s
})()

export function Pumpkin({ position, rotation = 0, scale = 1 }) {
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      {/* Gajos: varias esferas achatadas */}
      {[-0.11, 0, 0.11].map((dx, i) => (
        <mesh key={i} material={pumpkinMat} position={[dx, 0.24, 0]} scale={[i === 1 ? 1 : 0.8, 0.8, 0.9]} castShadow>
          <sphereGeometry args={[0.26, 10, 8]} />
        </mesh>
      ))}
      <mesh material={stemMat} position={[0, 0.5, 0]} rotation-z={0.2}>
        <cylinderGeometry args={[0.03, 0.045, 0.12, 6]} />
      </mesh>
      {/* Cara que brilla desde dentro */}
      <group position={[0, 0.27, 0.236]}>
        <mesh material={glowMat} position={[-0.09, 0.06, 0]}>
          <shapeGeometry args={[triangle]} />
        </mesh>
        <mesh material={glowMat} position={[0.09, 0.06, 0]}>
          <shapeGeometry args={[triangle]} />
        </mesh>
        <mesh material={glowMat} position={[0, -0.04, 0.005]}>
          <shapeGeometry args={[mouth]} />
        </mesh>
      </group>
    </group>
  )
}

// ---------- Cementerio ----------
function Graveyard({ high }) {
  const [cx, cz] = GRAVEYARD
  const stones = useMemo(() => {
    const r = mulberry32(99)
    const out = []
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        out.push({
          x: cx - 2.4 + col * 1.6 + (r() - 0.5) * 0.4,
          z: cz - 1.4 + row * 2.2 + (r() - 0.5) * 0.3,
          tilt: (r() - 0.5) * 0.25,
          kind: Math.floor(r() * 3),
          h: 0.7 + r() * 0.35,
        })
      }
    }
    return out
  }, [cx, cz])

  return (
    <group>
      {/* Tierra del cementerio */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.015, cz]} receiveShadow>
        <circleGeometry args={[4.6, 28]} />
        <meshStandardMaterial color="#231c2c" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {stones.map((s, i) => (
          <CuboidCollider key={i} args={[0.3, s.h / 2, 0.1]} position={[s.x, s.h / 2, s.z]} />
        ))}
      </RigidBody>
      {stones.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[s.tilt * 0.4, 0, s.tilt]}>
          {s.kind === 2 ? (
            // Cruz
            <>
              <mesh material={stoneMat} position-y={s.h / 2} castShadow>
                <boxGeometry args={[0.14, s.h, 0.12]} />
              </mesh>
              <mesh material={stoneMat} position-y={s.h * 0.72} castShadow>
                <boxGeometry args={[0.5, 0.13, 0.12]} />
              </mesh>
            </>
          ) : (
            // Lápida con la parte de arriba redondeada
            <>
              <mesh material={stoneMat} position-y={(s.h - 0.28) / 2} castShadow>
                <boxGeometry args={[0.56, s.h - 0.28, 0.16]} />
              </mesh>
              <mesh material={stoneMat} position-y={s.h - 0.28} rotation-x={Math.PI / 2} castShadow>
                <cylinderGeometry args={[0.28, 0.28, 0.16, 12, 1, false, 0, Math.PI]} />
              </mesh>
              <Label position={[0, s.h * 0.48, 0.09]} fontSize={0.12} color="#3a3548" letterSpacing={0.1}>
                RIP
              </Label>
            </>
          )}
          {/* Montículo de tierra */}
          <mesh position={[0, 0.03, 0.55]} scale={[1, 0.25, 1.6]}>
            <sphereGeometry args={[0.32, 8, 6]} />
            <meshStandardMaterial color="#2c2235" flatShading />
          </mesh>
        </group>
      ))}
      {/* Verja baja */}
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2
        if (a > 1.2 && a < 1.95) return null // entrada mirando al camino
        return (
          <mesh key={i} position={[cx + Math.cos(a) * 4.5, 0.4, cz + Math.sin(a) * 4.5]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.8, 5]} />
            <meshStandardMaterial color="#1b1724" />
          </mesh>
        )
      })}
      {high && <Fog center={GRAVEYARD} />}
    </group>
  )
}

// Niebla baja: discos translúcidos que respiran
function Fog({ center }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.children.forEach((m, i) => {
      m.material.opacity = 0.1 + Math.sin(clock.elapsedTime * 0.6 + i) * 0.04
      m.rotation.z = clock.elapsedTime * 0.05 * (i % 2 ? 1 : -1)
    })
  })
  return (
    <group ref={ref} position={[center[0], 0.25, center[1]]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position-y={i * 0.15}>
          <circleGeometry args={[4.2 - i * 0.6, 24]} />
          <meshBasicMaterial color="#c9c3ff" transparent opacity={0.1} depthWrite={false} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- Fantasma ----------
function Ghost({ center, radius, height, speed, phase }) {
  const ref = useRef()
  const cloth = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase
    if (!ref.current) return
    ref.current.position.set(center[0] + Math.cos(t) * radius, height + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.25, center[1] + Math.sin(t) * radius)
    // Mira hacia donde avanza
    ref.current.rotation.y = -t + (speed > 0 ? Math.PI : 0)
    if (cloth.current) cloth.current.rotation.y = clock.elapsedTime * 0.8
  })
  return (
    <group ref={ref}>
      <mesh material={ghostMat}>
        <sphereGeometry args={[0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Sábana con el borde ondulado */}
      <mesh ref={cloth} material={ghostMat} position-y={-0.32}>
        <cylinderGeometry args={[0.38, 0.5, 0.65, 10, 1, true]} />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} material={eyeMat} position={[x, 0.08, 0.33]} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.055, 8, 6]} />
        </mesh>
      ))}
      <mesh material={eyeMat} position={[0, -0.08, 0.35]} scale={[1, 1.3, 0.6]}>
        <sphereGeometry args={[0.06, 8, 6]} />
      </mesh>
    </group>
  )
}

// ---------- Murciélagos ----------
const wingShape = (() => {
  const s = new Shape()
  s.moveTo(0, 0)
  s.lineTo(0.18, 0.08)
  s.lineTo(0.32, 0.02)
  s.lineTo(0.28, -0.05)
  s.lineTo(0.2, -0.02)
  s.lineTo(0.13, -0.07)
  s.lineTo(0.06, -0.03)
  s.closePath()
  return s
})()

function Bats({ center, count, radius, height, seed }) {
  const group = useRef()
  const bats = useMemo(() => {
    const r = mulberry32(seed)
    return Array.from({ length: count }, () => ({
      r: radius[0] + r() * (radius[1] - radius[0]),
      h: height[0] + r() * (height[1] - height[0]),
      speed: (0.35 + r() * 0.5) * (r() > 0.5 ? 1 : -1),
      phase: r() * Math.PI * 2,
      flap: 10 + r() * 6,
    }))
  }, [count, radius, height, seed])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.current?.children.forEach((bat, i) => {
      const b = bats[i]
      const a = t * b.speed + b.phase
      bat.position.set(center[0] + Math.cos(a) * b.r, b.h + Math.sin(t * 1.3 + b.phase) * 0.6, center[1] + Math.sin(a) * b.r)
      bat.rotation.y = -a + (b.speed > 0 ? 0 : Math.PI)
      const w = Math.sin(t * b.flap + b.phase) * 0.9
      bat.children[1].rotation.z = w
      bat.children[2].rotation.z = -w
    })
  })

  return (
    <group ref={group}>
      {bats.map((_, i) => (
        <group key={i}>
          <mesh material={batMat}>
            <sphereGeometry args={[0.07, 6, 5]} />
          </mesh>
          <mesh material={batMat} position-x={0.04}>
            <shapeGeometry args={[wingShape]} />
          </mesh>
          <mesh material={batMat} position-x={-0.04} scale-x={-1}>
            <shapeGeometry args={[wingShape]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- Guirnaldas de luces en la plaza ----------
function PlazaLights() {
  const R = 6.6
  const POLES = 8
  const poles = Array.from({ length: POLES }, (_, i) => {
    // Desfase de medio hueco: ningún poste cae sobre los caminos (norte, sur, este y oeste)
    const a = (i / POLES) * Math.PI * 2 + Math.PI / POLES
    return [PLAZA[0] + Math.cos(a) * R, PLAZA[1] + Math.sin(a) * R]
  })
  const bulbs = useMemo(() => {
    const out = []
    for (let i = 0; i < POLES; i++) {
      const [x1, z1] = poles[i]
      const [x2, z2] = poles[(i + 1) % POLES]
      const curve = new CatmullRomCurve3([
        new Vector3(x1, 2.9, z1),
        new Vector3((x1 + x2) / 2, 2.25, (z1 + z2) / 2),
        new Vector3(x2, 2.9, z2),
      ])
      for (let k = 1; k < 7; k++) out.push({ p: curve.getPoint(k / 7), orange: (i * 7 + k) % 2 === 0 })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {poles.map(([x, z], i) => (
          <CuboidCollider key={i} args={[0.08, 1.5, 0.08]} position={[x, 1.5, z]} />
        ))}
      </RigidBody>
      {poles.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position-y={1.5} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 3, 6]} />
            <meshStandardMaterial color={theme.woodDark} />
          </mesh>
          <Pumpkin position={[0, 3, 0]} scale={0.55} rotation={Math.atan2(PLAZA[0] - x, PLAZA[1] - z)} />
        </group>
      ))}
      {bulbs.map((b, i) => (
        <mesh key={i} material={b.orange ? bulbOrange : bulbPurple} position={b.p}>
          <sphereGeometry args={[0.06, 6, 5]} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- Cartel de bienvenida junto al camino ----------
function WelcomeBoard() {
  return (
    <group>
      <Board position={[3.4, 0, -7.4]} rotation={[0, -Math.PI / 2.4, 0]} width={2.8} height={1.15} base={0.7} edge="#ff8a1f">
        <Label fontSize={0.3} color="#ffb347" position={[0, 0.16, 0]} letterSpacing={0.04}>
          ¡Feliz Halloween!
        </Label>
        <Label weight="regular" fontSize={0.12} color={theme.textMuted} position={[0, -0.22, 0]}>
          Busca las calabazas y visita el cementerio
        </Label>
      </Board>
      <Pumpkin position={[3.0, 0, -8.9]} rotation={-1.2} scale={1.1} />
      <Pumpkin position={[3.9, 0, -6.0]} rotation={-1.4} scale={0.8} />
    </group>
  )
}
