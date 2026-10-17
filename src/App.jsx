import { lazy, Suspense } from 'react'
import { useGame } from './state/store'
import Loader from './ui/Loader'
import Hud from './ui/Hud'

// El motor 3D (three, R3F, física) va en un chunk aparte: la pantalla de carga aparece
// al instante y el progreso de esa descarga cuenta como el primer paso de la barra.
const experienceModule = import('./scene/Experience.jsx').then((m) => {
  useGame.getState().markStep('engine')
  return m
})
const Experience = lazy(() => experienceModule)

const hasWebGL = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
})()

export default function App() {
  return (
    <>
      {hasWebGL && (
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      )}
      <Hud />
      <Loader webgl={hasWebGL} />
    </>
  )
}
