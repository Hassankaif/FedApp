import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,        // Force this app to Port 5174
    strictPort: true,  // Crash if 5174 is busy (instead of switching randomly)
  }
})