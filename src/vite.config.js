import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: change 'recruit-os' to your actual repo name
  base: '/recruit-os/',
})
