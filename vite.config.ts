import { defineConfig, loadEnv, type Plugin } from 'vite'

// In development, answer /api/now (the Ember tile's live GitHub numbers) right here, using the same function that
// gets deployed (api/now.ts). It needs GITHUB_TOKEN in .env.local (git-ignored, never sent to the browser);
// without one it answers 503 and the tile falls back to public activity.
function nowDevApi(): Plugin {
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
  return {
    name: 'now-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/now', async (req, res) => {
        // Read .env.local on every request, so adding the token doesn't need a restart.
        const vars = loadEnv(server.config.mode, server.config.root, '')
        if (!vars.GITHUB_TOKEN) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Add GITHUB_TOKEN to .env.local to see private activity.' }))
          return
        }
        env.GITHUB_TOKEN = vars.GITHUB_TOKEN
        env.PUBLIC_REPOS = vars.PUBLIC_REPOS
        try {
          const mod = (await server.ssrLoadModule('/api/now.ts')) as { GET: (r: Request) => Promise<Response> }
          const out = await mod.GET(new Request(`http://localhost${req.url ?? ''}`, { headers: { origin: 'http://localhost:5173' } }))
          res.statusCode = out.status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(await out.text())
        } catch (error) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'now failed' }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [nowDevApi()],
})
