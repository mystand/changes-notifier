import WebSocket from 'ws'
// import jwtDecode from 'jwt-decode'
import pg from 'pg'

import config from './config'

const { pg: pgConfig } = config

type MessageType = {
  name: 'notification',
  length: number,
  processId: number,
  channel: string,
  payload: string
}

pg.connect(`postgres://${pgConfig.host}/${pgConfig.db}`, (error, client) => {
  if (error)throw error

  client.on('notification', (msg: MessageType) => {
    if (msg.name === 'notification' && msg.channel === 'table_update') {
      const pl = JSON.parse(msg.payload)
      console.info(pl)
    }
  })

  client.query('LISTEN table_update')
})

const { port } = config
const server = new WebSocket.Server({
  perMessageDeflate: false,
  port
})
console.info(`Listening at ws://0.0.0.0:${port}/`)

// const connections = {}


server.on('connection', function connection(ws) {
  // const authToken = ws.upgradeReq.headers['sec-websocket-protocol']
  // const user = jwtDecode(authToken)

  const subscriptions = {}

  ws.on('message', (message: string) => {
    let jsonMessage
    try {
      jsonMessage = JSON.parse(message)
    } catch (error) {
      ws.send(JSON.stringify({ error }))
      return
    }

    const { command, args } = jsonMessage

    if (command === 'subscribe') {
      const { model, params, guid } = args
      subscriptions[guid] = { model, params }
    }

    if (command === 'unsubscribe') {
      const { guid } = args
      delete subscriptions[guid]
    }
  })

  ws.on('close', () => {
    // delete connections[key]
  })
})
