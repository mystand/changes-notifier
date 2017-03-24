// @flow
import url from 'url'
import WebSocket from 'ws'
import jwtDecode from 'jwt-decode'
import pg from 'pg'
import fetch from 'node-fetch'
import { decamelize } from 'humps'

import type { MessageType, SubscriptionType, HashType } from './types'
import config from './config'

const NOTIFY_EVENT = 'table_change'
const subscriptions = {}

function isObjectComplyParameters(object: HashType, params: HashType): boolean {
  const keys = Object.keys(params)
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i]
    if (object[key] !== params[key]) return false
  }
  return true
}

const { pg: pgConfig } = config
// $FlowFixMe
pg.connect(`postgres://${pgConfig.host}/${pgConfig.db}`, (error, client) => {
  if (error)throw error

  client.on('notification', (msg: MessageType) => {
    if (msg.name === 'notification') {
      const payload = JSON.parse(msg.payload)
      const { model, action, object, getUrl } = payload

      console.info('NOTIFICATION', model, action, object, getUrl)

      for (const guid in subscriptions) {
        if (subscriptions.hasOwnProperty(guid)) {
          const subscription: SubscriptionType = subscriptions[guid]
          if (subscription.model === model || isObjectComplyParameters(object, subscription.params)) {
            if (!getUrl) {
              subscription.send({ guid, action, object })
              console.info('SEND', guid, action, object)
            } else {
              const headers = subscription.authToken ? {
                authorization: `Bearer ${subscription.authToken}`
              } : {}

              const fullGetUrl = url.resolve(config.backend, getUrl)

              fetch(fullGetUrl, { headers }).then(res => res.json()).then((gotObject) => {
                subscription.send({ guid, action, gotObject })
                console.info('SEND', guid, action, gotObject)
              })
            }
          }
        }
      }
    }
  })

  client.query(`LISTEN ${NOTIFY_EVENT}`)
})

const { port } = config
const server = new WebSocket.Server({
  perMessageDeflate: false,
  port
})
console.info(`Listening at ws://0.0.0.0:${port}/`)

function decamelizeObject(object) {
  const result = {}
  Object.keys(object).forEach((key) => {
    result[decamelize(key)] = object[key]
  })
  return result
}

server.on('connection', function connection(ws) {
  const authToken = ws.upgradeReq.headers['sec-websocket-protocol']
  const user = jwtDecode(authToken) // todo catch error
  const userId = String(user.id)

  ws.on('message', (message: string) => {
    console.info('MESSAGE', message)

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
      const send = (data: HashType) => ws.send(JSON.stringify(data))
      const decamelizedParams = decamelizeObject(params)
      subscriptions[guid] = { userId, model, params: decamelizedParams, authToken, send }
      console.info('SUBSCRIBE', guid, model, decamelizedParams )
    }

    if (command === 'unsubscribe') {
      const { guid } = args
      delete subscriptions[guid]
    }
  })

  ws.on('close', () => {
    const guids = Object.keys(subscriptions)
    for (let i = 0; i < guids.length; ++i) {
      const guid = guids[i]
      if (subscriptions[guid].userId === userId) delete subscriptions[guid]
    }
  })
})
