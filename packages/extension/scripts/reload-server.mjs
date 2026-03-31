import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = 8089
const wss = new WebSocketServer({ noServer: true })

const httpServer = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/trigger') {
    let count = 0
    for (const ws of wss.clients) {
      if (ws.readyState === 1) { ws.send('reload'); count++ }
    }
    console.log(`[reload-server] Broadcast reload to ${count} client(s)`)
    res.writeHead(200).end('ok')
  } else {
    res.writeHead(404).end()
  }
})

httpServer.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws))
})

httpServer.listen(PORT, () => {
  console.log(`[reload-server] Listening on http://localhost:${PORT}`)
})
