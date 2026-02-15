import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "./",   // ⭐⭐⭐ এটা না থাকলে Netlify blank page দেয়
})
