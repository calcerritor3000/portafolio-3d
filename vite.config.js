import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Se publica dentro del portfolio en /3d/ (https://jorge-calcerrada.expo.app/3d/)
  base: '/3d/',
  plugins: [react()],
  build: {
    // El chunk 3D (three + física) es grande por naturaleza; se carga aparte con barra de progreso
    chunkSizeWarningLimit: 2500,
  },
})
