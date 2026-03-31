import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'

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
      copyFileSync(
        resolve(__dirname, 'src/offscreen.html'),
        resolve(distDir, 'offscreen.html'),
      )
      copyFileSync(
        resolve(__dirname, 'src/sandbox.html'),
        resolve(distDir, 'sandbox.html'),
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
const entry = process.env.BUILD_ENTRY

// When BUILD_ENTRY is set, build only that entry (no code splitting).
// Otherwise build all (may produce shared chunks - fine for dev).
const ENTRIES: Record<string, string> = {
  content: resolve(__dirname, 'src/content.ts'),
  background: resolve(__dirname, 'src/background.ts'),
  offscreen: resolve(__dirname, 'src/offscreen.ts'),
  sandbox: resolve(__dirname, 'src/sandbox.ts'),
}

const input = entry && ENTRIES[entry]
  ? { [entry]: ENTRIES[entry] }
  : ENTRIES

export default defineConfig({
  plugins: [
    copyManifest(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: !entry && !isWatch,
    target: 'es2022',
    rollupOptions: {
      input,
      output: {
        entryFileNames: '[name].js',
        format: 'es',
        // When building a single entry, this prevents code splitting
        ...(entry ? { inlineDynamicImports: true } : {}),
      },
    },
    cssCodeSplit: false,
    minify: process.env.BUILD_DEV ? false : 'esbuild',
    sourcemap: process.env.BUILD_DEV ? true : (process.env.NODE_ENV === 'production' ? false : 'inline'),
    chunkSizeWarningLimit: 600,
  },
})
