import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, BallCollider, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { LatheGeometry, Vector2 } from 'three'
import { useGame, saveBest, focusCamera, slowMotion } from '../../state/store'
import { shake } from '../CameraRig'
import { theme } from '../../theme'
import { sfx, setZone } from '../../audio/sfx'
import { Label, Board, Interactable } from '../common'
import { effects } from '../Effects'
import { useKickable } from '../kick'
import { LANE } from '../layout'

const X = LANE.x
const FOUL_Z = -45
const BACK_Z = LANE.z1 - 1
const BALL_R = 0.26
const BALL_START = [X, BALL_R + 0.02, -43]
const ROLLS = 5
const HEAD_Z = LANE.z1 + 4.4
const PINS = []
for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) PINS.push([X + (i - r / 2) * 0.42, HEAD_Z - r * 0.37])

const game = { state: 'ready', t: 0, wait: 0, hitPins: false }

export default function Bowling() {
  const high = useGame((s) => s.quality === 'high')
  const ball = useRef()
  const pins = useRef([])

  useKickable('bowling', ball, {
    label: 'Bola de bolos',
    radius: BALL_R,
    minSpeed: 6,
    maxSpeed: 14,
    lift: 0.4,
    enabled: () => game.state === 'ready',
    onKick: () => {
      const b = useGame.getState().bowling
      if (b.roll >= ROLLS) useGame.getState().setBowling({ roll: 0, total: 0, last: null })
      game.state = 'rolling'
      game.t = 0
      game.hitPins = false
      useGame.getState().setBowling({ state: 'rolling' })
    },
  })

  const resetAll = () => {
    pins.current.forEach((rb, i) => {
      if (!rb) return
      rb.setTranslation({ x: PINS[i][0], y: 0.01, z: PINS[i][1] }, true)
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
      // Ojo: no dormir el cuerpo aquí. react-three-rapier no actualiza la malla de los cuerpos
      // dormidos, así que el bolo se recolocaba en la física pero se seguía viendo tirado (o
      // fuera de la pista): parecía que desaparecían o que eran invisibles. Se duermen solos al asentarse.
    })
    const rb = ball.current
    if (rb) {
      rb.setTranslation({ x: BALL_START[0], y: BALL_START[1] + 0.05, z: BALL_START[2] }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    game.state = 'ready'
    useGame.getState().setBowling({ state: 'ready' })
  }

  const countFallen = () =>
    pins.current.reduce((n, rb, i) => {
      if (!rb) return n
      const q = rb.rotation()
      const upY = 1 - 2 * (q.x * q.x + q.z * q.z)
      const p = rb.translation()
      const moved = Math.hypot(p.x - PINS[i][0], p.z - PINS[i][1])
      return n + (upY < 0.75 || moved > 0.3 || p.y < -0.2 ? 1 : 0)
    }, 0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const rb = ball.current
    if (!rb) return
    const v = rb.linvel()
    const p = rb.translation()
    const speed = Math.hypot(v.x, v.z)
    setZone('roll', game.state === 'rolling' && p.y < BALL_R + 0.1 ? Math.min(1, speed / 10) : 0)

    if (game.state === 'rolling') {
      game.t += dt
      focusCamera(p.x, p.z, 0.75)
      if (p.z < BACK_Z + 0.6 || (game.t > 1.2 && speed < 0.25) || game.t > 8) {
        game.state = 'settling'
        game.wait = 1.8
      }
    } else if (game.state === 'settling') {
      game.wait -= dt
      focusCamera(X, HEAD_Z, 0.75)
      if (game.wait <= 0) {
        const fallen = countFallen()
        const { bowling: b, setBowling, showToast } = useGame.getState()
        const roll = b.roll + 1
        const total = b.total + fallen
        setBowling({ roll, total, last: fallen, state: 'showing' })
        if (fallen === 10) {
          sfx.strike()
          effects.confetti(X, 1.2, HEAD_Z - 0.5)
          shake.amount = 0.3
          useGame.getState().unlock('strike')
          showToast('¡STRIKE!', 'Los 10 bolos de una vez', 'gold')
        } else if (fallen === 0) {
          sfx.beep()
          showToast('¡Al canal!', 'Ningún bolo esta vez')
        } else {
          sfx.score()
          showToast(`${fallen} ${fallen === 1 ? 'bolo' : 'bolos'}`, `Tirada ${roll} de ${ROLLS}`)
        }
        if (roll >= ROLLS) {
          const record = total > b.best
          if (record) {
            saveBest('pf3d-bowling', total)
            setBowling({ best: total })
          }
          setTimeout(() => {
            useGame.getState().showToast(record ? '¡Nuevo récord!' : 'Fin de la partida', `${total} bolos en ${ROLLS} tiradas`, record ? 'gold' : 'accent')
            if (record) sfx.record()
          }, 1600)
        }
        game.state = 'showing'
        game.wait = 2.4
      }
    } else if (game.state === 'showing') {
      game.wait -= dt
      if (game.wait > 1) focusCamera(X, HEAD_Z, 0.75)
      if (game.wait <= 0) resetAll()
    } else if (game.state === 'ready' && (p.z < FOUL_Z || p.y < -2)) {
      // La bola rodó sola más allá de la línea: vuelve a su sitio
      resetAll()
    }
  })

  return (
    <group>
      <LaneMesh />
      <Scoreboard />
      <Arch />

      {PINS.map(([x, z], i) => (
        <RigidBody
          key={i}
          ref={(el) => (pins.current[i] = el)}
          name="pin"
          position={[x, 0.01, z]}
          colliders={false}
          linearDamping={0.3}
          angularDamping={0.4}
          ccd
          onCollisionEnter={() => {
            const v = pins.current[i]?.linvel()
            if (v) sfx.pin(Math.hypot(v.x, v.y, v.z) * 1.5)
          }}
        >
          <CylinderCollider args={[0.29, 0.085]} position={[0, 0.3, 0]} mass={0.55} friction={0.4} restitution={0.25} />
          <PinModel />
        </RigidBody>
      ))}

      <RigidBody
        ref={ball}
        name="bowling-ball"
        position={BALL_START}
        colliders={false}
        linearDamping={0.04}
        angularDamping={0.15}
        ccd
        onCollisionEnter={({ other }) => {
          const v = ball.current?.linvel()
          if (!v) return
          // Primer impacto con los bolos: cámara lenta un instante
          if (other.rigidBodyObject?.name === 'pin' && !game.hitPins && game.state === 'rolling') {
            game.hitPins = true
            if (Math.hypot(v.x, v.z) > 3) slowMotion(900, 0.35)
          }
          sfx.bounce(Math.abs(v.y) * 3, true)
        }}
      >
        <BallCollider args={[BALL_R]} mass={3} restitution={0.05} friction={0.5} />
        <mesh castShadow>
          <icosahedronGeometry args={[BALL_R, 3]} />
          <meshStandardMaterial color={theme.accent} roughness={0.2} metalness={0.35} />
        </mesh>
        {[[-0.05, 0.1], [0.05, 0.1], [0, 0.0]].map(([dx, dy], i) => (
          <mesh key={i} position={[dx, BALL_R * 0.5 + dy * 0.4, BALL_R * 0.84]} rotation-x={-0.5}>
            <circleGeometry args={[0.028, 10]} />
            <meshBasicMaterial color="#14121c" />
          </mesh>
        ))}
      </RigidBody>

      <Interactable
        id="bowling-reset"
        position={[X + 2.5, 1, -42.2]}
        size={[0.8, 1, 0.8]}
        title="Bolos · 5 tiradas"
        subtitle="Chuta la bola (mantén E) hacia los bolos"
        actions={[{ key: 'E', label: 'Recolocar bolos', run: resetAll }]}
      />
      {high && <pointLight position={[X, 4.2, HEAD_Z - 0.6]} intensity={16} distance={13} decay={1.4} color="#fff1dc" />}
    </group>
  )
}

function PinModel() {
  const geometry = useMemo(() => {
    const pts = [
      [0, 0], [0.055, 0], [0.08, 0.07], [0.095, 0.17], [0.088, 0.27], [0.06, 0.36],
      [0.042, 0.43], [0.05, 0.5], [0.048, 0.56], [0.03, 0.6], [0, 0.61],
    ].map(([r, y]) => new Vector2(r, y))
    return new LatheGeometry(pts, 12)
  }, [])
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color="#f7f5fb" roughness={0.35} />
      </mesh>
      {[0.405, 0.445].map((y) => (
        <mesh key={y} position-y={y}>
          <cylinderGeometry args={[0.048, 0.05, 0.018, 12]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>
      ))}
    </group>
  )
}

function LaneMesh() {
  const half = LANE.half
  const length = FOUL_Z - BACK_Z
  const midZ = (FOUL_Z + BACK_Z) / 2
  const strip = useRef()
  useFrame(({ clock }) => {
    if (!strip.current) return
    strip.current.uniforms.uTime.value = clock.elapsedTime
    strip.current.uniforms.uActive.value += ((game.state === 'rolling' ? 1 : 0.25) - strip.current.uniforms.uActive.value) * 0.08
  })
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uActive: { value: 0.25 } }), [])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* Zona de lanzamiento */}
        <mesh rotation-x={-Math.PI / 2} position={[X, 0.02, (LANE.z2 + FOUL_Z) / 2]} receiveShadow>
          <planeGeometry args={[half * 2 + 1.4, LANE.z2 - FOUL_Z]} />
          <meshStandardMaterial color="#9b7552" roughness={0.6} />
        </mesh>
        {/* Pista de madera con tablones */}
        <mesh rotation-x={-Math.PI / 2} position={[X, 0.025, midZ]} receiveShadow>
          <planeGeometry args={[half * 2, length]} />
          <meshStandardMaterial color="#c89a6a" roughness={0.25} metalness={0.05} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} rotation-x={-Math.PI / 2} position={[X - half + ((i + 1) * half * 2) / 10, 0.027, midZ]}>
            <planeGeometry args={[0.012, length]} />
            <meshBasicMaterial color="#a77c52" />
          </mesh>
        ))}
        {/* Flechas de puntería */}
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[X + i * 0.4, 0.03, -50 - Math.abs(i) * 0.4]}>
            <circleGeometry args={[0.08, 3]} />
            <meshBasicMaterial color="#6b4a2f" />
          </mesh>
        ))}
        <mesh rotation-x={-Math.PI / 2} position={[X, 0.03, FOUL_Z]}>
          <planeGeometry args={[half * 2, 0.06]} />
          <meshBasicMaterial color="#e11d48" />
        </mesh>
        {/* Canales */}
        {[-1, 1].map((s) => (
          <mesh key={s} rotation-x={-Math.PI / 2} position={[X + s * (half + 0.18), 0.015, midZ]}>
            <planeGeometry args={[0.36, length]} />
            <meshStandardMaterial color="#26222f" />
          </mesh>
        ))}
        {/* Barandillas con tira LED animada */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[X + s * (half + 0.42), 0.18, midZ]} castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.36, length]} />
              <meshStandardMaterial color="#2f2a3d" />
            </mesh>
            <mesh position={[X + s * (half + 0.42), 0.37, midZ]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.1, length]} />
              <shaderMaterial
                ref={s === 1 ? strip : undefined}
                uniforms={uniforms}
                transparent
                toneMapped={false}
                vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
                fragmentShader={`
                  uniform float uTime; uniform float uActive; varying vec2 vUv;
                  void main(){
                    float dash = step(0.55, fract(vUv.y * 40.0 + uTime * 2.5 * (0.4 + uActive)));
                    vec3 col = mix(vec3(0.545,0.545,1.0), vec3(1.0,0.72,0.29), uActive);
                    gl_FragColor = vec4(col, (0.25 + dash * 0.75) * (0.35 + uActive * 0.65));
                  }`}
              />
            </mesh>
            <CuboidCollider args={[0.06, 0.7, length / 2]} position={[X + s * (half + 0.42), 0.7, midZ]} />
          </group>
        ))}
        {/* Fondo de la pista */}
        <mesh position={[X, 0.8, BACK_Z - 0.1]} receiveShadow>
          <boxGeometry args={[half * 2 + 1, 1.6, 0.2]} />
          <meshStandardMaterial color="#1c1826" />
        </mesh>
        <CuboidCollider args={[half + 0.5, 1.2, 0.5]} position={[X, 1.2, BACK_Z - 0.5]} />
        {/* Paredes laterales del foso y techo bajo la cortina: los bolos no pueden salir volando */}
        {[-1, 1].map((s) => (
          <CuboidCollider key={s} args={[0.2, 1.2, 2.6]} position={[X + s * (half + 0.62), 1.2, BACK_Z + 2.2]} />
        ))}
        <CuboidCollider args={[half + 0.6, 0.2, 2.6]} position={[X, 2.6, BACK_Z + 2.2]} />
        <mesh position={[X, 1.25, BACK_Z + 0.4]}>
          <boxGeometry args={[half * 2 + 1, 0.3, 0.9]} />
          <meshStandardMaterial color="#2f2a3d" />
        </mesh>
        <mesh position={[X, 1.12, BACK_Z + 0.86]}>
          <planeGeometry args={[half * 2 + 1, 0.05]} />
          <meshBasicMaterial color={theme.accent} toneMapped={false} />
        </mesh>
      </RigidBody>
    </group>
  )
}

function Scoreboard() {
  const b = useGame((s) => s.bowling)
  const roll = b.state === 'rolling' || b.state === 'settling' ? Math.min(b.roll + 1, ROLLS) : b.roll
  const cols = [
    ['TIRADA', `${roll}/${ROLLS}`],
    ['ÚLTIMA', b.last == null ? '–' : String(b.last)],
    ['TOTAL', String(b.total)],
    ['RÉCORD', String(b.best)],
  ]
  return (
    <Board position={[X, 0, BACK_Z - 1.2]} width={5.6} height={2.1} base={1.9}>
      <Label fontSize={0.28} letterSpacing={0.16} position={[0, 0.7, 0]} color={theme.accent}>
        BOLOS
      </Label>
      {cols.map(([label, value], i) => (
        <group key={label} position={[(i - 1.5) * 1.3, -0.1, 0]}>
          <Label weight="mono" fontSize={0.44}>
            {value}
          </Label>
          <Label weight="regular" fontSize={0.12} letterSpacing={0.1} position={[0, -0.4, 0]} color={theme.textMuted}>
            {label}
          </Label>
        </group>
      ))}
    </Board>
  )
}

function Arch() {
  const w = 4
  return (
    <group position={[X, 0, LANE.z2 + 0.9]}>
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
        BOLOS
      </Label>
      <mesh position={[0, 2.93, 0.09]}>
        <planeGeometry args={[w + 0.5, 0.05]} />
        <meshBasicMaterial color={theme.pending} toneMapped={false} />
      </mesh>
    </group>
  )
}
