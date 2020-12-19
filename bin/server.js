#!/usr/bin/env node

/**
 * @type {any}
 */
const WebSocket = require('ws')
const wss = new WebSocket.Server({ noServer: true })
const setupWSConnection = require('./utils.js').setupWSConnection

const httpRequestListener = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
}

let server

const port = process.env.MODE || 'http'

if (process.env.MODE === 'https') {
  const https = require('https')
  const fs = require('fs')
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_PRIVATE_KEY_PATH, 'utf8'),
    cert: fs.readFileSync(process.env.SSL_FULL_CHAIN_PATH, 'utf8')
  }
  server = https.createServer(httpsOptions, httpRequestListener)
} else {
  const http = require('http')
  server = http.createServer(httpRequestListener)
}

const port = process.env.PORT || 1234

wss.on('connection', setupWSConnection)

server.on('upgrade', (request, socket, head) => {
  // You may check auth of request here..
  /**
   * @param {any} ws
   */
  const handleAuth = ws => {
    wss.emit('connection', ws, request)
  }
  wss.handleUpgrade(request, socket, head, handleAuth)
})

server.listen(port)

console.log('running on port', port)
