import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // The scheduler is pure. No DOM is needed until session 7 brings
    // component tests for the chip quiz.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // The scheduler simulation prints interval tables. They are the point of
    // the test, so they must survive `npm run test` rather than needing a flag.
    disableConsoleIntercept: true,
  },
})
