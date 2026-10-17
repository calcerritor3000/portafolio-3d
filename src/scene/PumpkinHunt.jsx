import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { player, useGame } from '../state/store'
import { sfx } from '../audio/sfx'
import { effects } from './Effects'
import { Pumpkin } from './Halloween'

// Calabazas escondidas por el mapa (fuera de los caminos). Se recogen al pasar cerca.
export const HIDDEN_PUMPKINS = [
  { id: 'hoguera', x: -12.8, z: -11.2 },
  { id: 'cementerio', x: -22.2, z: -9.6 },
  { id: 'estanque', x: 29.8, z: -1.5 },
  { id: 'cajas', x: 9.4, z: -15.6 },
  { id: 'enlaces', x: -15.5, z: -31.4 },
  { id: 'proyectos', x: 15.8, z: -31.4 },
  { id: 'campo', x: -4.2, z: -48 },
  { id: 'bolera', x: 20, z: -57 },
  { id: 'casa', x: -5.5, z: 7.5 },
  { id: 'bosque', x: 29, z: -26 },
]
export const PUMPKIN_TOTAL = HIDDEN_PUMPKINS.length
const PICK_DISTANCE = 1.3

export default function PumpkinHunt() {
  const found = useGame((s) => s.pumpkins)
  return HIDDEN_PUMPKINS.filter((p) => !found.includes(p.id)).map((p) => <HiddenPumpkin key={p.id} {...p} />)
}

function HiddenPumpkin({ id, x, z }) {
  const ref = useRef()
  const picked = useRef(false)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ref.current) {
      // Flota y gira despacio para llamar la atención
      ref.current.position.y = 0.35 + Math.sin(t * 2 + x) * 0.12
      ref.current.rotation.y = t * 0.9
    }
    if (picked.current) return
    if (Math.hypot(player.position.x - x, player.position.z - z) < PICK_DISTANCE && Math.abs(player.position.y - 1) < 1.5) {
      picked.current = true
      const { findPumpkin, showToast, unlock } = useGame.getState()
      const n = findPumpkin(id)
      effects.confetti(x, 1, z)
      if (n >= PUMPKIN_TOTAL) {
        sfx.record()
        unlock('pumpkins')
        showToast('¡Todas las calabazas! 🎃', `Has encontrado las ${PUMPKIN_TOTAL}`, 'gold')
      } else {
        sfx.score()
        showToast(`Calabaza ${n} de ${PUMPKIN_TOTAL} 🎃`, 'Quedan más escondidas por el mapa')
      }
    }
  })

  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <Pumpkin position={[0, 0, 0]} scale={0.9} />
      </group>
      <Sparkles position-y={0.8} count={14} scale={[1.4, 1.4, 1.4]} size={3} speed={0.6} color="#c084fc" />
      {/* Halo en el suelo para que se distinga de las calabazas decorativas */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[0.5, 0.75, 32]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.45} toneMapped={false} />
      </mesh>
    </group>
  )
}
