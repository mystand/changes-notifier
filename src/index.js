// @flow
import url from 'url'
import WebSocket from 'ws'
// import jwtDecode from 'jwt-decode'
import pg from 'pg'
import fetch from 'node-fetch'
import jexl from 'jexl'
import qs from 'qs'
import URI from 'urijs'
import type { PsqlMessageType, SubscriptionType, HashType, SubscribeArgsType } from './types'
import config from './config'

const NOTIFY_EVENT = 'table_change'
const subscriptions: { [key: string]: SubscriptionType } = {}

async function isObjectComplyCondition(object: HashType, condition: ?string): Promise<boolean> {
  if (condition == null) return true
  try {
    const result = await jexl.eval(condition, { o: object })
    return !!result
  } catch (e) {
    console.error(e)
    return false
  }
}

function fetchObject(authToken?: string, getUrl: string): Promise<HashType> {
  const headers: HashType = authToken ? {
    authorization: `Bearer ${authToken}`
  } : {}

  const fullGetUrl: string = url.resolve(config.backend, getUrl)

  return fetch(fullGetUrl, { headers }).then((res) => {
    return res.status === 200 ? res.json() : Promise.reject(res.status)
  })
}

function notifyCreate(subscription: SubscriptionType, object: HashType, getUrl?: string): void {
  if (!getUrl) {
    subscription.send({ action: 'create', object })
  } else {
    fetchObject(subscription.authToken, getUrl).then((gotObject) => {
      subscription.send({ action: 'create', object: gotObject })
    })
  }
}

function notifyUpdate(subscription: SubscriptionType, object: HashType, getUrl?: string): void {
  if (!getUrl) {
    subscription.send({ action: 'update', object })
  } else {
    fetchObject(subscription.authToken, getUrl).then((gotObject) => {
      subscription.send({ action: 'update', object: gotObject })
    }).catch((status) => {
      if ([400, 403, 404].includes(status)) {
        subscription.send({ action: 'destroy', object: { id: object.id } })
      }
    })
  }
}

function notifyDestroy(subscription: SubscriptionType, object: HashType): void {
  subscription.send({ action: 'destroy', object })
}

const { pg: pgConfig } = config
// $FlowIgnore
pg.connect(`postgres://${pgConfig.host}/${pgConfig.db}`, (error, client) => {
  if (error) throw error

  client.on('notification', (msg: PsqlMessageType) => {
    if (msg.name === 'notification') {
      const payload = JSON.parse(msg.payload)
      const { model, action, object, getUrl } = payload

      console.info('NOTIFICATION', model, action, object, getUrl)
      for (const guid in subscriptions) {
        if (subscriptions.hasOwnProperty(guid)) {
          const subscription: SubscriptionType = subscriptions[guid]
          let getUrlWithQuery
          if (action !== 'destroy' && subscription.getUrlOptions) {
            // query of urijs can't parse nested query parameters
            const query = qs.stringify(subscription.getUrlOptions)
            // eslint-disable-next-line babel/new-cap
            getUrlWithQuery = URI(getUrl).query(query).toString()
          } else { getUrlWithQuery = getUrl }
          if (subscription.model === model) {
            isObjectComplyCondition(object, subscription.condition)
              .then((isComply: boolean) => {
                if (isComply) {
                  if (action === 'create') notifyCreate(subscription, object, getUrlWithQuery)
                  else if (action === 'update') notifyUpdate(subscription, object, getUrlWithQuery)
                  else if (action === 'destroy') notifyDestroy(subscription, object)
                }
              })
              .catch(console.error)
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

server.on('connection', (ws) => {
  const authToken = ws.upgradeReq.headers['sec-websocket-protocol']
  // const user = jwtDecode(authToken) // todo catch error

  function unSubscribe(guid: string) {
    delete subscriptions[guid]
    console.info('UNSUBSCRIBE', guid)
  }

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
      const { model, condition, getUrlOptions, guid } = (args: SubscribeArgsType)
      const send = (data: HashType) => ws.send(JSON.stringify({ guid, ...data }))
      subscriptions[guid] = { model, condition, getUrlOptions, authToken, send }
      console.info('SUBSCRIBE', guid, model, condition, getUrlOptions)
    }

    if (command === 'unSubscribe') unSubscribe(args.guid)
  })

  ws.on('close', () => {
    const guids = Object.keys(subscriptions)
    for (let i = 0; i < guids.length; ++i) {
      const guid = guids[i]
      if (subscriptions[guid].authToken === authToken) unSubscribe(guid)
    }
  })
})
