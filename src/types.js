export type HashType = { [key: string]: any }

export type MessageType = {
  name: 'notification',
  length: number,
  processId: number,
  channel: string,
  payload: string
}

export type SubscriptionType = {
  userId: string,
  model: string,
  params: HashType,
  send: (HashType) => void
}
