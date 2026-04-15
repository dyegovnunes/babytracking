import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Lê a versão do package.json em tempo de build pra ser injetada via `define`
// (__APP_VERSION__). Assim SettingsPage não precisa importar o package.json
// diretamente (o que exigiria resolveJsonModule + alterar include no tsconfig).
const pkgUrl = new URL('./package.json', import.meta.url)
const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf-8')) as {
  version: string
}

export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? './' : '/',
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
