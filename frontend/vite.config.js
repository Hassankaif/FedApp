import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../',  //  This tells Vite to load .env from the root folder
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      }
    }
  }
})


// export default defineConfig({
//   plugins: [react()],
//   envDir: '../', // 👈 This tells Vite to load .env from the root folder
//   server: {
//     port: 5173,
//   }
// })
