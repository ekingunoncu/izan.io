import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 65_000,
    // Retry rate-limited tests once (CoinGecko free tier is strict)
    retry: 1,
    // Run test files sequentially to respect CoinGecko rate limits
    fileParallelism: false,
    // Run tests within a file sequentially
    sequence: {
      concurrent: false,
    },
  },
})
