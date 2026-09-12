import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Применяем сохранённую тему до рендера, чтобы не "мигало"
try {
  const saved = window.localStorage.getItem('habit-tracker-theme');
  const dark = saved ? JSON.parse(saved) === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (dark) document.documentElement.classList.add('dark');
} catch {
  // игнорируем ошибки локального хранилища
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)