import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { Color, IcosahedronGeometry, Object3D, Vector3 } from 'three'
import { Trail } from '@react-three/drei'
import { DEBUG, useGame, saveBest, focusCamera, slowMotion } from '../../state/store'
import { shake } from '../CameraRig'
import { theme } from '../../theme'
import { sfx } from '../../audio/sfx'
import { Label, Board, Interactable } from '../common'
import { effects } from '../Effects'
import { useKickable } from '../kick'
import { PITCH, PITCH_CX as CX } from '../layout'

const { x1, x2, z1, z2, goalHalf: GH, goalHeight: GY, goalDepth: GD } = PITCH
const BALL_R = 0.3
const BALL_SPOT = [CX, BALL_R + 0.05, -52]
const KEEPER_Z = z1 + 0.6
const DURATION = 60
const WHITE = '#e9e6f5'

// Estado del reto (fuera de React: se toca cada frame)
const match = { goalLock: false, resetAt: 0, outSince: 0, countdownT: 0, endT: 0, celebrate: 0, followUntil: 0, react: false, dive: null }

export default function Football() {
  const ball = useRef()
  const keeper = useRef()
  const keeperVis = useRef()

  useKickable('football', ball, {
    label: 'Balón',
    radius: BALL_R,
    minSpeed: 5,
    maxSpeed: 17,
    lift: 5,
    // Ayuda de puntería: respeta hacia dónde apuntas y solo corrige los tiros que irían fuera
    aim: (b, dx, dz) => {
      if (b.z > z2 || b.z < z1 || dz > -0.2) return null
      const cross = b.x + (dx / dz) * (z1 - b.z) // dónde cruzaría la línea de gol
      return { x: Math.max(CX - GH + 0.45, Math.min(CX + GH - 0.45, cross)), z: z1, strength: 1 }
    },
    onKick: (charge) => {
      match.followUntil = performance.now() + (charge > 0.45 ? 1300 : 0)
      // ¿Reacciona el portero a este tiro? (más probable cuantos más goles llevas)
      const f = useGame.getState().football
      match.react = Math.random() < (f.status === 'playing' ? 0.45 + Math.min(f.score, 6) * 0.06 : 0.45)
      match.dive = null
    },
  })

  const resetBall = () => {
    const rb = ball.current
    if (!rb) return
    rb.setTranslation({ x: BALL_SPOT[0], y: BALL_SPOT[1] + 0.6, z: BALL_SPOT[2] }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    match.goalLock = false
    match.outSince = 0
  }

  if (DEBUG) window.__resetFootball = () => resetBall()

  const startChallenge = () => {
    const f = useGame.getState().football
    if (f.status === 'countdown') return
    useGame.getState().setFootball({ status: 'countdown', countdown: 3, score: 0, timeLeft: DURATION })
    match.countdownT = 3
    sfx.beep()
    resetBall()
  }

  const onGoal = () => {
    if (match.goalLock) return
    match.goalLock = true
    match.resetAt = performance.now() + 1700
    match.celebrate = 2.5
    const { football: f, setFootball, showToast } = useGame.getState()
    sfx.goal()
    effects.confetti(CX, 2.2, z1 - 0.4)
    slowMotion(1100)
    shake.amount = 0.35
    useGame.getState().unlock('goal')
    if (f.status === 'playing') {
      const score = f.score + 1
      setFootball({ score })
      if (score >= 3) useGame.getState().unlock('hattrick')
      showToast('¡GOL!', `${score} ${score === 1 ? 'gol' : 'goles'} en el reto`)
    } else {
      showToast('¡GOL!', 'Prueba el reto de 60 s en la entrada del campo')
    }
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const { football: f, setFootball, showToast } = useGame.getState()

    // --- Cuenta atrás y cronómetro
    if (f.status === 'countdown') {
      match.countdownT -= dt
      const n = Math.ceil(match.countdownT)
      if (n !== f.countdown) {
        if (n > 0) sfx.beep()
        setFootball({ countdown: n })
      }
      if (match.countdownT <= 0) {
        sfx.whistle()
        setFootball({ status: 'playing', timeLeft: DURATION, countdown: 0 })
      }
    } else if (f.status === 'playing') {
      const t = Math.max(0, f.timeLeft - dt)
      useGame.setState((s) => ({ football: { ...s.football, timeLeft: t } }))
      if (t <= 0) {
        sfx.whistle(true)
        const record = f.score > f.best
        if (record) saveBest('pf3d-football', f.score)
        setFootball({ status: 'done', best: Math.max(f.best, f.score) })
        showToast(record ? '¡Nuevo récord!' : '¡Tiempo!', `${f.score} ${f.score === 1 ? 'gol' : 'goles'} en 60 segundos`, record ? 'gold' : 'accent')
        if (record) sfx.record()
        match.endT = 4
      }
    } else if (f.status === 'done') {
      match.endT -= dt
      if (match.endT <= 0) setFootball({ status: 'idle' })
    }

    // --- Balón: recolocar tras gol o si sale del campo
    const rb = ball.current
    if (rb) {
      const b = rb.translation()
      if (performance.now() < match.followUntil) focusCamera(b.x, b.z, 0.45)
      if (match.goalLock && performance.now() > match.resetAt) resetBall()
      const out = b.x < x1 - 0.8 || b.x > x2 + 0.8 || b.z > z2 + 1.2 || b.z < z1 - GD - 1 || b.y < -2
      if (out) {
        match.outSince += dt
        if (match.outSince > 1.2) resetBall()
      } else match.outSince = 0
    }

    // --- Portero: patrulla y sigue al balón cuando se acerca
    const kp = keeper.current
    if (kp && rb) {
      const b = rb.translation()
      const cur = kp.translation()
      const t = state.clock.elapsedTime
      const level = f.status === 'playing' ? f.score : 0
      const patrol = CX + Math.sin(t * (0.9 + level * 0.06)) * (GH - 0.7)
      const threat = b.z < -50 ? Math.min(1, (-50 - b.z) / 8) : 0
      const targetX = Math.max(CX - GH + 0.5, Math.min(CX + GH - 0.5, patrol + (b.x - patrol) * threat * 0.6))
      // Estirada: si el tiro va rápido hacia la portería, se lanza hacia donde llegará
      const v = rb.linvel()
      if (match.react && !match.dive && v.z < -6 && b.z < -52 && b.z > KEEPER_Z) {
        const px = b.x + v.x * ((KEEPER_Z - b.z) / v.z)
        if (Math.abs(px - CX) < GH + 0.6 && Math.abs(px - cur.x) > 0.5) match.dive = { x: px, dir: Math.sign(px - cur.x), t: 0 }
      }
      let nx
      if (match.dive) {
        const d = match.dive
        d.t += dt
        const step = 6.5 * dt
        nx = cur.x + Math.max(-step, Math.min(step, d.x - cur.x))
        if (d.t > 1.1) match.dive = null
      } else {
        const maxStep = (2.6 + level * 0.18) * dt
        nx = cur.x + Math.max(-maxStep, Math.min(maxStep, targetX - cur.x))
      }
      nx = Math.max(CX - GH + 0.3, Math.min(CX + GH - 0.3, nx))
      kp.setNextKinematicTranslation({ x: nx, y: 0.9, z: KEEPER_Z })
      if (keeperVis.current) {
        const k = keeperVis.current
        const diveAmt = match.dive ? Math.sin(Math.min(1, match.dive.t / 0.45) * Math.PI * 0.5) : 0
        const lean = match.dive ? -match.dive.dir * 1.15 * diveAmt : (targetX - cur.x) * -0.25
        k.rotation.z += (lean - k.rotation.z) * Math.min(1, dt * 14)
        k.position.y = match.dive ? -0.25 * diveAmt : Math.abs(Math.sin(t * 7)) * 0.06
      }
    }
    match.celebrate = Math.max(0, match.celebrate - dt)
  })

  return (
    <group>
      <Turf />
      <Goal onGoal={onGoal} />
      <Fence />
      <Floodlights />
      <Bleachers />
      <Scoreboard />
      <EntranceArch />

      {/* Portero */}
      <RigidBody ref={keeper} type="kinematicPosition" position={[CX, 0.9, KEEPER_Z]} colliders={false}>
        <CuboidCollider args={[0.6, 0.88, 0.22]} />
        <group ref={keeperVis} position-y={-0.9}>
          <KeeperModel />
        </group>
      </RigidBody>

      {/* Balón */}
      <RigidBody
        ref={ball}
        name="football"
        position={BALL_SPOT}
        colliders={false}
        linearDamping={0.25}
        angularDamping={0.6}
        gravityScale={0.65}
        ccd
        onCollisionEnter={({ other }) => {
          const v = ball.current?.linvel()
          if (!v) return
          const speed = Math.hypot(v.x, v.y, v.z)
          if (other.rigidBodyObject?.name === 'post') sfx.pin(speed * 1.5)
          else sfx.bounce(speed)
        }}
      >
        <BallCollider args={[BALL_R]} mass={0.45} restitution={0.62} friction={0.8} />
        <Trail width={0.7} length={3.5} color={theme.accent} attenuation={(w) => w * w}>
          <BallModel />
        </Trail>
      </RigidBody>

      <Interactable
        id="football-start"
        position={[CX, 1, z2 - 1.6]}
        size={[1.1, 1, 1.1]}
        title="Reto de goles · 60 s"
        subtitle="Mete todos los goles que puedas al portero"
        actions={[{ key: 'E', label: 'Empezar reto', run: startChallenge }]}
      />
    </group>
  )
}

function BallModel() {
  const patches = useMemo(() => {
    // Las 12 "manchas" negras van en los vértices de un icosaedro
    const ico = new IcosahedronGeometry(1, 0)
    const pos = ico.attributes.position
    const seen = []
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i).normalize()
      if (!seen.some((s) => s.distanceTo(v) < 0.01)) seen.push(v)
    }
    ico.dispose()
    return seen
  }, [])
  const o = useMemo(() => new Object3D(), [])
  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[BALL_R, 2]} />
        <meshStandardMaterial color="#f4f2fb" flatShading roughness={0.5} />
      </mesh>
      {patches.map((n, i) => {
        o.position.copy(n).multiplyScalar(BALL_R * 0.985)
        o.lookAt(n.clone().multiplyScalar(2))
        return (
          <mesh key={i} position={o.position.clone()} quaternion={o.quaternion.clone()}>
            <circleGeometry args={[BALL_R * 0.36, 5]} />
            <meshStandardMaterial color="#1c1a26" />
          </mesh>
        )
      })}
    </group>
  )
}

function KeeperModel() {
  const shirt = '#f59e0b'
  const glove = '#86efac'
  return (
    <group>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.39, 0]} castShadow>
          <boxGeometry args={[0.18, 0.78, 0.2]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <mesh position-y={1.06} castShadow>
        <boxGeometry args={[0.54, 0.6, 0.3]} />
        <meshStandardMaterial color={shirt} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.36, 1.3, 0]} rotation-z={s * 2.4}>
          <mesh position-y={-0.24} castShadow>
            <boxGeometry args={[0.14, 0.5, 0.16]} />
            <meshStandardMaterial color={shirt} />
          </mesh>
          <mesh position-y={-0.55}>
            <boxGeometry args={[0.2, 0.18, 0.2]} />
            <meshStandardMaterial color={glove} />
          </mesh>
        </group>
      ))}
      <mesh position-y={1.56} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.38]} />
        <meshStandardMaterial color="#c68a5e" />
      </mesh>
      <mesh position={[0, 1.79, -0.02]}>
        <boxGeometry args={[0.43, 0.1, 0.42]} />
        <meshStandardMaterial color="#1a1410" />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 1.58, 0.195]}>
          <boxGeometry args={[0.06, 0.07, 0.01]} />
          <meshBasicMaterial color="#1a1626" />
        </mesh>
      ))}
    </group>
  )
}

function Line({ a, b, w = 0.09 }) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const len = Math.hypot(dx, dz)
  return (
    <mesh position={[(a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2]} rotation={[-Math.PI / 2, 0, Math.atan2(dx, dz)]}>
      <planeGeometry args={[w, len]} />
      <meshBasicMaterial color={WHITE} transparent opacity={0.8} />
    </mesh>
  )
}

function Turf() {
  const stripes = 13
  const length = z2 - (z1 - 2)
  const step = length / stripes
  const spotZ = z1 + 3.5
  const arcHalf = Math.acos(1.5 / 2.5)
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: stripes }, (_, i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[CX, 0.02, z1 - 2 + step * (i + 0.5)]} receiveShadow>
            <planeGeometry args={[x2 - x1 + 1, step]} />
            <meshStandardMaterial color={i % 2 ? '#2c5a40' : '#326447'} roughness={1} />
          </mesh>
        ))}
      </RigidBody>
      <Line a={[x1, z1]} b={[x1, z2]} />
      <Line a={[x2, z1]} b={[x2, z2]} />
      <Line a={[x1, z1]} b={[x2, z1]} />
      <Line a={[x1, z2]} b={[x2, z2]} />
      {/* Área grande y área pequeña */}
      <Line a={[CX - 5, z1]} b={[CX - 5, z1 + 5]} />
      <Line a={[CX + 5, z1]} b={[CX + 5, z1 + 5]} />
      <Line a={[CX - 5, z1 + 5]} b={[CX + 5, z1 + 5]} />
      <Line a={[CX - 3, z1]} b={[CX - 3, z1 + 2]} />
      <Line a={[CX + 3, z1]} b={[CX + 3, z1 + 2]} />
      <Line a={[CX - 3, z1 + 2]} b={[CX + 3, z1 + 2]} />
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0.036, spotZ]}>
        <circleGeometry args={[0.13, 16]} />
        <meshBasicMaterial color={WHITE} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0.035, spotZ]}>
        <ringGeometry args={[2.45, 2.54, 40, 1, Math.PI * 1.5 - arcHalf, arcHalf * 2]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.8} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[CX, 0.035, z2]}>
        <ringGeometry args={[2.95, 3.04, 40, 1, 0, Math.PI]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.8} />
      </mesh>
      {/* Banderines de córner */}
      {[x1, x2].map((x) => (
        <CornerFlag key={x} x={x} z={z1} />
      ))}
    </group>
  )
}

function CornerFlag({ x, z }) {
  const flag = useRef()
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3 + x) * 0.35
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.6}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
        <meshStandardMaterial color="#e9e6f5" />
      </mesh>
      <group ref={flag} position-y={1.08}>
        <mesh position-x={0.18}>
          <planeGeometry args={[0.36, 0.24]} />
          <meshStandardMaterial color={theme.pending} side={2} />
        </mesh>
      </group>
    </group>
  )
}

function Goal({ onGoal }) {
  const netMat = (
    <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.32} />
  )
  const back = z1 - GD
  const postMat = <meshStandardMaterial color="#f4f2fb" roughness={0.3} metalness={0.2} />
  return (
    <group>
      <RigidBody type="fixed" colliders={false} name="post">
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[CX + s * GH, GY / 2, z1]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, GY, 10]} />
              {postMat}
            </mesh>
            <CylinderCollider args={[GY / 2, 0.07]} position={[CX + s * GH, GY / 2, z1]} />
            {/* Tubos traseros */}
            <mesh position={[CX + s * GH, GY / 2, back]}>
              <cylinderGeometry args={[0.035, 0.035, GY, 6]} />
              {postMat}
            </mesh>
            <mesh position={[CX + s * GH, GY, (z1 + back) / 2]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.035, 0.035, GD, 6]} />
              {postMat}
            </mesh>
          </group>
        ))}
        <mesh position={[CX, GY, z1]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.07, 0.07, GH * 2 + 0.14, 10]} />
          {postMat}
        </mesh>
        <CuboidCollider args={[GH, 0.07, 0.07]} position={[CX, GY, z1]} />
      </RigidBody>

      {/* Red: visual + colisión para que el balón se quede dentro */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[GH, GY / 2, 0.05]} position={[CX, GY / 2, back - 0.05]} restitution={0.1} />
        <CuboidCollider args={[0.05, GY / 2, GD / 2]} position={[CX - GH - 0.05, GY / 2, (z1 + back) / 2]} restitution={0.1} />
        <CuboidCollider args={[0.05, GY / 2, GD / 2]} position={[CX + GH + 0.05, GY / 2, (z1 + back) / 2]} restitution={0.1} />
        <CuboidCollider args={[GH, 0.05, GD / 2]} position={[CX, GY + 0.05, (z1 + back) / 2]} restitution={0.1} />
      </RigidBody>
      <mesh position={[CX, GY / 2, back]}>
        <planeGeometry args={[GH * 2, GY, 22, 9]} />
        {netMat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[CX + s * GH, GY / 2, (z1 + back) / 2]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[GD, GY, 7, 9]} />
          {netMat}
        </mesh>
      ))}
      <mesh position={[CX, GY, (z1 + back) / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[GH * 2, GD, 22, 7]} />
        {netMat}
      </mesh>

      {/* Sensor de gol: dentro de la portería, detrás de la línea */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          sensor
          args={[GH - 0.1, GY / 2 - 0.05, GD / 2 - 0.1]}
          position={[CX, GY / 2, z1 - GD / 2 - 0.1]}
          onIntersectionEnter={({ other }) => other.rigidBodyObject?.name === 'football' && onGoal()}
        />
      </RigidBody>
    </group>
  )
}

// Valla baja alrededor del campo (con hueco de entrada); la colisión es más alta para que el balón no escape
function Fence() {
  const backZ = z1 - GD - 0.6
  const gap = 2
  const segments = [
    { a: [x1 - 0.4, backZ], b: [x1 - 0.4, z2 + 0.4] },
    { a: [x2 + 0.4, backZ], b: [x2 + 0.4, z2 + 0.4] },
    { a: [x1 - 0.4, backZ], b: [x2 + 0.4, backZ] },
    { a: [x1 - 0.4, z2 + 0.4], b: [CX - gap, z2 + 0.4] },
    { a: [CX + gap, z2 + 0.4], b: [x2 + 0.4, z2 + 0.4] },
  ]
  return (
    <RigidBody type="fixed" colliders={false}>
      {segments.map(({ a, b }, i) => {
        const dx = b[0] - a[0]
        const dz = b[1] - a[1]
        const len = Math.hypot(dx, dz)
        const cx = (a[0] + b[0]) / 2
        const cz = (a[1] + b[1]) / 2
        const rot = Math.atan2(dx, dz)
        const posts = Math.max(2, Math.round(len / 2))
        return (
          <group key={i}>
            <group position={[cx, 0, cz]} rotation-y={rot}>
              <mesh position-y={0.45} castShadow>
                <boxGeometry args={[0.06, 0.12, len]} />
                <meshStandardMaterial color="#e9e6f5" />
              </mesh>
              <mesh position-y={0.22}>
                <boxGeometry args={[0.05, 0.08, len]} />
                <meshStandardMaterial color={theme.accent} />
              </mesh>
              {Array.from({ length: posts + 1 }, (_, k) => (
                <mesh key={k} position={[0, 0.27, -len / 2 + (len / posts) * k]}>
                  <boxGeometry args={[0.09, 0.54, 0.09]} />
                  <meshStandardMaterial color="#cfcbe0" />
                </mesh>
              ))}
            </group>
            <CuboidCollider args={[0.06, 1.6, len / 2]} position={[cx, 1.6, cz]} rotation={[0, rot, 0]} />
          </group>
        )
      })}
    </RigidBody>
  )
}

function Floodlights() {
  const high = useGame((s) => s.quality === 'high')
  const spots = [
    [x1 - 1.2, z1 - 1.5],
    [x2 + 1.2, z1 - 1.5],
    [x2 + 1.2, z2 + 1],
  ]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {spots.map(([x, z]) => (
          <CylinderCollider key={`${x}${z}`} args={[3.5, 0.15]} position={[x, 3.5, z]} />
        ))}
      </RigidBody>
      {spots.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position-y={3.6} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 7.2, 8]} />
            <meshStandardMaterial color="#3a3650" />
          </mesh>
          <group position-y={7.3} rotation-y={Math.atan2(CX - x, -54 - z)} rotation-x={0}>
            <mesh>
              <boxGeometry args={[1.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#2a2738" />
            </mesh>
            {[-0.35, 0, 0.35].map((dx) => (
              <mesh key={dx} position={[dx, 0, 0.11]}>
                <circleGeometry args={[0.15, 12]} />
                <meshBasicMaterial color="#f5f3ff" toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {high && <pointLight position={[CX, 7, -53]} intensity={34} distance={30} decay={1.2} color="#e9eaff" />}
    </group>
  )
}

// Gradas con público que celebra los goles
const FANS = 18
function Bleachers() {
  const bodies = useRef()
  const heads = useRef()
  const o = useMemo(() => new Object3D(), [])
  const fans = useMemo(
    () =>
      Array.from({ length: FANS }, (_, i) => {
        const row = i % 3
        return { x: x1 - 1.6 - row * 0.9, y: 0.3 + row * 0.4, z: -60 + Math.floor(i / 3) * 2.6 + (row % 2) * 0.8, seed: i * 1.7 }
      }),
    [],
  )
  useLayoutEffect(() => {
    const c = new Color()
    const shirts = [theme.accent, '#f472b6', '#86efac', '#f5b84a', '#7dd3fc', '#e9e6f5']
    const skins = ['#e3b892', '#c68a5e', '#8d5a3c', '#f1d0b0']
    fans.forEach((f, i) => {
      bodies.current.setColorAt(i, c.set(shirts[i % shirts.length]))
      heads.current.setColorAt(i, c.set(skins[(i * 7) % skins.length]))
    })
    bodies.current.instanceColor.needsUpdate = true
    heads.current.instanceColor.needsUpdate = true
  }, [fans])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const party = match.celebrate > 0
    fans.forEach((f, i) => {
      const jump = party ? Math.abs(Math.sin(t * 9 + f.seed)) * 0.35 : Math.abs(Math.sin(t * 1.5 + f.seed)) * 0.02
      o.position.set(f.x, f.y + 0.35 + jump, f.z)
      o.rotation.set(0, Math.PI / 2, party ? Math.sin(t * 12 + f.seed) * 0.15 : 0)
      o.scale.set(1, 1, 1)
      o.updateMatrix()
      bodies.current.setMatrixAt(i, o.matrix)
      o.position.y += 0.42
      o.updateMatrix()
      heads.current.setMatrixAt(i, o.matrix)
    })
    bodies.current.instanceMatrix.needsUpdate = true
    heads.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {[0, 1, 2].map((row) => (
          <group key={row}>
            <mesh position={[x1 - 1.6 - row * 0.9, 0.15 + row * 0.2, -52]} receiveShadow castShadow>
              <boxGeometry args={[0.9, 0.3 + row * 0.4, 16]} />
              <meshStandardMaterial color={row % 2 ? '#4a4560' : '#3d3852'} />
            </mesh>
            <CuboidCollider args={[0.45, 0.15 + row * 0.2, 8]} position={[x1 - 1.6 - row * 0.9, 0.15 + row * 0.2, -52]} />
          </group>
        ))}
      </RigidBody>
      <instancedMesh ref={bodies} args={[undefined, undefined, FANS]} castShadow>
        <boxGeometry args={[0.4, 0.5, 0.26]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, FANS]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial />
      </instancedMesh>
    </group>
  )
}

function Scoreboard() {
  const f = useGame((s) => s.football)
  const secs = Math.ceil(f.timeLeft)
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const status = {
    idle: 'Pulsa E en el círculo de la entrada',
    countdown: `Preparado… ${f.countdown}`,
    playing: '¡Marca todo lo que puedas!',
    done: '¡Tiempo!',
  }[f.status]
  const cols = [
    ['GOLES', String(f.score)],
    ['TIEMPO', f.status === 'idle' ? '1:00' : time],
    ['RÉCORD', String(f.best)],
  ]
  return (
    <Board position={[CX, 0, z1 - GD - 1.6]} width={7} height={2.5} base={2.6}>
      <Label fontSize={0.3} letterSpacing={0.14} position={[0, 0.85, 0]} color={theme.accent}>
        RETO DE GOLES
      </Label>
      {cols.map(([label, value], i) => (
        <group key={label} position={[(i - 1) * 2.2, -0.05, 0]}>
          <Label weight="mono" fontSize={0.62} color={f.status === 'playing' && i === 1 && secs <= 10 ? '#f87171' : theme.text}>
            {value}
          </Label>
          <Label weight="regular" fontSize={0.14} letterSpacing={0.12} position={[0, -0.48, 0]} color={theme.textMuted}>
            {label}
          </Label>
        </group>
      ))}
      <Label weight="regular" fontSize={0.15} position={[0, -0.98, 0]} color={f.status === 'playing' ? '#86efac' : theme.textMuted}>
        {status}
      </Label>
    </Board>
  )
}

function EntranceArch() {
  const w = 4.6
  return (
    <group position={[CX, 0, z2 + 0.9]}>
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((s) => (
          <CuboidCollider key={s} args={[0.12, 1.6, 0.12]} position={[(s * w) / 2, 1.6, 0]} />
        ))}
      </RigidBody>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * w) / 2, 1.6, 0]} castShadow>
          <boxGeometry args={[0.2, 3.2, 0.2]} />
          <meshStandardMaterial color={theme.woodDark} />
        </mesh>
      ))}
      <mesh position={[0, 3.25, 0]} castShadow>
        <boxGeometry args={[w + 0.5, 0.6, 0.16]} />
        <meshStandardMaterial color={theme.board} />
      </mesh>
      <Label position={[0, 3.25, 0.09]} fontSize={0.34} letterSpacing={0.2}>
        FÚTBOL
      </Label>
      <mesh position={[0, 2.93, 0.09]}>
        <planeGeometry args={[w + 0.5, 0.05]} />
        <meshBasicMaterial color={theme.accent} toneMapped={false} />
      </mesh>
    </group>
  )
}

