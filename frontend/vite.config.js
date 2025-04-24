import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Explicitly configure env file loading
  envDir: '.',
  // Require variables to start with VITE_ prefix
  envPrefix: 'VITE_',
})
