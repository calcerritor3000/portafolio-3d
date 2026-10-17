import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Object3D, Vector3 } from 'three'
import { Sparkles, Stars } from '@react-three/drei'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { openUrl, player, useGame } from '../state/store'
import { links, projects } from '../content'
import { theme, sky } from '../theme'
import { sfx } from '../audio/sfx'
import { Label, Board, Interactable } from './common'
import { BOUNDS, PLAZA, LINKS_AT, PROJECTS_AT, PITCH_CX, LANE, isFree, mulberry32 } from './layout'
import Decor from './Decor'
import Hologram from './Hologram'
import ProjectBoard from './ProjectBoard'
import Football from './games/Football'
import Bowling from './games/Bowling'

const groundTarget = new Color()

export default function World() {
  return (
    <group>
      <Ground />
      <Paths />
      <Signpost />
      <LinkBoards />
      <ProjectBoards />
      <Football />
      <Bowling />
      <Decor />
      <Hologram />
      <Crates />
      <Lamps />
      <Trees />
      <NightSky />
      <HighOnly>
        <Sparkles position={[PLAZA[0], 1.5, PLAZA[1]]} count={36} scale={[11, 2.5, 11]} size={3} speed={0.3} color={theme.accent} />
        <pointLight position={[PLAZA[0], 3.2, PLAZA[1]]} intensity={14} distance={16} decay={1.5} color={theme.accent} />
      </HighOnly>
    </group>
  )
}

// Solo se dibuja con calidad alta (luces puntuales, partículas, hierba…)
export function HighOnly({ children }) {
  return useGame((s) => s.quality === 'high') ? children : null
}

function NightSky() {
  const night = useGame((s) => s.timeOfDay === 'night')
  const high = useGame((s) => s.quality === 'high')
  return night ? <Stars radius={90} depth={30} count={high ? 1200 : 500} factor={3} saturation={0} fade speed={0.4} /> : null
}

function Ground() {
  const mat = useRef()
  useFrame((_, dt) => mat.current?.color.lerp(groundTarget.set(sky[useGame.getState().timeOfDay].ground), Math.min(1, dt * 2)))
  const w = BOUNDS.maxX - BOUNDS.minX
  const d = BOUNDS.maxZ - BOUNDS.minZ
  const cx = (BOUNDS.maxX + BOUNDS.minX) / 2
  const cz = (BOUNDS.maxZ + BOUNDS.minZ) / 2
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w + 60, d + 60]} />
        <meshStandardMaterial ref={mat} color={theme.ground} roughness={1} />
      </mesh>
      <CuboidCollider args={[w / 2 + 30, 0.5, d / 2 + 30]} position={[cx, -0.5, cz]} />
      {/* Muros invisibles del borde */}
      <CuboidCollider args={[0.5, 4, d / 2]} position={[BOUNDS.minX, 4, cz]} />
      <CuboidCollider args={[0.5, 4, d / 2]} position={[BOUNDS.maxX, 4, cz]} />
      <CuboidCollider args={[w / 2, 4, 0.5]} position={[cx, 4, BOUNDS.minZ]} />
      <CuboidCollider args={[w / 2, 4, 0.5]} position={[cx, 4, BOUNDS.maxZ]} />
    </RigidBody>
  )
}

function Flat({ position, size, color, y = 0.012 }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[position[0], y, position[1]]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

function Paths() {
  return (
    <group>
      <Flat position={[0, -10.8]} size={[2.6, 12.4]} color={theme.path} />
      <Flat position={[0, -32.5]} size={[2.6, 11.5]} color={theme.path} />
      <Flat position={[(LANE.x + PITCH_CX) / 2, -39]} size={[LANE.x - PITCH_CX + 2.4, 2.4]} color={theme.path} />
      <Flat position={[-7, PLAZA[1]]} size={[4, 2.4]} color={theme.path} />
      <Flat position={[7, PLAZA[1]]} size={[4, 2.4]} color={theme.path} />
      {/* Losetas hacia la hoguera */}
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} rotation-x={-Math.PI / 2} position={[-2.2 - k * 1.25, 0.015, -8.2 - Math.sin(k) * 0.3]} receiveShadow>
          <circleGeometry args={[0.38 - (k % 2) * 0.06, 7]} />
          <meshStandardMaterial color={theme.plaza} />
        </mesh>
      ))}
      {/* Plaza central */}
      <mesh rotation-x={-Math.PI / 2} position={[PLAZA[0], 0.02, PLAZA[1]]} receiveShadow>
        <circleGeometry args={[5.5, 40]} />
        <meshStandardMaterial color={theme.plaza} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[PLAZA[0], 0.025, PLAZA[1]]}>
        <ringGeometry args={[5.3, 5.5, 64]} />
        <meshBasicMaterial color={theme.accent} transparent opacity={0.45} toneMapped={false} />
      </mesh>
      {/* Zonas de enlaces y proyectos */}
      <Flat position={[-15.5, -23.5]} size={[14, 13]} color={theme.zone} y={0.008} />
      <Flat position={[15.75, -23.5]} size={[14.5, 13]} color={theme.zone} y={0.008} />
      <group rotation-x={-Math.PI / 2}>
        <Label position={[-15.5, 16.4, 0.03]} fontSize={0.55} letterSpacing={0.1} color={theme.textMuted}>
          ENLACES Y CONTACTO
        </Label>
        <Label position={[15.75, 16.4, 0.03]} fontSize={0.55} letterSpacing={0.1} color={theme.textMuted}>
          PROYECTOS
        </Label>
      </group>
    </group>
  )
}

function Arrow({ position, rotation = 0 }) {
  return (
    <mesh position={position} rotation-z={rotation}>
      <circleGeometry args={[0.16, 3]} />
      <meshBasicMaterial color={theme.accent} toneMapped={false} />
    </mesh>
  )
}

// Poste de indicaciones en la plaza
function Signpost() {
  return (
    <group position={[2.7, 0, -15.6]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[1.6, 0.2]} position={[0, 1.6, 0]} />
      </RigidBody>
      <mesh position-y={1.6} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 3.2, 8]} />
        <meshStandardMaterial color={theme.woodDark} />
      </mesh>
      {[
        { y: 2.7, x: 0, w: 2.2, text: 'MINIJUEGOS', arrow: [0, 0.32, Math.PI / 2] },
        { y: 2.1, x: -1.25, w: 2.6, text: 'ENLACES Y CONTACTO', arrow: [-1.15, 0, Math.PI] },
        { y: 1.5, x: 1.1, w: 2.0, text: 'PROYECTOS', arrow: [0.85, 0, 0] },
      ].map((s) => (
        <group key={s.text} position={[s.x, s.y, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[s.w, 0.44, 0.08]} />
            <meshStandardMaterial color={theme.wood} />
          </mesh>
          <Label position={[0, 0, 0.05]} fontSize={0.17} letterSpacing={0.06}>
            {s.text}
          </Label>
          <Arrow position={[s.arrow[0], s.arrow[1], 0.05]} rotation={s.arrow[2]} />
        </group>
      ))}
    </group>
  )
}

function LinkBoards() {
  const items = [
    {
      id: 'github',
      title: 'GitHub',
      sub: links.githubUser,
      actions: [{ key: 'E', label: 'Abrir GitHub', run: () => { useGame.getState().unlock('contact'); openUrl(links.github) } }],
    },
    {
      id: 'linkedin',
      title: 'LinkedIn',
      sub: 'Jorge Calcerrada',
      actions: [{ key: 'E', label: 'Abrir LinkedIn', run: () => { useGame.getState().unlock('contact'); openUrl(links.linkedin) } }],
    },
    {
      id: 'cv',
      title: 'Currículum',
      sub: 'CV en PDF',
      actions: [{ key: 'E', label: 'Descargar CV', run: () => { useGame.getState().unlock('contact'); openUrl(links.cv) } }],
    },
    {
      id: 'contact',
      title: 'Contacto',
      sub: links.email,
      actions: [
        { key: 'E', label: 'Escribirme', run: () => { useGame.getState().unlock('contact'); window.location.href = `mailto:${links.email}` } },
        { key: 'R', label: 'Copiar email', run: () => navigator.clipboard?.writeText(links.email) },
      ],
    },
  ]
  return items.map((it, i) => {
    const [x, z] = LINKS_AT[i]
    return (
      <group key={it.id}>
        <Board position={[x, 0, z]} width={3.4} height={1.7}>
          <Label fontSize={0.46} position={[0, 0.2, 0]}>
            {it.title}
          </Label>
          <Label weight="regular" fontSize={it.id === 'contact' ? 0.15 : 0.19} color={theme.textMuted} position={[0, -0.32, 0]} maxWidth={3.1}>
            {it.sub}
          </Label>
        </Board>
        <Interactable id={it.id} position={[x, 1, z + 1.7]} size={[1.4, 1, 0.9]} title={it.title} subtitle={it.sub} actions={it.actions} />
      </group>
    )
  })
}

function ProjectBoards() {
  return projects.map((p, i) => <ProjectBoard key={p.id} project={p} position={[PROJECTS_AT[i][0], 0, PROJECTS_AT[i][1]]} />)
}

// Cajas apilables que se pueden derribar empujándolas
function Crates() {
  const s = 0.7
  const bodies = useRef([])
  const frame = useRef(0)
  useFrame(() => {
    if (++frame.current % 30) return
    const fallen = bodies.current.filter((b, i) => b && b.translation().y < pos[i][1] - 0.25).length
    if (fallen >= 3) useGame.getState().unlock('crates')
  })
  const pos = []
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 3 - row; i++) pos.push([5 + (i + row / 2) * (s + 0.02), s / 2 + row * s + 0.01, -12.5])
  }
  return pos.map((p, i) => (
    <RigidBody
      key={i}
      ref={(el) => (bodies.current[i] = el)}
      position={p}
      colliders="cuboid"
      mass={0.6}
      friction={0.7}
      onCollisionEnter={({ target }) => {
        const v = target.rigidBody?.linvel()
        if (v) sfx.crate(Math.hypot(v.x, v.y, v.z))
      }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={i % 2 ? theme.wood : '#7d5d48'} />
      </mesh>
    </RigidBody>
  ))
}

function Lamps() {
  const spots = [
    [-1.9, -7.5], [1.9, -11.5], [-1.9, -15.5],
    [-4.4, -18.5], [4.4, -25.5], [-1.9, -30.5], [1.9, -35.5],
    [-7, -37.4], [7, -37.4], [-1.9, -40.6], [1.9, -40.6],
  ]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {spots.map(([x, z]) => (
          <CylinderCollider key={`${x},${z}`} args={[1.1, 0.12]} position={[x, 1.1, z]} />
        ))}
      </RigidBody>
      {spots.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position-y={1.1} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 2.2, 6]} />
            <meshStandardMaterial color="#2a2738" />
          </mesh>
          <mesh position-y={2.3}>
            <icosahedronGeometry args={[0.16, 0]} />
            <meshBasicMaterial color="#cfcfff" toneMapped={false} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <circleGeometry args={[1.4, 24]} />
            <meshBasicMaterial color={theme.accent} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- Árboles low-poly instanciados (3 draw calls para todo el bosque) ----------

// Los fragmentos que quedan entre la cámara y el jugador se disuelven (tramado),
// así un árbol nunca tapa al avatar.
const seeThrough = { uPlayer: { value: new Vector3() } }

function applySeeThrough(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayer = seeThrough.uPlayer
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStWorld;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 stWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          stWorld = instanceMatrix * stWorld;
        #endif
        vStWorld = (modelMatrix * stWorld).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStWorld;\nuniform vec3 uPlayer;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        vec3 stTo = uPlayer - cameraPosition;
        float stLen = length(stTo);
        vec3 stDir = stTo / stLen;
        vec3 stRel = vStWorld - cameraPosition;
        float stT = dot(stRel, stDir);
        float stDist = length(stRel - stDir * stT);
        if (stT > 0.0 && stT < stLen - 0.8) {
          float fade = 1.0 - smoothstep(1.4, 2.8, stDist);
          float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (fade * 0.9 > n) discard;
        }`,
      )
  }
  material.customProgramCacheKey = () => 'see-through'
}
function useTreeLayout() {
  return useMemo(() => {
    const rand = mulberry32(7)
    const trees = []
    const ok = (x, z, gap) => isFree(x, z, 1.8) && trees.every((t) => Math.hypot(t.x - x, t.z - z) > gap)
    // Anillo denso en el borde
    const perim = [
      ...Array.from({ length: 24 }, (_, i) => [BOUNDS.minX + 1.5 + i * 3.1, BOUNDS.minZ + 1.5]),
      ...Array.from({ length: 24 }, (_, i) => [BOUNDS.minX + 1.5 + i * 3.1, BOUNDS.maxZ - 1.5]),
      ...Array.from({ length: 28 }, (_, i) => [BOUNDS.minX + 1.5, BOUNDS.minZ + 1.5 + i * 3.1]),
      ...Array.from({ length: 28 }, (_, i) => [BOUNDS.maxX - 1.5, BOUNDS.minZ + 1.5 + i * 3.1]),
    ]
    for (const [x, z] of perim) {
      const jx = x + (rand() - 0.5) * 1.2
      const jz = z + (rand() - 0.5) * 1.2
      if (ok(jx, jz, 2.2)) trees.push({ x: jx, z: jz, s: 0.9 + rand() * 0.6, c: (rand() * 3) | 0 })
    }
    for (let tries = 0; tries < 1200 && trees.length < 240; tries++) {
      const x = BOUNDS.minX + 3 + rand() * (BOUNDS.maxX - BOUNDS.minX - 6)
      const z = BOUNDS.minZ + 3 + rand() * (BOUNDS.maxZ - BOUNDS.minZ - 6)
      if (ok(x, z, 3.4)) trees.push({ x, z, s: 0.7 + rand() * 0.7, c: (rand() * 3) | 0 })
    }
    return trees
  }, [])
}

function Trees() {
  const trees = useTreeLayout()
  const trunks = useRef()
  const crownsLow = useRef()
  const crownsTop = useRef()

  useFrame(() => {
    seeThrough.uPlayer.value.set(player.position.x, player.position.y + 0.4, player.position.z)
  })

  useLayoutEffect(() => {
    for (const m of [trunks.current, crownsLow.current, crownsTop.current]) applySeeThrough(m.material)
  }, [])

  useLayoutEffect(() => {
    const o = new Object3D()
    const color = new Color()
    trees.forEach((t, i) => {
      o.rotation.set(0, t.x * 13.7, 0)
      o.scale.setScalar(t.s)
      o.position.set(t.x, 0.6 * t.s, t.z)
      o.updateMatrix()
      trunks.current.setMatrixAt(i, o.matrix)
      o.position.set(t.x, 1.9 * t.s, t.z)
      o.updateMatrix()
      crownsLow.current.setMatrixAt(i, o.matrix)
      o.position.set(t.x, 2.9 * t.s, t.z)
      o.scale.setScalar(t.s * 0.72)
      o.updateMatrix()
      crownsTop.current.setMatrixAt(i, o.matrix)
      color.set(theme.foliage[t.c])
      crownsLow.current.setColorAt(i, color)
      crownsTop.current.setColorAt(i, color.offsetHSL(0, 0, 0.05))
    })
    for (const m of [trunks.current, crownsLow.current, crownsTop.current]) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [trees])

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {trees.map((t, i) => (
          <CylinderCollider key={i} args={[1.2 * t.s, 0.3 * t.s]} position={[t.x, 1.2 * t.s, t.z]} />
        ))}
      </RigidBody>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 1.2, 6]} />
        <meshStandardMaterial color={theme.trunk} flatShading />
      </instancedMesh>
      <instancedMesh ref={crownsLow} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[1.3, 2, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={crownsTop} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[1.05, 1.7, 7]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  )
}
