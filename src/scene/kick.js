import { useEffect } from 'react'

// Registro de objetos que se pueden chutar (balón de fútbol, bola de bolos…)
export const kickables = new Map()

/**
 * opts: { label, radius, minSpeed, maxSpeed, lift, enabled(), onKick(charge) }
 */
export function useKickable(id, bodyRef, opts) {
  useEffect(() => {
    kickables.set(id, { id, body: bodyRef, ...opts })
    return () => kickables.delete(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
}

export function nearestKickable(p) {
  let best = null
  let bestD = Infinity
  for (const k of kickables.values()) {
    const rb = k.body.current
    if (!rb || (k.enabled && !k.enabled())) continue
    const b = rb.translation()
    if (Math.abs(b.y - p.y) > 1.4) continue
    const d = Math.hypot(b.x - p.x, b.z - p.z) - k.radius
    if (d < 1.1 && d < bestD) {
      best = k
      bestD = d
    }
  }
  return best
}

export function kick(k, p, facing, charge) {
  const rb = k.body.current
  if (!rb) return
  const b = rb.translation()
  let dx = b.x - p.x
  let dz = b.z - p.z
  const len = Math.hypot(dx, dz) || 1
  // Mezcla entre hacia dónde mira el avatar y dónde está el balón
  dx = dx / len * 0.45 + Math.sin(facing) * 0.55
  dz = dz / len * 0.45 + Math.cos(facing) * 0.55
  const l2 = Math.hypot(dx, dz) || 1
  dx /= l2
  dz /= l2
  if (k.aim) {
    const t = k.aim(b, dx, dz)
    if (t) {
      let ax = t.x - b.x
      let az = t.z - b.z
      const al = Math.hypot(ax, az) || 1
      ax /= al
      az /= al
      const dot = dx * ax + dz * az
      if (dot > 0.6) {
        const w = t.strength * Math.min(1, (dot - 0.6) / 0.3)
        dx += (ax - dx) * w
        dz += (az - dz) * w
        const l3 = Math.hypot(dx, dz) || 1
        dx /= l3
        dz /= l3
      }
    }
  }
  const speed = k.minSpeed + (k.maxSpeed - k.minSpeed) * charge
  const m = rb.mass()
  rb.wakeUp()
  rb.applyImpulse({ x: dx * speed * m, y: (k.lift * (0.25 + charge)) * m, z: dz * speed * m }, true)
  rb.applyTorqueImpulse({ x: -dz * 0.02 * m * speed, y: (Math.random() - 0.5) * 0.01 * m, z: dx * 0.02 * m * speed }, true)
  k.onKick?.(charge)
}
