import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Sparkles } from '@react-three/drei'
import { RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { ROOM, useGame } from '../state/store'
import { theme } from '../theme'
import { sfx } from '../audio/sfx'
import { Label, Interactable } from './common'
import { effects } from './Effects'
import { useKickable } from './kick'

const R = ROOM.half
const H = ROOM.height

// Detalles de la habitación: todo low-poly y sin assets externos
export default function RoomDecor() {
  return (
    <group>
      <PcTower />
      <DeskLamp />
      <Headphones />
      <Speaker />
      <Clock />
      <LedStrip />
      <Posters />
      <Curtains />
      <FloatingShelf />
      <CorkBoard />
      <Guitar />
      <TrashBin />
      <Beanbag />
      <Slippers />
      <BookStack />
      <Cat />
      <RubberBall />
      <Sparkles position={[-3.25, 1.05, -3.75]} count={5} scale={[0.1, 0.35, 0.1]} size={2} speed={0.5} color="#ffffff" opacity={0.5} />
    </group>
  )
}

function PcTower() {
  const led = useRef()
  useFrame(({ clock }) => led.current?.color.setHSL((clock.elapsedTime * 0.08) % 1, 0.85, 0.62))
  return (
    <group position={[-1.5, 0, -4.05]}>
      <mesh position-y={0.3} castShadow>
        <boxGeometry args={[0.26, 0.6, 0.5]} />
        <meshStandardMaterial color="#1f1c2a" />
      </mesh>
      <mesh position={[0, 0.3, 0.252]}>
        <planeGeometry args={[0.04, 0.5]} />
        <meshBasicMaterial ref={led} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.52, 0.252]}>
        <circleGeometry args={[0.015, 8]} />
        <meshBasicMaterial color="#86efac" toneMapped={false} />
      </mesh>
    </group>
  )
}

function DeskLamp() {
  return (
    <group position={[-3.45, 0.77, -4.15]}>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[0.09, 0.1, 0.03, 12]} />
        <meshStandardMaterial color="#2a2738" />
      </mesh>
      <mesh position={[0.05, 0.2, 0]} rotation-z={-0.35}>
        <cylinderGeometry args={[0.012, 0.012, 0.38, 6]} />
        <meshStandardMaterial color="#2a2738" />
      </mesh>
      <mesh position={[0.17, 0.4, 0.05]} rotation={[0.5, 0, -1.2]}>
        <coneGeometry args={[0.08, 0.13, 12, 1, true]} />
        <meshStandardMaterial color={theme.accent} side={2} />
      </mesh>
      <mesh position={[0.2, 0.36, 0.08]}>
        <sphereGeometry args={[0.03, 8, 6]} />
        <meshBasicMaterial color="#fff1c9" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Headphones() {
  return (
    <group position={[-2.95, 0.8, -3.75]} rotation-x={-Math.PI / 2}>
      <mesh>
        <torusGeometry args={[0.11, 0.015, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#2a2738" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.11, 0, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
          <meshStandardMaterial color={theme.accent} />
        </mesh>
      ))}
    </group>
  )
}

function Speaker() {
  return (
    <group position={[-1.15, 0.77, -4.2]}>
      <mesh position-y={0.12} castShadow>
        <boxGeometry args={[0.14, 0.24, 0.14]} />
        <meshStandardMaterial color="#2a2738" />
      </mesh>
      {[0.17, 0.07].map((y, i) => (
        <mesh key={y} position={[0, y, 0.071]}>
          <circleGeometry args={[i ? 0.045 : 0.025, 12]} />
          <meshStandardMaterial color="#14121c" />
        </mesh>
      ))}
    </group>
  )
}

// Reloj de pared con la hora real del visitante
function Clock() {
  const hour = useRef()
  const minute = useRef()
  const second = useRef()
  useFrame(() => {
    const d = new Date()
    const s = d.getSeconds() + d.getMilliseconds() / 1000
    const m = d.getMinutes() + s / 60
    const h = (d.getHours() % 12) + m / 60
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2
    if (second.current) second.current.rotation.z = -(s / 60) * Math.PI * 2
  })
  return (
    <group position={[-4.05, 1.95, -R + 0.03]}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 24]} />
        <meshStandardMaterial color="#2a2738" />
      </mesh>
      <mesh position-z={0.021}>
        <circleGeometry args={[0.19, 24]} />
        <meshStandardMaterial color="#f4f2fb" />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.16, Math.cos(a) * 0.16, 0.024]} rotation-z={-a}>
            <planeGeometry args={[0.012, i % 3 ? 0.02 : 0.04]} />
            <meshBasicMaterial color="#2a2738" />
          </mesh>
        )
      })}
      {[
        [hour, 0.09, 0.016, '#2a2738'],
        [minute, 0.14, 0.01, '#2a2738'],
        [second, 0.15, 0.004, '#e11d48'],
      ].map(([ref, len, w, c], i) => (
        <group key={i} ref={ref} position-z={0.026 + 0.002 * i}>
          <mesh position-y={len / 2 - 0.015}>
            <planeGeometry args={[w, len]} />
            <meshBasicMaterial color={c} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LedStrip() {
  const mat = useRef()
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.2) * 0.2
  })
  const m = <meshBasicMaterial ref={mat} color={theme.accent} toneMapped={false} transparent />
  return (
    <group>
      <mesh position={[-(R + 0.9) / 2, H - 0.06, -R + 0.03]}>
        <boxGeometry args={[R - 0.9, 0.025, 0.02]} />
        {m}
      </mesh>
      <mesh position={[(R + 0.9) / 2, H - 0.06, -R + 0.03]}>
        <boxGeometry args={[R - 0.9, 0.025, 0.02]} />
        <meshBasicMaterial color={theme.accent} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (R - 0.03), H - 0.06, 0]}>
          <boxGeometry args={[0.02, 0.025, R * 2]} />
          <meshBasicMaterial color={theme.accent} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// Cuadros abstractos (formas geométricas, sin ilustraciones de terceros)
function Posters() {
  const art = [
    { z: -2.6, bg: '#2b2440', shapes: [['circle', 0, 0.12, 0.22, '#f5b84a'], ['tri', -0.1, -0.2, 0.2, theme.accent], ['box', 0.15, -0.25, 0.14, '#f472b6']] },
    { z: 2.9, bg: '#1d2b3a', shapes: [['box', -0.12, 0.15, 0.2, '#7dd3fc'], ['circle', 0.12, -0.05, 0.16, '#86efac'], ['tri', 0, -0.3, 0.16, '#f4f2fb']] },
  ]
  return art.map((a) => (
    <group key={a.z} position={[-R + 0.03, 1.55, a.z]} rotation-y={Math.PI / 2}>
      <mesh>
        <boxGeometry args={[0.84, 1.14, 0.03]} />
        <meshStandardMaterial color={theme.woodDark} />
      </mesh>
      <mesh position-z={0.017}>
        <planeGeometry args={[0.74, 1.04]} />
        <meshStandardMaterial color={a.bg} />
      </mesh>
      {a.shapes.map(([type, x, y, s, c], i) => (
        <mesh key={i} position={[x, y, 0.02]} rotation-z={type === 'tri' ? Math.PI / 2 : type === 'box' ? 0.4 : 0}>
          {type === 'circle' ? <circleGeometry args={[s, 24]} /> : type === 'tri' ? <circleGeometry args={[s, 3]} /> : <planeGeometry args={[s, s]} />}
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  ))
}

function Curtains() {
  return [-0.5, 1.7].map((z) => (
    <mesh key={z} position={[-R + 0.08, 1.45, z]} castShadow>
      <boxGeometry args={[0.06, 1.5, 0.42]} />
      <meshStandardMaterial color="#5b4a8a" />
    </mesh>
  ))
}

function FloatingShelf() {
  return (
    <group position={[-R + 0.14, 1.65, -1.15]}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.04, 1.2]} />
        <meshStandardMaterial color={theme.wood} />
      </mesh>
      {/* Maceta pequeña */}
      <mesh position={[0, 0.08, -0.4]}>
        <cylinderGeometry args={[0.07, 0.06, 0.12, 8]} />
        <meshStandardMaterial color="#c4734f" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[Math.sin(i * 2) * 0.04, 0.19 + i * 0.03, -0.4 + Math.cos(i * 2) * 0.04]} rotation-z={i - 1}>
          <coneGeometry args={[0.04, 0.16, 4]} />
          <meshStandardMaterial color="#4f8a6b" flatShading />
        </mesh>
      ))}
      {/* Trofeo */}
      <group position={[0, 0.02, 0.05]}>
        <mesh position-y={0.03}>
          <boxGeometry args={[0.1, 0.05, 0.1]} />
          <meshStandardMaterial color="#2a2738" />
        </mesh>
        <mesh position-y={0.1}>
          <cylinderGeometry args={[0.012, 0.012, 0.09, 6]} />
          <meshStandardMaterial color="#f5b84a" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position-y={0.19}>
          <cylinderGeometry args={[0.06, 0.03, 0.1, 10]} />
          <meshStandardMaterial color="#f5b84a" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      {['#e07a5f', '#81b29a', '#8b8bff'].map((c, i) => (
        <mesh key={c} position={[0, 0.1, 0.35 + i * 0.07]} rotation-x={i === 2 ? 0.3 : 0}>
          <boxGeometry args={[0.16, 0.17, 0.05]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  )
}

function CorkBoard() {
  const notes = [
    [-0.35, 0.18, '#f5b84a'], [-0.05, 0.22, '#86efac'], [0.3, 0.15, '#f472b6'],
    [-0.25, -0.15, '#7dd3fc'], [0.12, -0.12, '#f4f2fb'], [0.38, -0.2, '#f5b84a'],
  ]
  return (
    <group position={[R - 0.03, 1.6, -0.6]} rotation-y={-Math.PI / 2}>
      <mesh>
        <boxGeometry args={[1.2, 0.8, 0.03]} />
        <meshStandardMaterial color="#b08154" />
      </mesh>
      {notes.map(([x, y, c], i) => (
        <group key={i} position={[x, y, 0.02]} rotation-z={(i % 3 - 1) * 0.12}>
          <mesh>
            <planeGeometry args={[0.2, 0.2]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, 0.07, 0.01]}>
            <sphereGeometry args={[0.015, 6, 4]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Guitar() {
  const wood = '#c2410c'
  return (
    <group position={[R - 0.45, 0, -R + 0.3]} rotation-x={-0.16}>
      <mesh position-y={0.33} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.12, 16]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      <mesh position-y={0.64} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 16]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      <mesh position={[0, 0.5, 0.062]}>
        <circleGeometry args={[0.075, 16]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      <mesh position={[0, 0.25, 0.064]}>
        <boxGeometry args={[0.16, 0.03, 0.01]} />
        <meshStandardMaterial color="#1a1410" />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.07, 0.66, 0.04]} />
        <meshStandardMaterial color="#3b2a20" />
      </mesh>
      <mesh position={[0, 1.47, 0]}>
        <boxGeometry args={[0.1, 0.16, 0.04]} />
        <meshStandardMaterial color="#1a1410" />
      </mesh>
      {[-0.015, 0.015].map((x) => (
        <mesh key={x} position={[x, 0.85, 0.065]}>
          <planeGeometry args={[0.004, 1.2]} />
          <meshBasicMaterial color="#e9e6f5" />
        </mesh>
      ))}
    </group>
  )
}

function TrashBin() {
  return (
    <group position={[-0.95, 0, -3.95]}>
      <mesh position-y={0.18} castShadow>
        <cylinderGeometry args={[0.17, 0.14, 0.36, 12, 1, true]} />
        <meshStandardMaterial color="#3a3650" side={2} />
      </mesh>
      {[[0.04, 0.3], [-0.05, 0.27], [0.25, 0.06]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, i === 2 ? 0.2 : 0]}>
          <icosahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial color="#f4f2fb" flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Beanbag() {
  return (
    <group position={[-3.55, 0, 2.3]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.5, 0.3, 0.5]} position-y={0.3} />
      </RigidBody>
      <mesh position-y={0.3} scale={[1, 0.62, 1]} castShadow>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial color="#3d3470" flatShading />
      </mesh>
    </group>
  )
}

function Slippers() {
  return [0, 1].map((i) => (
    <mesh key={i} position={[2.6, 0.03, 2.0 + i * 0.2]} rotation-y={0.2 * i} castShadow>
      <boxGeometry args={[0.26, 0.05, 0.11]} />
      <meshStandardMaterial color="#f472b6" />
    </mesh>
  ))
}

function BookStack() {
  return ['#8b8bff', '#e07a5f', '#f2cc8f', '#81b29a'].map((c, i) => (
    <mesh key={c} position={[1.45, 0.04 + i * 0.07, -3.95]} rotation-y={i * 0.25} castShadow>
      <boxGeometry args={[0.32, 0.065, 0.24]} />
      <meshStandardMaterial color={c} />
    </mesh>
  ))
}

// Gato dormido en la cama: respira, mueve la cola y ronronea si lo acaricias
function Cat() {
  const body = useRef()
  const tail = useRef()
  const z = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.scale.y = 1 + Math.sin(t * 1.8) * 0.05
    if (tail.current) tail.current.rotation.y = Math.sin(t * 1.3) * 0.35
    if (z.current) {
      const c = (t * 0.45) % 1
      z.current.position.set(0.2 + c * 0.15, 0.3 + c * 0.45, 0)
      z.current.fillOpacity = Math.sin(c * Math.PI)
    }
  })
  const fur = '#e59a5b'
  const pet = () => {
    useGame.getState().unlock('cat')
    sfx.purr()
    effects.hearts(3.75, 1.05, 2.3)
  }
  return (
    <group>
      <group position={[3.7, 0.66, 2.35]} rotation-y={-0.4}>
        <mesh ref={body} position-y={0.08} scale={[1, 0.6, 0.72]} castShadow>
          <sphereGeometry args={[0.28, 12, 8]} />
          <meshStandardMaterial color={fur} flatShading />
        </mesh>
        <group position={[0.24, 0.1, 0.08]}>
          <mesh scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color={fur} flatShading />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.02, 0.1, s * 0.07]} rotation-x={s * 0.25}>
              <coneGeometry args={[0.04, 0.08, 4]} />
              <meshStandardMaterial color={fur} flatShading />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={`e${s}`} position={[0.11, 0.02, s * 0.045]}>
              <boxGeometry args={[0.01, 0.008, 0.035]} />
              <meshBasicMaterial color="#3b2a20" />
            </mesh>
          ))}
          <mesh position={[0.125, -0.02, 0]}>
            <sphereGeometry args={[0.012, 6, 4]} />
            <meshBasicMaterial color="#f9a8d4" />
          </mesh>
        </group>
        <group ref={tail} position={[-0.2, 0.0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, Math.PI * 0.55]} position={[0, 0, 0.16]}>
            <torusGeometry args={[0.18, 0.035, 6, 14, Math.PI * 0.9]} />
            <meshStandardMaterial color={fur} flatShading />
          </mesh>
        </group>
        <Billboard>
          <Label ref={z} fontSize={0.12} color="#cfcbe0">
            z
          </Label>
        </Billboard>
      </group>
      <Interactable
        id="cat"
        position={[2.7, 1, 2.35]}
        size={[0.45, 1, 0.6]}
        title="El gato está dormido"
        subtitle="Parece que le gustan las caricias"
        actions={[{ key: 'E', label: 'Acariciar', run: pet }]}
      />
    </group>
  )
}

// Pelota de goma para practicar el chut sin salir de la habitación
function RubberBall() {
  const ball = useRef()
  useKickable('rubber-ball', ball, { label: 'Pelota', radius: 0.17, minSpeed: 2.5, maxSpeed: 7, lift: 1.2 })
  return (
    <RigidBody
      ref={ball}
      position={[1.1, 0.3, 0.2]}
      colliders={false}
      linearDamping={0.5}
      angularDamping={0.6}
      ccd
      onCollisionEnter={() => {
        const v = ball.current?.linvel()
        if (v) sfx.bounce(Math.hypot(v.x, v.y, v.z))
      }}
    >
      <BallCollider args={[0.17]} mass={0.2} restitution={0.75} friction={0.7} />
      <mesh castShadow>
        <icosahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial color="#f472b6" flatShading />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.172, 0.012, 4, 20]} />
        <meshStandardMaterial color="#f4f2fb" />
      </mesh>
    </RigidBody>
  )
}
