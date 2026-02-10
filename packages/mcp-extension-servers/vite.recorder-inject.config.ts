import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { extensionReloadTrigger } from './scripts/vite-plugin-extension-reload'

const isWatch = process.env.WATCH === '1'

/** Builds recorder-inject as a single file (no shared chunks) for injection into any tab. */
export default defineConfig({
  plugins: [...(isWatch ? [extensionReloadTrigger()] : [])],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'src/recorder-inject.ts'),
      output: {
        entryFileNames: 'recorder-inject.js',
        format: 'iife',
        name: 'IzanRecorderInject',
        inlineDynamicImports: true,
      },
    },
    minify: process.env.BUILD_DEV ? false : 'esbuild',
    sourcemap: false,
  },
})
