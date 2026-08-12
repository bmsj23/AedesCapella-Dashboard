import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // MapLibre GL JS 6 instantiates its worker with `{ type: 'module' }`, so the
  // worker asset Vite emits for `?worker&url` must be an ES module too.
  worker: {
    format: 'es',
  },
})
