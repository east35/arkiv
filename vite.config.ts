import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DEV_FUNCTIONS_PROXY_PATH = "/__supabase/functions/v1"
const DEV_FUNCTIONS_PROXY_ORIGIN = "http://localhost:5173"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const supabaseUrl = env.VITE_SUPABASE_URL
  const proxyFunctionsInDev = env.VITE_SUPABASE_FUNCTIONS_PROXY !== "false" && Boolean(supabaseUrl)

  return {
    server: {
      host: true,
      proxy: proxyFunctionsInDev
        ? {
            [DEV_FUNCTIONS_PROXY_PATH]: {
              target: supabaseUrl,
              changeOrigin: true,
              headers: {
                origin: DEV_FUNCTIONS_PROXY_ORIGIN,
              },
              configure: (proxy) => {
                proxy.on("proxyReq", (proxyReq) => {
                  // Hosted functions allow localhost/127.0.0.1 by default.
                  // Normalizing the upstream Origin keeps local dev working
                  // even when the browser is served from a custom hostname.
                  proxyReq.setHeader("origin", DEV_FUNCTIONS_PROXY_ORIGIN)
                })
              },
              rewrite: (proxyPath) => proxyPath.replace(DEV_FUNCTIONS_PROXY_PATH, "/functions/v1"),
            },
          }
        : undefined,
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
