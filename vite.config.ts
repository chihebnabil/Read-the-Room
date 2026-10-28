import { existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In local dev the project's .env wins over stale variables set on the machine. Deployments have no .env file.
function preferDotEnv() {
  if (!existsSync('.env')) return
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

export default defineConfig(({ command }) => {
  if (command === 'serve') preferDotEnv()
  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  }
})
