// @flow
import path from 'path'
import util from 'util'
import fs from 'fs'

import config from './config'
import * as dateHelper from './date-helper'
import type { HashType } from './types'

const LOG_LEVELS = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
}

export const CURRENT_LOG_LEVEL: number = parseLogLevelOrDefault(config.logLevel, LOG_LEVELS.INFO)
export const TIMESTAMP_ENABLED: boolean = config.logTimestampEnabled || false
export const LOGFILE_ENABLED: boolean = config.logFileEnabled || false
export const LOGFILE_PATH: string = path.join(__dirname, '..', 'log', 'changes-notifier.log')

const timers: { [timerName: string]: Date } = {}

function shouldLog(logLevel: number): boolean {
  return logLevel <= CURRENT_LOG_LEVEL
}

function getKeyByValue(value, object: HashType): string {
  const result = Object.keys(object).find(key => object[key] === value)

  if (result) {
    return result
  } else {
    console.error(`Cannot get key by value ${value} in object`, object)
    throw new Error()
  }
}

function parseLogLevelOrDefault(logLevelName: string, defaultLogLevel: number): number {
  const parsedLogLevel: ?number = LOG_LEVELS[logLevelName]

  if (parsedLogLevel) {
    return parsedLogLevel
  } else {
    return defaultLogLevel
  }
}

function timeStamp() {
  return `[${dateHelper.formatNewDate()}]`
}

function logLevelStamp(logLevel) {
  return `[${getKeyByValue(logLevel, LOG_LEVELS)}]`
}

function stamps(logLevel) {
  return TIMESTAMP_ENABLED ? timeStamp() + logLevelStamp(logLevel) : logLevelStamp(logLevel)
}

function toString(anything: any) {
  return typeof anything === 'string' ? anything : util.inspect(anything)
}

function appendPrefixedMessageToFile(logLevel: number, ...otherArguments: any) {
  const logString: string = otherArguments.map(toString).reduce((acc, str) => `${acc} ${str}`, '')
  // TODO: Calling an asynchronous function without callback is deprecated.
  fs.appendFile(LOGFILE_PATH, `${stamps(logLevel)}${logString}\n`)
}

function logPrefixedMessage(logLevel: number, ...otherArguments: any) {
  // eslint-disable-next-line no-console
  console.log(stamps(logLevel), ...otherArguments)

  if (LOGFILE_ENABLED) {
    appendPrefixedMessageToFile(logLevel, ...otherArguments)
  }
}

export function error() {
  const logLevel = LOG_LEVELS.ERROR

  if (shouldLog(logLevel)) {
    console.error(stamps(logLevel), ...arguments)

    if (LOGFILE_ENABLED) {
      appendPrefixedMessageToFile(logLevel, ...arguments)
    }
  }
}

export function info() {
  log(LOG_LEVELS.INFO, ...arguments)
}

export function debug() {
  log(LOG_LEVELS.DEBUG, ...arguments)
}

export function log(logLevel: number, ...otherArguments: any) {
  if (shouldLog(logLevel)) {
    logPrefixedMessage(logLevel, ...otherArguments)
  }
}

export function timeStart(timerName: string, logLevel?: number = LOG_LEVELS.DEBUG) {
  if (shouldLog(logLevel)) {
    timers[timerName] = new Date()
    logPrefixedMessage(logLevel, `Timer start: ${timerName}`)
  }
}

export function timeEnd(timerName: string, logLevel?: number = LOG_LEVELS.DEBUG) {
  if (shouldLog(logLevel)) {
    logPrefixedMessage(logLevel, `Timer end: ${timerName}. Duration: ${new Date() - timers[timerName]}ms`)
    delete timers[timerName]
  }
}

export function getCurrentLogLevelName() {
  return getKeyByValue(CURRENT_LOG_LEVEL, LOG_LEVELS)
}
