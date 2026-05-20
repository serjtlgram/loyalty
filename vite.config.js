import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ВАЖНО: Вместо 'название-репозитория' впиши имя, которое ты дашь репозиторию на GitHub (например: 'ton-loyalty-app')
  base: '/название-репозитория/', 
})
