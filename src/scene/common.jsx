import { useRef } from 'react'
import { Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGame } from '../state/store'
import { theme, FONT_BOLD, FONT_REGULAR, FONT_MONO } from '../theme'

export function Label({ weight = 'bold', ...props }) {
  const font = weight === 'mono' ? FONT_MONO : weight === 'regular' ? FONT_REGULAR : FONT_BOLD
  return <Text font={font} color={theme.text} anchorX="center" anchorY="middle" {...props} />
}

// Zona invisible: al entrar el jugador muestra el aviso de interacción (E / R)
export function Interactable({ id, position, size = [1.2, 1.2, 1.2], ring = true, ...data }) {
  const ref = useRef()
  ref.current = { id, ...data }
  const isActive = useGame((s) => s.active?.id === id)
  const isPlayer = (other) => other.rigidBodyObject?.name === 'player'

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          sensor
          args={size}
          onIntersectionEnter={({ other }) => {
            if (!isPlayer(other)) return
            useGame.getState().setActive(ref.current)
            useGame.getState().visit(id)
          }}
          onIntersectionExit={({ other }) => isPlayer(other) && useGame.getState().clearActive(id)}
        />
      </RigidBody>
      {ring && (
        <mesh rotation-x={-Math.PI / 2} position-y={-position[1] + 0.03}>
          <ringGeometry args={[0.55, 0.68, 40]} />
          <meshBasicMaterial
            color={data.pending ? theme.pending : theme.accent}
            transparent
            opacity={isActive ? 0.95 : 0.35}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  )
}

// Cartel de madera con tablero oscuro; el contenido (children) va pegado a la cara frontal
export function Board({ position, rotation = [0, 0, 0], width = 3, height = 1.8, base = 0.8, edge = theme.accent, children }) {
  const cy = base + height / 2
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[width / 2, cy, 0.12]} position={[0, cy, 0]} />
      </RigidBody>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.18), cy / 2, -0.02]} castShadow>
          <boxGeometry args={[0.12, cy, 0.12]} />
          <meshStandardMaterial color={theme.woodDark} />
        </mesh>
      ))}
      <mesh position={[0, cy, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial color={theme.board} roughness={0.9} />
      </mesh>
      <mesh position={[0, base + height - 0.03, 0.065]}>
        <planeGeometry args={[width, 0.06]} />
        <meshBasicMaterial color={edge} toneMapped={false} />
      </mesh>
      <group position={[0, cy, 0.07]}>{children}</group>
    </group>
  )
}

// Caja visible + colisionador (para muros y muebles estáticos dentro de un RigidBody fijo)
export function Solid({ position, size, color, collider = true, castShadow = true, receiveShadow = true, material }) {
  return (
    <>
      <mesh position={position} castShadow={castShadow} receiveShadow={receiveShadow} material={material}>
        <boxGeometry args={size} />
        {!material && <meshStandardMaterial color={color} />}
      </mesh>
      {collider && <CuboidCollider position={position} args={size.map((v) => v / 2)} />}
    </>
  )
}
