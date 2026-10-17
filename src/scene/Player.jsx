import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useKeyboardControls } from '@react-three/drei'
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier'
import { Color } from 'three'
import { DEBUG, player, isInsideRoom, useGame, touchInput, travel } from '../state/store'
import { avatar } from '../content'
import { theme } from '../theme'
import { sfx } from '../audio/sfx'
import Avatar from './Avatar'
import { effects } from './Effects'
import { kick, nearestKickable } from './kick'
import { surfaceAt, zoneAt } from './layout'

// Ajustes de movimiento
const WALK = 4.6
const RUN = 8
const ACCEL = 15 // arranque
const DECEL = 22 // frenada (más rápida que el arranque: control preciso)
const AIR = 5 // control en el aire
const JUMP = 8.2
const COYOTE = 0.12 // se puede saltar un instante después de dejar el suelo
const BUFFER = 0.14 // y pulsar salto un instante antes de aterrizar
const CHARGE_TIME = 0.85

const HALF_HEIGHT = 0.45
const RADIUS = 0.35
const FOOT = HALF_HEIGHT + RADIUS // centro → pies
export const SPAWN = [0, FOOT + 0.05, 1.2]

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt))

export default function Player() {
  const body = useRef()
  const visual = useRef()
  const lean = useRef()
  const limbs = useRef({})
  const s = useRef({
    phase: 0, coyote: 0, buffer: 0, jumpHeld: false, grounded: true, airTime: 0, fallSpeed: 0,
    squash: 0, squashV: 0, charging: false, charge: 0, kickAnim: 0, lastStep: 0, roll: 0, idle: 0,
  })
  const [, getKeys] = useKeyboardControls()
  const { world, rapier } = useRapier()

  useFrame((state, delta) => {
    const rb = body.current
    if (!rb) return
    if (!travel.to) {
      travel.to = (x, z) => {
        rb.setTranslation({ x, y: FOOT + 0.3, z }, true)
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      }
      if (DEBUG) window.__tp = travel.to
    }
    const dt = Math.min(delta, 0.05)
    const st = s.current
    const game = useGame.getState()
    const canMove = game.phase === 'playing' && !game.intro
    const keys = canMove ? getKeys() : {}
    const t = touchInput
    const k = { ...keys, jump: keys.jump || (canMove && t.jump), kick: keys.kick || (canMove && t.kick) }

    // --- Entrada (teclado o joystick táctil analógico)
    let x = (k.right ? 1 : 0) - (k.left ? 1 : 0)
    let z = (k.back ? 1 : 0) - (k.forward ? 1 : 0)
    let len = Math.hypot(x, z)
    let speed = k.run ? RUN : WALK
    const tl = canMove ? Math.hypot(t.x, t.z) : 0
    if (tl > 0.12) {
      x = t.x
      z = t.z
      len = tl
      speed = tl > 0.92 ? RUN : WALK * Math.min(1, 0.35 + tl * 0.75)
      k.run = tl > 0.92
    }
    if (len > 0) { x /= len; z /= len }

    const v = rb.linvel()
    const p = rb.translation()

    // --- Suelo (rayo hacia abajo, ignorando sensores y el propio cuerpo)
    const ray = new rapier.Ray({ x: p.x, y: p.y, z: p.z }, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, FOOT + 0.35, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, rb)
    const grounded = !!hit && hit.timeOfImpact < FOOT + 0.12 && v.y < 2

    // --- Velocidad horizontal con aceleración / frenada / control aéreo
    const rate = grounded ? (len > 0 ? ACCEL : DECEL) : AIR
    const charging = st.charging
    const target = charging ? speed * 0.35 : speed // al cargar el chut se camina despacio
    let vx = damp(v.x, x * target, rate, dt)
    let vz = damp(v.z, z * target, rate, dt)
    let vy = v.y

    // --- Salto con coyote time, buffer y altura variable
    if (grounded) st.coyote = COYOTE
    else st.coyote -= dt
    if (k.jump && !st.jumpHeld) st.buffer = BUFFER
    else st.buffer -= dt
    if (st.buffer > 0 && st.coyote > 0) {
      vy = JUMP
      st.buffer = 0
      st.coyote = 0
      st.squashV = 3.5 // estirón
      sfx.jump()
      effects.dust(p.x, p.y - FOOT, p.z, 5, 0.7)
    }
    if (!grounded) {
      if (vy > 0 && !k.jump) vy -= 26 * dt // soltar pronto = salto más corto
      if (vy < 0) vy -= 10 * dt // caída más rápida, menos "flotante"
      st.fallSpeed = Math.min(st.fallSpeed, vy)
      st.airTime += dt
    }
    st.jumpHeld = !!k.jump

    // --- Aterrizaje
    if (grounded && !st.grounded && st.airTime > 0.12) {
      const impact = Math.min(1, -st.fallSpeed / 16)
      sfx.land(impact)
      st.squashV = -4 - impact * 6
      effects.dust(p.x, p.y - FOOT, p.z, 6 + Math.round(impact * 6), 0.6 + impact)
    }
    if (grounded) { st.airTime = 0; st.fallSpeed = 0 }
    st.grounded = grounded

    rb.setLinvel({ x: vx, y: vy, z: vz }, true)

    // --- Chut: mantener E/F para cargar, soltar para chutar
    const ball = game.phase === 'playing' ? nearestKickable(p) : null
    game.setKickTarget(ball ? ball.label : null)
    if (k.kick && !st.charging && ball) st.charging = true
    if (st.charging && k.kick) st.charge = Math.min(1, st.charge + dt / CHARGE_TIME)
    if (st.charging && !k.kick) {
      const power = Math.max(0.2, st.charge)
      if (ball) {
        const b = ball.body.current.translation()
        kick(ball, p, visual.current.rotation.y, power)
        sfx.kick(power)
        effects.dust(b.x, b.y - 0.25, b.z, 4, 0.6)
      }
      st.kickAnim = 1
      st.charging = false
      st.charge = 0
    }
    player.kickCharge = st.charging ? st.charge : 0
    // Flecha de puntería mientras se carga (misma mezcla de dirección que el chut)
    if (st.charging && ball) {
      const b = ball.body.current.translation()
      const bl = Math.hypot(b.x - p.x, b.z - p.z) || 1
      let ax = ((b.x - p.x) / bl) * 0.45 + Math.sin(visual.current.rotation.y) * 0.55
      let az = ((b.z - p.z) / bl) * 0.45 + Math.cos(visual.current.rotation.y) * 0.55
      const al = Math.hypot(ax, az) || 1
      Object.assign(player.aim, { active: true, x: b.x, z: b.z, dx: ax / al, dz: az / al, charge: st.charge })
    } else player.aim.active = false

    // --- Seguridad: si cae del mundo vuelve a la habitación
    if (p.y < -10) {
      rb.setTranslation({ x: SPAWN[0], y: SPAWN[1] + 1, z: SPAWN[2] }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }

    const planar = Math.hypot(vx, vz)
    Object.assign(player.position, { x: p.x, y: p.y, z: p.z })
    Object.assign(player.velocity, { x: vx, y: vy, z: vz })
    player.speed = planar
    const inRoom = isInsideRoom(p)
    game.setInRoom(inRoom)
    const zone = zoneAt(p.x, p.z)
    if (zone) game.visit(zone)

    // --- Orientación + inclinación en curvas
    const vis = visual.current
    if (vis) {
      let targetYaw = vis.rotation.y
      if (len > 0) targetYaw = Math.atan2(x, z)
      if (ball && st.charging) {
        const b = ball.body.current.translation()
        targetYaw = Math.atan2(b.x - p.x, b.z - p.z)
      }
      const prev = vis.rotation.y
      vis.rotation.y = lerpAngle(vis.rotation.y, targetYaw, 1 - Math.exp(-12 * dt))
      const turn = ((vis.rotation.y - prev + Math.PI * 3) % (Math.PI * 2)) - Math.PI
      st.roll = damp(st.roll, Math.max(-0.25, Math.min(0.25, -turn / Math.max(dt, 1e-3) * 0.03 * (planar / RUN))), 10, dt)
      player.facing = vis.rotation.y
    }
    if (lean.current) {
      lean.current.rotation.x = damp(lean.current.rotation.x, grounded ? (planar / RUN) * 0.22 : -0.08, 8, dt)
      lean.current.rotation.z = st.roll
    }

    // --- Squash & stretch con muelle
    st.squashV += (-st.squash * 160 - st.squashV * 14) * dt
    st.squash += st.squashV * dt
    if (vis) {
      const sy = 1 + Math.max(-0.3, Math.min(0.3, st.squash))
      vis.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy))
    }

    // --- Ciclo de pasos y animación de extremidades
    const moving = grounded ? Math.min(planar / WALK, 1.6) : 0
    st.phase += dt * (5 + planar * 1.5) * (moving > 0.08 ? 1 : 0)
    const stepIndex = Math.floor(st.phase / Math.PI)
    if (moving > 0.15 && stepIndex !== st.lastStep) {
      sfx.step(surfaceAt(p.x, p.z, inRoom), k.run)
      if (k.run && !inRoom) effects.dust(p.x, p.y - FOOT, p.z, 2, 0.35)
    }
    st.lastStep = stepIndex
    st.idle = moving > 0.08 ? 0 : st.idle + dt
    st.kickAnim = Math.max(0, st.kickAnim - dt * 4)

    const L = limbs.current
    if (L.legL) {
      const swing = Math.sin(st.phase) * 0.75 * Math.min(moving, 1.2)
      const air = grounded ? 0 : 1
      const breathe = Math.sin(state.clock.elapsedTime * 2.2) * 0.015
      // Pierna derecha: carga hacia atrás y golpe hacia delante
      const kickLeg = st.charging ? -0.9 * st.charge : st.kickAnim > 0 ? 1.5 * Math.sin(st.kickAnim * Math.PI) : 0
      L.legL.rotation.x = damp(L.legL.rotation.x, swing - air * 0.5, 18, dt)
      L.legR.rotation.x = damp(L.legR.rotation.x, (kickLeg || -swing) + air * 0.35, st.kickAnim > 0 ? 40 : 18, dt)
      L.armL.rotation.x = damp(L.armL.rotation.x, -swing * 0.9 - air * 2.2, 14, dt)
      L.armR.rotation.x = damp(L.armR.rotation.x, swing * 0.9 - air * 2.2 + (st.charging ? 0.6 : 0), 14, dt)
      L.armL.rotation.z = damp(L.armL.rotation.z, -air * 0.4 - (st.charging ? 0.5 : 0), 10, dt)
      L.armR.rotation.z = damp(L.armR.rotation.z, air * 0.4, 10, dt)
      L.torso.position.y = Math.abs(Math.cos(st.phase)) * 0.05 * Math.min(moving, 1.2) + breathe
      // Mira a los lados cuando está quieto un rato
      L.head.rotation.y = st.idle > 3 ? Math.sin(state.clock.elapsedTime * 0.8) * 0.5 : damp(L.head.rotation.y, 0, 6, dt)
    }
  })

  return (
    <RigidBody
      ref={body}
      name="player"
      colliders={false}
      position={SPAWN}
      enabledRotations={[false, false, false]}
      canSleep={false}
      ccd
    >
      <CapsuleCollider args={[HALF_HEIGHT, RADIUS]} friction={0} restitution={0} mass={1.2} />
      <ChargeRing />
      <group ref={visual} position-y={-FOOT}>
        <group ref={lean}>
          {avatar.modelUrl ? (
            <Suspense fallback={null}>
              <AvatarModel url={avatar.modelUrl} />
            </Suspense>
          ) : (
            <Avatar limbs={limbs} />
          )}
        </group>
      </group>
    </RigidBody>
  )
}

function AvatarModel({ url }) {
  const { scene } = useGLTF(url, true)
  return <primitive object={scene} />
}

// Arco en el suelo que se llena mientras se carga el chut
function ChargeRing() {
  const mat = useRef()
  const uniforms = useMemo(
    () => ({ uProgress: { value: 0 }, uA: { value: new Color(theme.accent) }, uB: { value: new Color(theme.pending) } }),
    [],
  )
  useFrame(() => {
    uniforms.uProgress.value = player.kickCharge
    if (mat.current) mat.current.visible = player.kickCharge > 0
  })
  return (
    <mesh ref={mat} rotation-x={-Math.PI / 2} position-y={-FOOT + 0.04} visible={false}>
      <planeGeometry args={[1.8, 1.8]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          uniform float uProgress; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;
          void main(){
            vec2 p = vUv - 0.5; float r = length(p);
            float a = atan(p.x, p.y) / 6.28318 + 0.5;
            float ring = smoothstep(0.36, 0.38, r) * (1.0 - smoothstep(0.46, 0.48, r));
            float fill = step(a, uProgress);
            vec3 col = mix(uA, uB, uProgress);
            float alpha = ring * mix(0.18, 0.95, fill);
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(col, alpha);
          }`}
      />
    </mesh>
  )
}
