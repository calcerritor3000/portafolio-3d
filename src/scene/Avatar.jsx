import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import { useGame } from '../state/store'
import { avatar } from '../content'
import { theme } from '../theme'
import { Label } from './common'

// Avatar low-poly hecho con primitivas. Colores en content.js (avatar.colors).
// Se sustituye por tu modelo .glb al definir avatar.modelUrl.
export default function Avatar({ limbs }) {
  const inRoom = useGame((s) => s.inRoom)
  const eyes = useRef()
  const blink = useRef({ next: 2, t: 0 })
  const c = avatar.colors
  const set = (name) => (el) => { limbs.current[name] = el }

  // Parpadeo cada pocos segundos
  useFrame((state, dt) => {
    const b = blink.current
    b.next -= dt
    if (b.next <= 0) {
      b.t = 0.14
      b.next = 2 + Math.random() * 3
    }
    b.t = Math.max(0, b.t - dt)
    if (eyes.current) eyes.current.scale.y = b.t > 0 ? 0.15 : 1
  })

  return (
    <group>
      <group ref={set('torso')}>
        {/* Piernas con zapatillas */}
        {[[-0.12, set('legL')], [0.12, set('legR')]].map(([x, ref], i) => (
          <group key={i} ref={ref} position={[x, 0.8, 0]}>
            <RoundedBox args={[0.19, 0.72, 0.21]} radius={0.05} smoothness={2} position-y={-0.36} castShadow>
              <meshStandardMaterial color={c.pants} />
            </RoundedBox>
            <RoundedBox args={[0.21, 0.11, 0.32]} radius={0.04} smoothness={2} position={[0, -0.75, 0.05]} castShadow>
              <meshStandardMaterial color={c.shoes} />
            </RoundedBox>
            <mesh position={[0, -0.8, 0.05]}>
              <boxGeometry args={[0.22, 0.03, 0.33]} />
              <meshStandardMaterial color="#f4f2fb" />
            </mesh>
          </group>
        ))}

        {/* Sudadera con capucha */}
        <RoundedBox args={[0.56, 0.62, 0.32]} radius={0.09} smoothness={3} position-y={1.08} castShadow>
          <meshStandardMaterial color={c.top} />
        </RoundedBox>
        <RoundedBox args={[0.3, 0.13, 0.04]} radius={0.03} smoothness={2} position={[0, 0.92, 0.16]}>
          <meshStandardMaterial color={c.topDetail} />
        </RoundedBox>
        <mesh position={[0, 1.33, -0.13]} rotation-x={0.4} castShadow>
          <torusGeometry args={[0.17, 0.06, 6, 14, Math.PI]} />
          <meshStandardMaterial color={c.top} />
        </mesh>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 1.24, 0.165]}>
            <boxGeometry args={[0.015, 0.14, 0.015]} />
            <meshStandardMaterial color="#f4f2fb" />
          </mesh>
        ))}
        {/* Iniciales en el pecho */}
        <Label position={[0, 1.14, 0.162]} fontSize={0.075} color={c.topDetail} letterSpacing={0.05}>
          JC
        </Label>

        {/* Brazos */}
        {[[-0.35, set('armL')], [0.35, set('armR')]].map(([x, ref], i) => (
          <group key={i} ref={ref} position={[x, 1.32, 0]}>
            <RoundedBox args={[0.15, 0.52, 0.17]} radius={0.05} smoothness={2} position-y={-0.24} castShadow>
              <meshStandardMaterial color={c.top} />
            </RoundedBox>
            <mesh position-y={-0.54}>
              <sphereGeometry args={[0.075, 10, 8]} />
              <meshStandardMaterial color={c.skin} />
            </mesh>
          </group>
        ))}

        {/* Cabeza */}
        <group ref={set('head')} position-y={1.6}>
          <mesh position-y={-0.2}>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 10]} />
            <meshStandardMaterial color={c.skin} />
          </mesh>
          <RoundedBox args={[0.42, 0.42, 0.4]} radius={0.1} smoothness={3} castShadow>
            <meshStandardMaterial color={c.skin} />
          </RoundedBox>
          {/* Orejas */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.215, -0.01, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.06, 8, 6]} />
              <meshStandardMaterial color={c.skin} />
            </mesh>
          ))}
          {/* Pelo con flequillo */}
          <RoundedBox args={[0.45, 0.16, 0.43]} radius={0.06} smoothness={2} position={[0, 0.19, -0.01]} castShadow>
            <meshStandardMaterial color={c.hair} />
          </RoundedBox>
          <RoundedBox args={[0.45, 0.3, 0.12]} radius={0.05} smoothness={2} position={[0, 0.07, -0.16]}>
            <meshStandardMaterial color={c.hair} />
          </RoundedBox>
          {[-0.12, 0.02, 0.14].map((x, i) => (
            <mesh key={x} position={[x, 0.13, 0.19]} rotation={[0.5, 0, (i - 1) * 0.3]}>
              <coneGeometry args={[0.07, 0.13, 4]} />
              <meshStandardMaterial color={c.hair} flatShading />
            </mesh>
          ))}
          {/* Cara */}
          <group ref={eyes} position={[0, 0.0, 0.201]}>
            {[-0.085, 0.085].map((x) => (
              <group key={x} position-x={x}>
                <mesh>
                  <circleGeometry args={[0.04, 14]} />
                  <meshBasicMaterial color="#1a1626" />
                </mesh>
                <mesh position={[0.012, 0.014, 0.001]}>
                  <circleGeometry args={[0.012, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}
          </group>
          {[-0.085, 0.085].map((x) => (
            <mesh key={x} position={[x, 0.075, 0.202]} rotation-z={x > 0 ? -0.12 : 0.12}>
              <planeGeometry args={[0.08, 0.018]} />
              <meshBasicMaterial color={c.hair} />
            </mesh>
          ))}
          <mesh position={[0, -0.095, 0.202]}>
            <circleGeometry args={[0.035, 12, Math.PI, Math.PI]} />
            <meshBasicMaterial color="#7a3b3b" />
          </mesh>
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, -0.05, 0.201]}>
              <circleGeometry args={[0.03, 10]} />
              <meshBasicMaterial color="#f4a6a6" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      </group>
      {inRoom && (
        <Billboard position-y={2.2}>
          <Label fontSize={0.13} color={theme.text} letterSpacing={0.12} outlineWidth={0.008} outlineColor={theme.accent}>
            JORGE
          </Label>
        </Billboard>
      )}
    </group>
  )
}
