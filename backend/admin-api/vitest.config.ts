import { defineConfig, loadEnv } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['api/**/*.test.ts', 'lib/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
