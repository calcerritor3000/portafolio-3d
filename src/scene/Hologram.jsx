import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, MeshBasicMaterial, DoubleSide, LinearFilter, RepeatWrapping, SRGBColorSpace, VideoTexture } from 'three'
import { player, openUrl, useGame } from '../state/store'
import { projects } from '../content'
import { PLAZA } from './layout'
import { Interactable, Label } from './common'

const taskorit = projects.find((p) => p.id === 'taskorit') ?? projects[0]
const VIDEO_URL = import.meta.env.BASE_URL + 'videos/taskorit.mp4'

// Pantalla 9:16 flotando sobre la fuente de la plaza
const W = 1.1
const H = (W * 16) / 9
const BOTTOM = 2.05
const Y = BOTTOM + H / 2
const BEAM_FROM = 1.55 // altura del chorro de la fuente
const BEAM_H = BOTTOM - BEAM_FROM
const PLAY_DISTANCE = 26 // solo se reproduce el vídeo cuando el jugador está cerca
const CYAN = '#67e8f9'

// Textura de líneas horizontales para el efecto de escaneo
function makeScanlines() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 8
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 4, 8)
  ctx.fillStyle = '#3fb8d8'
  ctx.fillRect(0, 0, 4, 2)
  const t = new CanvasTexture(c)
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1, 90)
  return t
}

const additive = { transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }

export default function Hologram() {
  const [x, z] = PLAZA
  const spin = useRef()
  const screen = useRef()
  const videoMat = useRef()
  const scanMat = useRef()
  const beam = useRef()
  const ring = useRef()
  const near = useGame((s) => s.active?.id === 'hologram')

  const { video, texture, scan, frame } = useMemo(() => {
    const v = document.createElement('video')
    v.src = VIDEO_URL
    v.crossOrigin = 'anonymous'
    v.loop = true
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    const t = new VideoTexture(v)
    t.colorSpace = SRGBColorSpace
    t.minFilter = LinearFilter
    t.magFilter = LinearFilter
    const frame = new MeshBasicMaterial({ color: CYAN, ...additive })
    return { video: v, texture: t, scan: makeScanlines(), frame }
  }, [])

  useEffect(
    () => () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      texture.dispose()
      scan.dispose()
      frame.dispose()
    },
    [video, texture, scan, frame],
  )

  const reveal = useRef(0)

  useFrame(({ clock, camera }, delta) => {
    const t = clock.elapsedTime
    const close = Math.hypot(player.position.x - x, player.position.z - z) < PLAY_DISTANCE

    // Reproducir/pausar según la distancia (ahorra batería y CPU)
    if (close && video.paused) video.play().catch(() => {})
    if (!close && !video.paused) video.pause()

    // Se "enciende" de abajo arriba al acercarse
    reveal.current += ((close ? 1 : 0) - reveal.current) * Math.min(1, delta * 2.5)
    const r = reveal.current
    if (screen.current) {
      screen.current.scale.y = Math.max(0.001, r)
      screen.current.position.y = Y - (H / 2) * (1 - r)
    }

    // Parpadeo irregular y algún "corte" de señal de vez en cuando
    const glitch = Math.sin(t * 0.7) > 0.985 ? 0.35 : 1
    const flicker = (0.88 + 0.12 * Math.sin(t * 37) * Math.sin(t * 13)) * glitch
    if (videoMat.current) videoMat.current.opacity = 0.95 * flicker
    frame.opacity = (0.75 + 0.25 * Math.sin(t * 4)) * flicker
    if (scanMat.current) {
      scan.offset.y = -t * 0.6
      scanMat.current.opacity = 0.35 * flicker
    }
    if (beam.current) beam.current.material.opacity = (0.16 + Math.sin(t * 3) * 0.04) * r

    if (spin.current) {
      // Mira siempre hacia la cámara (solo en horizontal) y flota suavemente
      spin.current.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z)
      spin.current.position.y = Math.sin(t * 1.2) * 0.08
    }
    if (ring.current) ring.current.rotation.z = t * 0.8
  })

  const bar = (w, h, px, py) => (
    <mesh position={[px, py, 0.002]} material={frame}>
      <planeGeometry args={[w, h]} />
    </mesh>
  )

  return (
    <group position={[x, 0, z]}>
      {/* Haz de luz que sale del chorro de la fuente */}
      <mesh ref={beam} position-y={BEAM_FROM + BEAM_H / 2}>
        <cylinderGeometry args={[0.8, 0.08, BEAM_H, 24, 1, true]} />
        <meshBasicMaterial color={CYAN} opacity={0} {...additive} />
      </mesh>

      <group ref={spin}>
        <group ref={screen} position-y={Y}>
          {/* Vídeo: con mezcla aditiva lo negro se vuelve transparente, como un holograma */}
          <mesh>
            <planeGeometry args={[W, H]} />
            <meshBasicMaterial ref={videoMat} map={texture} color="#b8f4ff" {...additive} />
          </mesh>
          {/* Líneas de escaneo que se desplazan */}
          <mesh position-z={0.001}>
            <planeGeometry args={[W, H]} />
            <meshBasicMaterial ref={scanMat} map={scan} color={CYAN} {...additive} />
          </mesh>
          {/* Marco brillante */}
          {bar(W + 0.04, 0.025, 0, H / 2)}
          {bar(W + 0.04, 0.025, 0, -H / 2)}
          {bar(0.025, H, -W / 2, 0)}
          {bar(0.025, H, W / 2, 0)}
        </group>

        {/* Aro giratorio en la base */}
        <mesh ref={ring} position-y={BOTTOM - 0.1} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.55, 0.62, 48, 1, 0, Math.PI * 1.6]} />
          <meshBasicMaterial color={CYAN} opacity={0.85} {...additive} />
        </mesh>

        <Label position={[0, BOTTOM + H + 0.28, 0]} fontSize={0.26} letterSpacing={0.12} color="#a5f3fc" outlineWidth={0.012} outlineColor="#0e7490">
          TASKORIT
        </Label>
        <Label weight="regular" position={[0, BOTTOM + H + 0.08, 0]} fontSize={0.12} color="#cffafe">
          {near ? 'Pulsa E para probarla' : 'Tu día organizado, de un vistazo'}
        </Label>
      </group>

      {/* Zona para abrir la demo desde la fuente */}
      <Interactable
        id="hologram"
        position={[0, 1, 2.6]}
        size={[1.6, 1, 0.8]}
        title="Taskorit"
        subtitle="Mi app de tareas · anuncio en holograma"
        actions={[
          { key: 'E', label: 'Probar Taskorit', run: () => openUrl(taskorit.demo) },
          { key: 'R', label: 'Ver código', run: () => openUrl(taskorit.code) },
        ]}
      />
    </group>
  )
}
