import { useMemo, useRef } from 'react'
import { MeshStandardMaterial } from 'three'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { ROOM, player, isInsideRoom, openUrl } from '../state/store'
import { profile, links } from '../content'
import { theme } from '../theme'
import { Sparkles } from '@react-three/drei'
import { Label, Solid, Interactable } from './common'
import RoomDecor from './RoomDecor'

const H = ROOM.height
const R = ROOM.half
const T = 0.2 // grosor de muro
const D = ROOM.doorHalf
const DH = ROOM.doorHeight
const BOOK_COLORS = ['#8b8bff', '#e07a5f', '#81b29a', '#f2cc8f', '#6d6aa8', '#c97b9a', '#5fa8d3']

export default function Room() {
  const roof = useRef()
  const backMat = useMemo(() => new MeshStandardMaterial({ color: theme.wall, transparent: true }), [])

  // Si el jugador está justo detrás de la pared del fondo (al salir), la pared se vuelve
  // translúcida y el tejado se oculta para que la cámara nunca lo pierda de vista.
  useFrame((_, dt) => {
    const p = player.position
    const occluding = p.z < -R && p.z > -R - 7 && Math.abs(p.x) < R + 2
    backMat.opacity += ((occluding ? 0.22 : 1) - backMat.opacity) * Math.min(1, dt * 8)
    if (roof.current) roof.current.visible = !isInsideRoom(p) && !occluding
  })

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        {/* Suelo de madera y alfombra */}
        <mesh rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow>
          <planeGeometry args={[R * 2, R * 2]} />
          <meshStandardMaterial color={theme.floor} roughness={0.85} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[-0.4, 0.02, 0.9]} receiveShadow>
          <planeGeometry args={[3.4, 2.4]} />
          <meshStandardMaterial color="#3b3360" />
        </mesh>

        {/* Pared del fondo con hueco de puerta */}
        <Solid position={[-(R + D) / 2 - T / 2, H / 2, -R - T / 2]} size={[R - D + T, H, T]} material={backMat} />
        <Solid position={[(R + D) / 2 + T / 2, H / 2, -R - T / 2]} size={[R - D + T, H, T]} material={backMat} />
        <Solid position={[0, (H + DH) / 2, -R - T / 2]} size={[D * 2, H - DH, T]} material={backMat} />
        {/* Paredes laterales */}
        <Solid position={[-R - T / 2, H / 2, 0]} size={[T, H, R * 2 + T * 2]} color={theme.wall} />
        <Solid position={[R + T / 2, H / 2, 0]} size={[T, H, R * 2 + T * 2]} color={theme.wall} />
        {/* Pared frontal: visualmente baja (vista de maqueta) pero colisión completa */}
        <Solid position={[0, 0.18, R + T / 2]} size={[R * 2 + T * 2, 0.36, T]} color={theme.wallOuter} collider={false} />
        <CuboidCollider position={[0, H / 2, R + T / 2]} args={[R + T, H / 2, T / 2]} />

        {/* Escritorio */}
        <Solid position={[-2.4, 0.74, -3.95]} size={[2.4, 0.06, 0.9]} color={theme.wood} collider={false} />
        {[[-3.5, -4.3], [-1.3, -4.3], [-3.5, -3.6], [-1.3, -3.6]].map(([x, z], i) => (
          <Solid key={i} position={[x, 0.36, z]} size={[0.07, 0.72, 0.07]} color={theme.woodDark} collider={false} />
        ))}
        <CuboidCollider position={[-2.4, 0.39, -3.95]} args={[1.2, 0.39, 0.45]} />
        {/* Monitor */}
        <Solid position={[-2.4, 0.86, -4.2]} size={[0.08, 0.18, 0.08]} color="#2a2738" collider={false} />
        <Solid position={[-2.4, 1.3, -4.22]} size={[1.3, 0.76, 0.05]} color="#2a2738" collider={false} />
        <mesh position={[-2.4, 1.3, -4.19]}>
          <planeGeometry args={[1.22, 0.68]} />
          <meshBasicMaterial color="#110e1c" />
        </mesh>
        <group position={[-2.4, 1.3, -4.185]}>
          <Label weight="mono" fontSize={0.05} color={theme.textMuted} anchorX="left" position={[-0.56, 0.27, 0]}>
            jorge.ts
          </Label>
          <Label fontSize={0.1} anchorX="left" position={[-0.54, 0.08, 0]} maxWidth={1.1}>
            Hola, soy Jorge.
          </Label>
          <Label weight="regular" fontSize={0.065} color={theme.accent} anchorX="left" position={[-0.54, -0.06, 0]} maxWidth={1.1}>
            Creo software que funciona.
          </Label>
          <Label weight="mono" fontSize={0.045} color="#86efac" anchorX="left" position={[-0.54, -0.22, 0]}>
            disponible: true
          </Label>
        </group>
        {/* Teclado, portátil y taza */}
        <Solid position={[-2.4, 0.785, -3.7]} size={[0.6, 0.025, 0.18]} color="#3a3650" collider={false} />
        <Solid position={[-1.6, 0.785, -3.85]} size={[0.5, 0.02, 0.35]} color="#9aa0b5" collider={false} />
        <mesh position={[-1.6, 0.93, -4.03]} rotation-x={-0.25}>
          <boxGeometry args={[0.5, 0.32, 0.015]} />
          <meshStandardMaterial color="#9aa0b5" />
        </mesh>
        <mesh position={[-3.25, 0.83, -3.75]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.13, 12]} />
          <meshStandardMaterial color={theme.accent} />
        </mesh>
        {/* Neón con iniciales */}
        <Label position={[-2.4, 2.15, -R + 0.02]} fontSize={0.38} letterSpacing={0.04} color={theme.accent}>
          {profile.initials}
        </Label>

        {/* Estantería baja + cuadro con datos */}
        <Solid position={[2.7, 0.55, -4.25]} size={[1.7, 1.1, 0.42]} color={theme.woodDark} collider={false} />
        <CuboidCollider position={[2.7, 0.55, -4.25]} args={[0.85, 0.55, 0.21]} />
        {[0.32, 0.78].map((y) =>
          Array.from({ length: 9 }, (_, i) => (
            <mesh key={`${y}-${i}`} position={[2.05 + i * 0.16, y + 0.12 + (i % 3) * 0.01, -4.02]}>
              <boxGeometry args={[0.11, 0.3 - (i % 3) * 0.04, 0.3]} />
              <meshStandardMaterial color={BOOK_COLORS[(i + y * 10) % BOOK_COLORS.length | 0]} />
            </mesh>
          )),
        )}
        <mesh position={[2.7, 1.88, -R + 0.03]}>
          <boxGeometry args={[1.9, 0.95, 0.04]} />
          <meshStandardMaterial color={theme.board} />
        </mesh>
        <group position={[2.7, 1.88, -R + 0.06]}>
          {profile.facts.map((f, i) => (
            <Label key={f} weight="regular" fontSize={0.1} position={[0, 0.25 - i * 0.24, 0]} maxWidth={1.75}>
              {f}
            </Label>
          ))}
        </group>

        {/* Ventana en la pared izquierda */}
        <mesh position={[-R + 0.01, 1.5, 0.6]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[1.7, 1.1]} />
          <meshBasicMaterial color="#3d4a8a" />
        </mesh>
        {[[0, 0.58, 1.8, 0.06], [0, -0.58, 1.8, 0.06], [0.88, 0, 0.06, 1.2], [-0.88, 0, 0.06, 1.2], [0, 0, 0.04, 1.1]].map(([dz, dy, w, h], i) => (
          <mesh key={i} position={[-R + 0.03, 1.5 + dy, 0.6 + dz]} rotation-y={Math.PI / 2}>
            <boxGeometry args={[w, h, 0.04]} />
            <meshStandardMaterial color={theme.wood} />
          </mesh>
        ))}

        {/* Cama */}
        <Solid position={[3.75, 0.22, 1.9]} size={[1.4, 0.44, 2.3]} color={theme.woodDark} />
        <Solid position={[3.75, 0.5, 2.1]} size={[1.3, 0.14, 1.9]} color="#4b4580" collider={false} />
        <Solid position={[3.75, 0.52, 0.95]} size={[1.0, 0.16, 0.38]} color="#e8e6f2" collider={false} />

        {/* Planta */}
        <mesh position={[-3.9, 0.25, 3.9]} castShadow>
          <cylinderGeometry args={[0.28, 0.22, 0.5, 10]} />
          <meshStandardMaterial color="#c4734f" />
        </mesh>
        <mesh position={[-3.9, 0.85, 3.9]} castShadow>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#4f8a6b" flatShading />
        </mesh>
        <CuboidCollider position={[-3.9, 0.5, 3.9]} args={[0.32, 0.5, 0.32]} />

        {/* Marco luminoso de la puerta + suelo con indicación de salida */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (D + 0.03), DH / 2, -R + 0.02]}>
            <boxGeometry args={[0.06, DH, 0.06]} />
            <meshBasicMaterial color={theme.accent} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, DH + 0.03, -R + 0.02]}>
          <boxGeometry args={[D * 2 + 0.12, 0.06, 0.06]} />
          <meshBasicMaterial color={theme.accent} toneMapped={false} />
        </mesh>
        <group position={[0, 0.03, -2.7]} rotation-x={-Math.PI / 2}>
          <Label fontSize={0.26} letterSpacing={0.12} color={theme.accent}>
            SALIDA
          </Label>
          <Label weight="regular" fontSize={0.14} position={[0, -0.28, 0]} color={theme.textMuted}>
            sal a explorar
          </Label>
          {[0.55, 0.9].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation-z={Math.PI / 2}>
              <circleGeometry args={[0.14, 3]} />
              <meshBasicMaterial color={theme.accent} toneMapped={false} transparent opacity={y > 0.6 ? 0.5 : 0.9} />
            </mesh>
          ))}
        </group>
      </RigidBody>

      {/* Silla de oficina: se puede empujar */}
      <RigidBody position={[-2.4, 0.5, -3.0]} colliders={false} linearDamping={2} angularDamping={3}>
        <CuboidCollider args={[0.28, 0.45, 0.28]} position={[0, -0.05, 0]} mass={1} />
        <mesh position-y={-0.05} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.55]} />
          <meshStandardMaterial color="#2a2738" />
        </mesh>
        <mesh position={[0, 0.33, 0.25]} castShadow>
          <boxGeometry args={[0.55, 0.7, 0.07]} />
          <meshStandardMaterial color="#2a2738" />
        </mesh>
        <mesh position-y={-0.27}>
          <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position-y={-0.45}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 5]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      </RigidBody>

      {/* Puerta abierta hacia fuera */}
      <group position={[D, 0, -R - T]} rotation-y={-1.85}>
        <mesh position={[-D + 0.02, DH / 2, 0]} castShadow>
          <boxGeometry args={[D * 2 - 0.04, DH - 0.02, 0.06]} />
          <meshStandardMaterial color={theme.wood} />
        </mesh>
      </group>

      {/* Tejado: solo se ve desde fuera */}
      <group ref={roof} visible={false}>
        <mesh position={[0, H + 0.08, 0]} castShadow>
          <boxGeometry args={[R * 2 + 0.9, 0.16, R * 2 + 0.9]} />
          <meshStandardMaterial color="#3d3555" />
        </mesh>
        <mesh position={[0, H + 0.2, 0]}>
          <boxGeometry args={[R * 2 + 0.5, 0.1, R * 2 + 0.5]} />
          <meshStandardMaterial color="#4a4166" />
        </mesh>
        <mesh position={[2.6, H + 0.75, 1.6]} castShadow>
          <boxGeometry args={[0.6, 1.1, 0.6]} />
          <meshStandardMaterial color="#6b5a7a" />
        </mesh>
        <Sparkles position={[2.6, H + 1.9, 1.6]} count={10} scale={[0.6, 1.6, 0.6]} size={6} speed={0.4} color="#9a96b0" opacity={0.6} />
      </group>

      {/* Exterior: farol del porche, felpudo y ventana iluminada */}
      <group position={[1.35, 2.0, -R - T - 0.08]}>
        <mesh>
          <boxGeometry args={[0.18, 0.28, 0.16]} />
          <meshStandardMaterial color="#2a2738" />
        </mesh>
        <mesh position-z={-0.085}>
          <planeGeometry args={[0.12, 0.2]} />
          <meshBasicMaterial color="#ffd9a8" toneMapped={false} />
        </mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, -R - 1.05]} receiveShadow>
        <planeGeometry args={[1.5, 0.8]} />
        <meshStandardMaterial color="#6b4a3a" />
      </mesh>
      <Label position={[0, 0.03, -R - 1.05]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.2} letterSpacing={0.2} color="#e8d5c4">
        HOLA
      </Label>
      <mesh position={[-R - T - 0.01, 1.5, 0.6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.6, 1.0]} />
        <meshBasicMaterial color="#ffcf8a" toneMapped={false} />
      </mesh>

      <RoomDecor />
      <pointLight position={[0, 2.3, 0]} intensity={9} distance={11} decay={1.6} color="#ffd9a8" />

      <Interactable
        id="desk"
        position={[-2.4, 1, -2.7]}
        size={[1.0, 1, 0.55]}
        title="Sobre mí"
        subtitle={profile.bio}
        actions={[
          { key: 'E', label: 'Portafolio clásico', run: () => openUrl(links.classic) },
          { key: 'R', label: 'Ver CV', run: () => openUrl(links.cv) },
        ]}
      />
      <Interactable
        id="facts"
        position={[2.7, 1, -3.3]}
        size={[0.9, 1, 0.5]}
        title={profile.role}
        subtitle={`${profile.location} · ${profile.status}`}
        actions={[]}
      />
    </group>
  )
}
