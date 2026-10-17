import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Sparkles } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider, BallCollider } from '@react-three/rapier'
import { AdditiveBlending, Color, Object3D } from 'three'
import { player, useGame } from '../state/store'
import { theme } from '../theme'
import { setZone } from '../audio/sfx'
import { BOUNDS, CAMPFIRE, PLAZA, POND, isFree, mulberry32 } from './layout'

export default function Decor() {
  return (
    <group>
      <Fountain />
      <Benches />
      <Campfire />
      <Pond />
      <FlowerBeds />
      <Mailbox position={[-9.4, 0, -26.6]} />
      <Scatter />
      <SkyBody />
      <Fireflies />
      <AudioZones />
    </group>
  )
}

// ---------- Agua animada (fuente y estanque) ----------
function WaterMaterial({ color = '#3b4f9e', deep = '#1d2552' }) {
  const ref = useRef()
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uA: { value: new Color(color) }, uB: { value: new Color(deep) }, uC: { value: new Color(theme.accent) } }),
    [color, deep],
  )
  useFrame(({ clock }) => (uniforms.uTime.value = clock.elapsedTime))
  return (
    <shaderMaterial
      ref={ref}
      uniforms={uniforms}
      transparent
      vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
      fragmentShader={`
        uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5; float r = length(p) * 2.0;
          float w = sin(r * 26.0 - uTime * 2.2) * 0.5 + 0.5;
          float w2 = sin((p.x + p.y) * 30.0 + uTime * 1.3) * 0.5 + 0.5;
          vec3 col = mix(uB, uA, 0.45 + 0.35 * w * (1.0 - r));
          col += uC * pow(w2 * w, 6.0) * 0.5;
          float edge = smoothstep(1.0, 0.94, r);
          gl_FragColor = vec4(col, 0.88 * edge);
        }`}
    />
  )
}

function Fountain() {
  const [x, z] = PLAZA
  const jet = useRef()
  useFrame(({ clock }) => {
    if (jet.current) jet.current.scale.y = 1 + Math.sin(clock.elapsedTime * 6) * 0.06
  })
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.35, 1.9]} position-y={0.35} />
        <CylinderCollider args={[0.9, 0.3]} position-y={0.9} />
      </RigidBody>
      <mesh position-y={0.25} castShadow receiveShadow>
        <cylinderGeometry args={[1.95, 2.05, 0.5, 20]} />
        <meshStandardMaterial color="#5a5373" flatShading />
      </mesh>
      <mesh position-y={0.51} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.75, 32]} />
        <WaterMaterial />
      </mesh>
      <mesh position-y={0.85}>
        <cylinderGeometry args={[0.22, 0.32, 0.8, 10]} />
        <meshStandardMaterial color="#6b6388" flatShading />
      </mesh>
      <mesh position-y={1.3} castShadow>
        <cylinderGeometry args={[0.75, 0.35, 0.2, 14]} />
        <meshStandardMaterial color="#6b6388" flatShading />
      </mesh>
      <mesh position-y={1.41} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.68, 20]} />
        <WaterMaterial />
      </mesh>
      {/* Chorro central y cortina de agua */}
      <mesh ref={jet} position-y={1.75}>
        <cylinderGeometry args={[0.04, 0.09, 0.7, 8]} />
        <meshBasicMaterial color="#b9c4ff" transparent opacity={0.55} />
      </mesh>
      <mesh position-y={0.95}>
        <cylinderGeometry args={[0.72, 0.95, 0.9, 20, 1, true]} />
        <meshBasicMaterial color="#9fb0ff" transparent opacity={0.13} side={2} depthWrite={false} />
      </mesh>
      <Sparkles position-y={1.5} count={30} scale={[1.8, 1.4, 1.8]} size={2.2} speed={1.4} color="#cfd8ff" />
    </group>
  )
}

function Bench({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.8, 0.4, 0.28]} position-y={0.4} />
      </RigidBody>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]} castShadow>
          <boxGeometry args={[0.08, 0.44, 0.5]} />
          <meshStandardMaterial color="#2f2a3d" />
        </mesh>
      ))}
      {[-0.15, 0, 0.15].map((z) => (
        <mesh key={z} position={[0, 0.46, z]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.05, 0.12]} />
          <meshStandardMaterial color={theme.wood} />
        </mesh>
      ))}
      {[0.62, 0.78].map((y) => (
        <mesh key={y} position={[0, y, -0.25]} rotation-x={0.15} castShadow>
          <boxGeometry args={[1.6, 0.1, 0.04]} />
          <meshStandardMaterial color={theme.wood} />
        </mesh>
      ))}
    </group>
  )
}

function Benches() {
  const [x, z] = PLAZA
  return [45, 135, 225, 315].map((deg) => {
    const a = (deg * Math.PI) / 180
    return <Bench key={deg} position={[x + Math.cos(a) * 4.3, 0, z + Math.sin(a) * 4.3]} rotation={Math.atan2(-Math.cos(a), -Math.sin(a))} />
  })
}

// ---------- Hoguera con troncos para sentarse ----------
function Campfire() {
  const high = useGame((s) => s.quality === 'high')
  const [x, z] = CAMPFIRE
  const light = useRef()
  const flames = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (light.current) light.current.intensity = 9 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 1.5
    flames.current.forEach((f, i) => {
      if (!f) return
      f.scale.y = 1 + Math.sin(t * (9 + i * 2) + i) * 0.18
      f.rotation.y = t * (1 + i * 0.4)
    })
  })
  const stones = 10
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.3, 0.75]} position-y={0.3} />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.4
          return <CuboidCollider key={i} args={[0.7, 0.22, 0.22]} position={[Math.cos(a) * 2, 0.22, Math.sin(a) * 2]} rotation={[0, -a + Math.PI / 2, 0]} />
        })}
      </RigidBody>
      {Array.from({ length: stones }, (_, i) => {
        const a = (i / stones) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.7, 0.08, Math.sin(a) * 0.7]} rotation={[i, i * 2, 0]} castShadow>
            <dodecahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial color="#59536b" flatShading />
          </mesh>
        )
      })}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position-y={0.12} rotation={[0, (i * Math.PI) / 4, Math.PI / 2 - 0.35]}>
          <cylinderGeometry args={[0.06, 0.07, 0.8, 6]} />
          <meshStandardMaterial color="#4a3326" flatShading />
        </mesh>
      ))}
      {[
        [0.32, 0.7, '#ff7a1a'],
        [0.22, 0.95, '#ffb02e'],
        [0.12, 0.6, '#fff1a8'],
      ].map(([r, h, c], i) => (
        <mesh key={i} ref={(el) => (flames.current[i] = el)} position-y={0.15 + h / 2}>
          <coneGeometry args={[r, h, 5]} />
          <meshBasicMaterial color={c} toneMapped={false} transparent opacity={0.92} />
        </mesh>
      ))}
      <Sparkles position-y={1.2} count={18} scale={[0.8, 1.8, 0.8]} size={3} speed={1.2} color="#ffb02e" />
      {/* Troncos para sentarse */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4
        return (
          <mesh key={i} position={[Math.cos(a) * 2, 0.22, Math.sin(a) * 2]} rotation={[0, -a + Math.PI / 2, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 1.4, 8]} />
            <meshStandardMaterial color={theme.wood} flatShading />
          </mesh>
        )
      })}
      {high && <pointLight ref={light} position-y={1} intensity={10} distance={9} decay={1.6} color="#ff9a3c" />}
    </group>
  )
}

// ---------- Estanque con nenúfares ----------
function Pond() {
  const [x, z] = POND
  const pads = useRef([])
  const padData = useMemo(() => {
    const r = mulberry32(3)
    return Array.from({ length: 7 }, () => ({ a: r() * Math.PI * 2, d: 0.8 + r() * 2.2, s: 0.25 + r() * 0.2, flower: r() > 0.6 }))
  }, [])
  useFrame(({ clock }) => {
    pads.current.forEach((p, i) => {
      if (p) p.position.y = 0.06 + Math.sin(clock.elapsedTime * 1.4 + i) * 0.015
    })
  })
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1, 3.7]} position-y={1} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} position-y={0.04}>
        <circleGeometry args={[3.8, 40]} />
        <WaterMaterial color="#2f4a7a" deep="#141b3a" />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 3.95, 0.1, Math.sin(a) * 3.95]} rotation={[i, i * 3, 0]} castShadow>
            <dodecahedronGeometry args={[0.24 + (i % 3) * 0.06, 0]} />
            <meshStandardMaterial color={i % 2 ? '#5a5373' : '#4a4560'} flatShading />
          </mesh>
        )
      })}
      {padData.map((p, i) => (
        <group key={i} ref={(el) => (pads.current[i] = el)} position={[Math.cos(p.a) * p.d, 0.06, Math.sin(p.a) * p.d]}>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[p.s, 10, 0.4, Math.PI * 2 - 0.4]} />
            <meshStandardMaterial color="#3f7a55" side={2} />
          </mesh>
          {p.flower && (
            <mesh position-y={0.05}>
              <coneGeometry args={[0.08, 0.1, 6]} />
              <meshBasicMaterial color="#f9a8d4" />
            </mesh>
          )}
        </group>
      ))}
      {/* Juncos */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = 2.2 + (i / 14) * 1.6
        return (
          <group key={i} position={[Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4]} rotation-z={Math.sin(i) * 0.15}>
            <mesh position-y={0.5}>
              <cylinderGeometry args={[0.015, 0.02, 1 + (i % 3) * 0.2, 4]} />
              <meshStandardMaterial color="#4d7a52" />
            </mesh>
            {i % 2 === 0 && (
              <mesh position-y={1 + (i % 3) * 0.1}>
                <capsuleGeometry args={[0.035, 0.15, 2, 6]} />
                <meshStandardMaterial color="#6b4a2f" />
              </mesh>
            )}
          </group>
        )
      })}
      <Sparkles position-y={0.8} count={14} scale={[6, 1.2, 6]} size={4} speed={0.3} color="#d9f99d" />
    </group>
  )
}

// Parterres de flores con valla junto a la salida de la habitación
function FlowerBeds() {
  return [-1, 1].map((s) => (
    <group key={s} position={[s * 3.3, 0, -6.6]}>
      <mesh position-y={0.1} receiveShadow>
        <boxGeometry args={[2.6, 0.2, 1.4]} />
        <meshStandardMaterial color="#3a2b24" />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <group key={i} position={[-1.1 + (i % 7) * 0.37, 0.2, -0.35 + Math.floor(i / 7) * 0.6]}>
          <mesh position-y={0.14}>
            <cylinderGeometry args={[0.012, 0.012, 0.28, 4]} />
            <meshStandardMaterial color="#4d7a52" />
          </mesh>
          <mesh position-y={0.3}>
            <icosahedronGeometry args={[0.065, 0]} />
            <meshBasicMaterial color={['#f472b6', '#f5b84a', theme.accent, '#f4f2fb'][(i + (s > 0 ? 1 : 0)) % 4]} />
          </mesh>
        </group>
      ))}
      {/* Valla pequeña */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-1.3 + i * 0.37, 0.3, 0.75]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.04]} />
          <meshStandardMaterial color="#e9e6f5" />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.75]}>
        <boxGeometry args={[2.7, 0.05, 0.03]} />
        <meshStandardMaterial color="#e9e6f5" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.35, 0.4, 0.75]} position-y={0.4} />
      </RigidBody>
    </group>
  ))
}

function Mailbox({ position }) {
  const flag = useRef()
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.z = -0.3 + Math.sin(clock.elapsedTime * 2) * 0.08
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.25, 0.6, 0.3]} position-y={0.6} />
      </RigidBody>
      <mesh position-y={0.5}>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color={theme.woodDark} />
      </mesh>
      <mesh position-y={1.1} castShadow>
        <boxGeometry args={[0.36, 0.3, 0.55]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>
      <mesh position={[0, 1.25, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 0.36, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>
      <group ref={flag} position={[0.2, 1.15, -0.15]}>
        <mesh position-y={0.15}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>
        <mesh position={[0, 0.27, 0.06]}>
          <boxGeometry args={[0.02, 0.1, 0.12]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>
      </group>
    </group>
  )
}

// ---------- Hierba, flores, setas brillantes, rocas y arbustos (instanciados) ----------
function scatter(n, seed, pad, extra) {
  const r = mulberry32(seed)
  const out = []
  for (let tries = 0; tries < n * 6 && out.length < n; tries++) {
    const x = BOUNDS.minX + 2 + r() * (BOUNDS.maxX - BOUNDS.minX - 4)
    const z = BOUNDS.minZ + 2 + r() * (BOUNDS.maxZ - BOUNDS.minZ - 4)
    if (isFree(x, z, pad) && (!extra || extra(x, z))) out.push({ x, z, r: r(), s: r(), t: r() })
  }
  return out
}

function Instances({ items, matrix, color, castShadow, children }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const o = new Object3D()
    const c = new Color()
    items.forEach((it, i) => {
      matrix(o, it)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
      if (color) ref.current.setColorAt(i, c.set(color(it)))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [items, matrix, color])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow} receiveShadow>
      {children}
    </instancedMesh>
  )
}

const GRASS = ['#2f4a46', '#33524a', '#3a4a63', '#2d4338']
const FLOWERS = ['#f472b6', '#f5b84a', '#8b8bff', '#f4f2fb', '#7dd3fc']
const SHROOMS = ['#7dd3fc', '#c4b5fd', '#f0abfc', '#86efac']

function Scatter() {
  const high = useGame((s) => s.quality === 'high')
  const data = useMemo(() => {
    const tufts = scatter(520, 11, 0.3)
    const blades = tufts.flatMap((t) => [0, 1, 2].map((k) => ({ ...t, k })))
    const flowers = scatter(240, 21, 0.4)
    const shrooms = scatter(40, 31, 1, (x, z) => Math.abs(x) > 12 || z < -30 || z > -12).flatMap((m) =>
      [0, 1, 2].map((k) => ({ ...m, k })),
    )
    const rocks = scatter(46, 41, 1.2)
    const bushes = scatter(60, 51, 1.2)
    return { blades, flowers, shrooms, rocks, bushes }
  }, [])

  return (
    <group>
      {high && (
        <>
      <Instances
        items={data.blades}
        matrix={(o, b) => {
          o.position.set(b.x + Math.cos(b.k * 2.1 + b.r * 6) * 0.08, 0.13 + b.s * 0.05, b.z + Math.sin(b.k * 2.1 + b.r * 6) * 0.08)
          o.rotation.set(Math.cos(b.k * 2 + b.r) * 0.35, b.r * 6, Math.sin(b.k * 2 + b.r) * 0.35)
          o.scale.set(1, 0.7 + b.s * 0.8, 1)
        }}
        color={(b) => GRASS[Math.floor(b.t * GRASS.length)]}
      >
        <coneGeometry args={[0.05, 0.32, 3]} />
        <meshStandardMaterial flatShading />
      </Instances>

      <Instances
        items={data.flowers}
        matrix={(o, f) => {
          o.position.set(f.x, 0.14, f.z)
          o.rotation.set(0, 0, 0)
          o.scale.set(1, 0.8 + f.s * 0.6, 1)
        }}
      >
        <cylinderGeometry args={[0.012, 0.012, 0.28, 4]} />
        <meshStandardMaterial color="#3f6b4a" />
      </Instances>
      <Instances
        items={data.flowers}
        matrix={(o, f) => {
          o.position.set(f.x, 0.28 + f.s * 0.17, f.z)
          o.rotation.set(f.r, f.t, 0)
          o.scale.setScalar(0.8 + f.r * 0.5)
        }}
        color={(f) => FLOWERS[Math.floor(f.t * FLOWERS.length)]}
      >
        <icosahedronGeometry args={[0.06, 0]} />
        <meshBasicMaterial />
      </Instances>

      {/* Setas que brillan en la oscuridad */}
      <Instances
        items={data.shrooms}
        matrix={(o, m) => {
          const s = 0.6 + ((m.k * 0.37 + m.s) % 1) * 0.7
          o.position.set(m.x + Math.cos(m.k * 2.4) * 0.22, 0.1 * s, m.z + Math.sin(m.k * 2.4) * 0.22)
          o.rotation.set(0, 0, 0)
          o.scale.setScalar(s)
        }}
      >
        <cylinderGeometry args={[0.03, 0.04, 0.2, 5]} />
        <meshStandardMaterial color="#e9e6f5" />
      </Instances>
      <Instances
        items={data.shrooms}
        matrix={(o, m) => {
          const s = 0.6 + ((m.k * 0.37 + m.s) % 1) * 0.7
          o.position.set(m.x + Math.cos(m.k * 2.4) * 0.22, 0.2 * s, m.z + Math.sin(m.k * 2.4) * 0.22)
          o.rotation.set(0, m.r * 6, 0)
          o.scale.setScalar(s)
        }}
        color={(m) => SHROOMS[Math.floor(m.t * SHROOMS.length)]}
      >
        <sphereGeometry args={[0.11, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial toneMapped={false} />
      </Instances>

        </>
      )}
      <RigidBody type="fixed" colliders={false}>
        {data.rocks.map((r, i) => (
          <BallCollider key={i} args={[0.35 + r.s * 0.5]} position={[r.x, 0.1, r.z]} />
        ))}
        {data.bushes.map((b, i) => (
          <CylinderCollider key={`b${i}`} args={[0.4, 0.4 + b.s * 0.35]} position={[b.x, 0.4, b.z]} />
        ))}
      </RigidBody>
      <Instances
        items={data.rocks}
        castShadow
        matrix={(o, r) => {
          o.position.set(r.x, 0.1, r.z)
          o.rotation.set(r.r * 3, r.t * 6, r.s)
          o.scale.set(0.4 + r.s * 0.6, 0.3 + r.s * 0.4, 0.4 + r.t * 0.6)
        }}
        color={(r) => (r.t > 0.5 ? '#4a4560' : '#56506d')}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </Instances>
      <Instances
        items={data.bushes}
        castShadow
        matrix={(o, b) => {
          const s = 0.5 + b.s * 0.45
          o.position.set(b.x, s * 0.7, b.z)
          o.rotation.set(b.r, b.t * 6, 0)
          o.scale.set(s * 1.25, s, s * 1.25)
        }}
        color={(b) => theme.foliage[Math.floor(b.t * 3)]}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading />
      </Instances>
    </group>
  )
}

function SkyBody() {
  const day = useGame((s) => s.timeOfDay === 'day')
  return (
    <group position={[-34, 42, -105]}>
      <mesh>
        <icosahedronGeometry args={[day ? 6 : 4.5, 2]} />
        <meshBasicMaterial color={day ? '#fff4c2' : '#efeaff'} fog={false} toneMapped={false} />
      </mesh>
      <Billboard>
        <mesh>
          <planeGeometry args={[30, 30]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            fog={false}
            vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
            fragmentShader={`varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.5) * 0.45; gl_FragColor = vec4(0.62, 0.6, 1.0, a); }`}
          />
        </mesh>
      </Billboard>
    </group>
  )
}

function Fireflies() {
  const show = useGame((s) => s.quality === 'high' && s.timeOfDay === 'night')
  if (!show) return null
  const spots = [
    [-26, -6], [28, -32], [-28, -46], [26, -56], [-4, 6], [8, -45],
  ]
  return spots.map(([x, z]) => (
    <Sparkles key={`${x}${z}`} position={[x, 1.4, z]} count={22} scale={[9, 2.5, 9]} size={4} speed={0.35} color="#e6f99d" />
  ))
}

// Volumen de los sonidos de ambiente según la distancia al jugador
function AudioZones() {
  useFrame(() => {
    const p = player.position
    const near = (pt, r) => Math.max(0, 1 - Math.hypot(p.x - pt[0], p.z - pt[1]) / r)
    setZone('fountain', near(PLAZA, 13) ** 1.5)
    setZone('fire', near(CAMPFIRE, 11) ** 1.5)
  })
  return null
}
