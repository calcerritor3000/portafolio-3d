import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { KeyboardControls, PerformanceMonitor, Stats, useProgress } from '@react-three/drei'
import { Physics, useRapier } from '@react-three/rapier'
import { Color } from 'three'
import { preloadFont } from 'troika-three-text'
import { DEBUG, player, useGame, slowmo, touchInput } from '../state/store'
import { theme, sky, FONT_BOLD, FONT_REGULAR, FONT_MONO } from '../theme'
import { setMusicOn } from '../audio/sfx'
import Room from './Room'
import World from './World'
import Player from './Player'
import CameraRig from './CameraRig'
import Effects from './Effects'

const KEYS = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'kick', keys: ['KeyE', 'KeyF'] },
]

const showColliders = new URLSearchParams(window.location.search).has('physics')

// Al abrir un enlace (LinkedIn, GitHub...) la pestaña pierde el foco y nunca recibe el keyup:
// sin esto, al volver el avatar seguiría andando o cargando el chut. Se sueltan todas las teclas.
function useReleaseKeysOnBlur() {
  useEffect(() => {
    const release = () => {
      for (const { keys } of KEYS) for (const code of keys) window.dispatchEvent(new KeyboardEvent('keyup', { code }))
      Object.assign(touchInput, { x: 0, z: 0, run: false, jump: false, kick: false })
    }
    const onVisibility = () => document.hidden && release()
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}

export default function Experience() {
  useReleaseKeysOnBlur()
  const markStep = useGame((s) => s.markStep)
  const setAssets = useGame((s) => s.setAssets)
  const quality = useGame((s) => s.quality)
  const music = useGame((s) => s.music)
  const phase = useGame((s) => s.phase)
  const slow = useGame((s) => s.slowmo)
  const { progress, total, active } = useProgress()
  const high = quality === 'high'
  const dpr = high ? Math.min(window.devicePixelRatio || 1, 1.5) : 1

  // Modelos/texturas (LoadingManager de three)
  useEffect(() => {
    setAssets(total === 0 || (!active && progress === 100) ? 1 : progress / 100)
  }, [progress, total, active, setAssets])

  useEffect(() => {
    const fonts = [FONT_BOLD, FONT_REGULAR, FONT_MONO]
    let done = 0
    fonts.forEach((font) =>
      preloadFont({ font }, () => {
        if (++done === fonts.length) markStep('fonts')
      }),
    )
  }, [markStep])

  useEffect(() => {
    if (phase === 'playing') setMusicOn(music)
  }, [music, phase])

  return (
    <KeyboardControls map={KEYS}>
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 45, near: 0.1, far: 140, position: [0, 10, 12] }}
        gl={{ antialias: high, powerPreference: 'high-performance' }}
        style={{ position: 'fixed', inset: 0 }}
        onCreated={() => DEBUG && console.info(`[carga] canvas creado a los ${Math.round(performance.now())} ms`)}
      >
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => {
            const s = useGame.getState()
            if (s.qualityAuto && s.quality === 'high') {
              s.setQuality('low', false)
              s.showToast('Calidad ajustada', 'Se han reducido efectos para que vaya fluido')
            }
          }}
        />
        <Atmosphere />
        <Lights />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} debug={showColliders} paused={slow} timeStep={slow ? 'vary' : 1 / 60}>
            <StepDone step="physics" />
            <SlowMotion />
            <Suspense fallback={null}>
              <Room />
              <World />
              <Player />
              <Effects />
              <SceneReady />
            </Suspense>
          </Physics>
        </Suspense>
        <CameraRig />
        {DEBUG && <Stats />}
      </Canvas>
    </KeyboardControls>
  )
}

function StepDone({ step }) {
  const markStep = useGame((s) => s.markStep)
  useEffect(() => markStep(step), [markStep, step])
  return null
}

function SlowMotion() {
  const { step } = useRapier()
  useFrame((_, delta) => {
    const s = useGame.getState()
    const on = performance.now() < slowmo.until
    if (on !== s.slowmo) useGame.setState({ slowmo: on })
    if (s.slowmo) step(Math.min(delta, 0.05) * slowmo.scale)
  })
  return null
}

// Compila los shaders antes de quitar la pantalla de carga (evita tirones al empezar)
function SceneReady() {
  const { gl, scene, camera } = useThree()
  const markStep = useGame((s) => s.markStep)
  useEffect(() => {
    gl.compile(scene, camera)
    let frames = 0
    let id = requestAnimationFrame(function tick() {
      if (++frames >= 3) markStep('scene')
      else id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [gl, scene, camera, markStep])
  return null
}

// Fondo y niebla con transición suave entre día y noche
function Atmosphere() {
  const { scene } = useThree()
  const target = useRef(new Color(theme.bg))
  useEffect(() => {
    scene.background = new Color(theme.bg)
  }, [scene])
  useFrame((_, dt) => {
    const t = sky[useGame.getState().timeOfDay]
    target.current.set(t.bg)
    scene.background.lerp(target.current, Math.min(1, dt * 2))
    if (scene.fog) {
      scene.fog.color.copy(scene.background)
      scene.fog.far += (t.fogFar - scene.fog.far) * Math.min(1, dt * 2)
    }
  })
  return <fog attach="fog" args={[theme.bg, 26, 62]} />
}

// La luz principal sigue al jugador: sombras nítidas con un shadow map pequeño
function Lights() {
  const light = useRef()
  const hemi = useRef()
  const quality = useGame((s) => s.quality)
  const tmp = useRef(new Color())
  useFrame((_, dt) => {
    const l = light.current
    const p = player.position
    l.position.set(p.x + 7, p.y + 14, p.z + 5)
    l.target.position.set(p.x, p.y, p.z)
    l.target.updateMatrixWorld()
    const t = sky[useGame.getState().timeOfDay]
    const k = Math.min(1, dt * 2)
    l.intensity += (t.sun - l.intensity) * k
    l.color.lerp(tmp.current.set(t.sunColor), k)
    hemi.current.intensity += (t.hemi - hemi.current.intensity) * k
    hemi.current.color.lerp(tmp.current.set(t.hemiSky), k)
    hemi.current.groundColor.lerp(tmp.current.set(t.hemiGround), k)
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#8d8ad0', '#2a2238', 1.45]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        ref={light}
        castShadow={quality === 'high'}
        intensity={1.7}
        color="#dcd9ff"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
    </>
  )
}
