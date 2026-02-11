import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { extensionReloadTrigger } from './scripts/vite-plugin-extension-reload'

const isWatch = process.env.WATCH === '1'

/**
 * Builds the side panel as a React + Tailwind app → dist/sidepanel.html + assets.
 * Uses the same shadcn design tokens as apps/web.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(isWatch ? [extensionReloadTrigger()] : [])],
  root: resolve(__dirname, 'src/sidepanel'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/sidepanel'),
    emptyOutDir: false,          // main build already created dist/
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'src/sidepanel/index.html'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    minify: process.env.BUILD_DEV ? false : 'esbuild',
    sourcemap: false,
  },
  resolve: {
    alias: {
      '~ui': resolve(__dirname, 'src/sidepanel/ui'),
      '~lib': resolve(__dirname, 'src/sidepanel/lib'),
    },
  },
})
