// @flow

export type HashType = { [key: string]: any }

export type PsqlMessageType = {
  name: 'notification',
  length: number,
  processId: number,
  channel: string,
  payload: string
}

export type SubscriptionType = {
  model: string,
  condition: ?string,
  authToken?: string,
  send: (HashType) => void
}

export type SubscribeArgsType = {
  guid: string,
  model: string,
  condition: ?string,
  getUrlOptions: ?Object
}
