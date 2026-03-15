import { createServer } from "node:http"
import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const repoRoot = process.cwd()

const ALL_FUNCTIONS = [
  { name: "igdb-proxy", file: "supabase/functions/igdb-proxy/index.ts", port: 54332 },
  { name: "hardcover-proxy", file: "supabase/functions/hardcover-proxy/index.ts", port: 54333 },
  { name: "google-books-proxy", file: "supabase/functions/google-books-proxy/index.ts", port: 54334 },
  { name: "ai-chat-proxy", file: "supabase/functions/ai-chat-proxy/index.ts", port: 54335 },
  { name: "bookmark-metadata", file: "supabase/functions/bookmark-metadata/index.ts", port: 54336 },
]

const DEFAULT_FUNCTIONS = ["igdb-proxy", "hardcover-proxy", "bookmark-metadata"]
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

function isValidHttpUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {}

  const env = {}
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const separator = trimmed.indexOf("=")
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }

  return env
}

function requireDeno() {
  const result = spawnSync("deno", ["--version"], { stdio: "ignore" })
  if (result.status === 0) return

  console.error("Deno is required for local edge-function testing.")
  console.error("Install it first, then rerun `npm run dev:functions`.")
  console.error("Recommended on macOS: `brew install deno`")
  process.exit(1)
}

function buildChildEnv(env, port) {
  const supabaseUrl = isValidHttpUrl(env.SUPABASE_URL)
    ? env.SUPABASE_URL
    : env.VITE_SUPABASE_URL || ""

  const childEnv = {
    ...process.env,
    ...env,
    PORT: String(port),
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "",
    CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS
      || "http://localhost:5173,http://127.0.0.1:5173",
  }

  return childEnv
}

function validateEnv(env, functions) {
  const issues = []

  if (env.SUPABASE_URL && !isValidHttpUrl(env.SUPABASE_URL)) {
    console.warn(
      "[dev:functions] Ignoring invalid SUPABASE_URL in .env.functions.local and falling back to VITE_SUPABASE_URL.",
    )
  }

  if (functions.some((definition) => definition.name === "igdb-proxy")) {
    if (!env.TWITCH_CLIENT_ID) issues.push("TWITCH_CLIENT_ID is required for igdb-proxy")
    if (!env.TWITCH_CLIENT_SECRET) issues.push("TWITCH_CLIENT_SECRET is required for igdb-proxy")
  }

  if (functions.some((definition) => definition.name === "hardcover-proxy")) {
    if (!env.HARDCOVER_API_KEY) issues.push("HARDCOVER_API_KEY is required for hardcover-proxy")
  }

  if (functions.some((definition) => definition.name === "google-books-proxy")) {
    if (!isValidHttpUrl(env.SUPABASE_URL) && !isValidHttpUrl(env.VITE_SUPABASE_URL)) {
      issues.push("google-books-proxy requires a valid SUPABASE_URL or VITE_SUPABASE_URL")
    }
    if (!env.SUPABASE_ANON_KEY && !env.VITE_SUPABASE_ANON_KEY) {
      issues.push("google-books-proxy requires SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY")
    }
    if (!env.GOOGLE_BOOKS_API_KEY) {
      issues.push("GOOGLE_BOOKS_API_KEY is required for google-books-proxy")
    }
  }

  if (functions.some((definition) => definition.name === "ai-chat-proxy")) {
    if (!isValidHttpUrl(env.SUPABASE_URL) && !isValidHttpUrl(env.VITE_SUPABASE_URL)) {
      issues.push("ai-chat-proxy requires a valid SUPABASE_URL or VITE_SUPABASE_URL")
    }
    if (!env.SUPABASE_ANON_KEY && !env.VITE_SUPABASE_ANON_KEY) {
      issues.push("ai-chat-proxy requires SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY")
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      issues.push("ai-chat-proxy requires SUPABASE_SERVICE_ROLE_KEY")
    }
  }

  if (functions.some((definition) => definition.name === "bookmark-metadata")) {
    if (!isValidHttpUrl(env.SUPABASE_URL) && !isValidHttpUrl(env.VITE_SUPABASE_URL)) {
      issues.push("bookmark-metadata requires a valid SUPABASE_URL or VITE_SUPABASE_URL")
    }
    if (!env.SUPABASE_ANON_KEY && !env.VITE_SUPABASE_ANON_KEY) {
      issues.push("bookmark-metadata requires SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY")
    }
  }

  if (issues.length > 0) {
    throw new Error(`[dev:functions] Invalid local function environment:\n- ${issues.join("\n- ")}`)
  }
}

function resolveFunctions(env) {
  const requestedNames = (env.LOCAL_FUNCTIONS || DEFAULT_FUNCTIONS.join(","))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)

  const functions = requestedNames.map((name) => {
    const definition = ALL_FUNCTIONS.find((candidate) => candidate.name === name)
    if (!definition) {
      throw new Error(`Unknown local function: ${name}`)
    }
    return definition
  })

  if (functions.length === 0) {
    throw new Error("LOCAL_FUNCTIONS must include at least one function name")
  }

  return functions
}

function startFunctionProcess(definition, env) {
  const child = spawn(
    "deno",
    ["run", "--allow-net", "--allow-env", "--allow-read", path.join(repoRoot, definition.file)],
    {
      cwd: repoRoot,
      env: buildChildEnv(env, definition.port),
      stdio: "inherit",
    },
  )

  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return
    console.error(`[dev:functions] ${definition.name} exited (${signal ?? code ?? "unknown"})`)
  })

  return child
}

function getUpstreamRequestHeaders(req) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === "host" || normalizedKey === "content-length" || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      continue
    }

    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry)
      continue
    }

    headers.set(key, value)
  }

  // Keep the local runner responses uncompressed and free of proxy parsing issues.
  headers.set("accept-encoding", "identity")
  return headers
}

function getClientResponseHeaders(upstreamRes, bodyBuffer) {
  const headers = {}

  for (const [key, value] of upstreamRes.headers.entries()) {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === "content-length" || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      continue
    }
    headers[key] = value
  }

  headers["content-length"] = String(bodyBuffer.length)
  return headers
}

async function startProxyServer(proxyPort, routes) {
  const routeMap = new Map(routes.map((route) => [route.name, route]))

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`)
      const parts = url.pathname.split("/").filter(Boolean)

      if (parts[0] !== "functions" || parts[1] !== "v1" || !parts[2]) {
        res.writeHead(404, { "content-type": "application/json" })
        res.end(JSON.stringify({ error: "Function route not found" }))
        return
      }

      const route = routeMap.get(parts[2])
      if (!route) {
        res.writeHead(404, { "content-type": "application/json" })
        res.end(JSON.stringify({ error: `Unknown function: ${parts[2]}` }))
        return
      }

      const upstreamUrl = `http://127.0.0.1:${route.port}${url.pathname}${url.search}`
      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: getUpstreamRequestHeaders(req),
        body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
        duplex: "half",
      })

      const bodyBuffer = Buffer.from(await upstreamRes.arrayBuffer())
      const headers = getClientResponseHeaders(upstreamRes, bodyBuffer)
      res.writeHead(upstreamRes.status, headers)
      res.end(bodyBuffer)
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" })
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : "Local function proxy failed",
      }))
    }
  })

  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(proxyPort, "127.0.0.1", resolve)
  })

  return server
}

async function main() {
  requireDeno()

  const env = {
    ...parseEnvFile(path.join(repoRoot, ".env.local")),
    ...parseEnvFile(path.join(repoRoot, ".env.functions.local")),
  }

  const proxyPort = Number(env.FUNCTIONS_PROXY_PORT || 54331)
  const functions = resolveFunctions(env)
  validateEnv(env, functions)
  const children = functions.map((definition) => startFunctionProcess(definition, env))
  const server = await startProxyServer(proxyPort, functions)

  console.log(`[dev:functions] proxy listening on http://127.0.0.1:${proxyPort}/functions/v1`)
  for (const definition of functions) {
    console.log(`[dev:functions] ${definition.name} -> http://127.0.0.1:${definition.port}`)
  }

  const shutdown = () => {
    server.close()
    for (const child of children) child.kill("SIGTERM")
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
