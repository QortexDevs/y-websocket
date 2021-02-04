#!/usr/bin/env node

/**
 * @type {any}
 */
const WebSocket = require('ws')
const wss = new WebSocket.Server({ noServer: true })
const setupWSConnection = require('./utils.js').setupWSConnection
const setCookie = require('./cookie.js').setCookie

const httpRequestListener = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('okay')
}

let server

const mode = process.env.MODE || 'http'

const authRequester = require(mode)

if (mode === 'https') {
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
const authCallback = process.env.AUTH_CALLBACK || mode + '://localhost/auth/'

wss.on('connection', setupWSConnection)

server.on('upgrade', (request, socket, head) => {
  // You may check auth of request here..
  /**
   * @param {any} ws
   */
  const handleAuth = ws => {
    const cookie = request.headers.cookie
    setCookie(cookie)
    const postData = ''
    const authRequest = authRequester.request(authCallback, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookie
      }
    },
    (response) => {
      response.setEncoding('utf8')
      let data = ''
      response.on('data', (chunk) => {
        data += chunk
      })
      response.on('end', () => {
        const authData = JSON.parse(data)
        if (authData.status === 'ok') {
          wss.emit('connection', ws, request)
        }
      })
    })
    authRequest.write(postData)
    authRequest.end()
  }

  wss.handleUpgrade(request, socket, head, handleAuth)
})

server.listen(port)

console.log('running on port', port)
