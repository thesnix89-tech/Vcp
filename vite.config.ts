import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is configurable so the same build can be deployed to:
//   /                       (devinapps.com root)
//   /<repo-name>/           (GitHub Pages project site)
// In CI, set VITE_BASE_PATH=/<repo-name>/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
