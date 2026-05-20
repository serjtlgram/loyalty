import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.jsx'

// ВАЖНО: Когда выложишь проект на GitHub, поменяй эту ссылку на свою!
// Пример: 'https://твой-логин.github.io/твой-репозиторий/tonconnect-manifest.json'
// Пока используем тестовый манифест от TON, чтобы кнопка работала при разработке.
const manifestUrl = 'https://serjtlgram.github.io/loyalty/tonconnect-manifest.json';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)