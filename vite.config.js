import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Относительные пути — для работы на GitHub Pages (в т.ч. в подпапке)
  base: './',
  build: {
    // Разбиваем тяжёлые сторонние библиотеки на отдельные чанки
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'charts', test: /node_modules[\\/](recharts|d3-)/ },
            { name: 'excel', test: /node_modules[\\/](xlsx|codepage|cfb|ssf|frac|commander)/ },
            { name: 'dnd', test: /node_modules[\\/](@hello-pangea|@liveblocks|css-box-model|memoize-one|rafl|tiny-invariant|use-memo-one)/ },
          ],
        },
      },
    },
  },
})