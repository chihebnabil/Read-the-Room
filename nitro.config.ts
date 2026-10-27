import { defineConfig } from 'nitro'

export default defineConfig({
  vercel: {
    // A full read makes several Qloo and model calls.
    functions: { maxDuration: 120 },
  },
})
