import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { injectReloadClient, extensionReloadTrigger } from './scripts/vite-plugin-extension-reload'

/**
 * Copies manifest.json and extension icons into dist/ after build.
 */
function copyManifest(): Plugin {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist')
      mkdirSync(distDir, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json'),
      )
      const iconsDir = resolve(__dirname, 'icons')
      if (existsSync(iconsDir)) {
        const distIcons = resolve(distDir, 'icons')
        mkdirSync(distIcons, { recursive: true })
        for (const size of [16, 48, 128]) {
          const src = resolve(iconsDir, `icon${size}.png`)
          if (existsSync(src)) {
            copyFileSync(src, resolve(distIcons, `icon${size}.png`))
          }
        }
      }
    },
  }
}

const isWatch = process.env.WATCH === '1'

export default defineConfig({
  plugins: [
    copyManifest(),
    // Dev-only: inject WS reload client into background + trigger reload on build (only when WATCH=1)
    ...(isWatch
      ? [injectReloadClient('src/background.ts'), extensionReloadTrigger()]
      : []),
  ],
  build: {
    outDir: 'dist',
    // In watch mode (WATCH=1) do not clear dist/ so recorder-inject and sidepanel outputs are preserved
    emptyOutDir: process.env.WATCH !== '1',
    target: 'es2022',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        // Use ES format — Chrome MV3 background is already "type": "module"
        // and content scripts in MAIN world can run as plain ES modules
        format: 'es',
        // Prevent code splitting — each entry must be a standalone file
        manualChunks: undefined,
      },
    },
    // Inline all dependencies so each file is self-contained
    cssCodeSplit: false,
    minify: process.env.BUILD_DEV ? false : 'esbuild',
    sourcemap: process.env.BUILD_DEV ? true : (process.env.NODE_ENV === 'production' ? false : 'inline'),
    chunkSizeWarningLimit: 600,
  },
})
