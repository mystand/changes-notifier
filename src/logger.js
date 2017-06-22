// TODO: Use flow
import config from './config'
import * as dateHelper from './date-helper'

const LOG_LEVELS = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
}

export const DEFAULT_LOG_LEVEL = LOG_LEVELS.INFO
export const CURRENT_LOG_LEVEL = parseLogLevel(config.logLevel) || DEFAULT_LOG_LEVEL

function shouldLog(logLevel) {
  return logLevel <= CURRENT_LOG_LEVEL
}

function getKeyByValue(value, object) {
  return Object.keys(object).find(key => object[key] === value)
}

function parseLogLevel(name) {
  const parsedLogLevel = LOG_LEVELS[name]

  if (parsedLogLevel) {
    return parsedLogLevel
  } else {
    throw new Error(`Cannot parse log level "${name}". Should be string representing one of logger.LOG_LEVELS  keys.`)
  }
}

function logPrefixedMessage(message, logLevel) {
  // eslint-disable-next-line no-console
  console.log(`[${dateHelper.formatNewDate()}][${getKeyByValue(logLevel, LOG_LEVELS)}] ${message}`)
}

export function error(messageSource) {
  const logLevel = LOG_LEVELS.ERROR

  if (shouldLog(logLevel)) {
    const message = typeof messageSource === 'function' ? messageSource() : messageSource

    console.error(`[${dateHelper.formatNewDate()}][${getKeyByValue(logLevel, LOG_LEVELS)}] ${message}`)
  }
}

export function info(messageSource) {
  log(messageSource, LOG_LEVELS.INFO)
}

export function debug(messageSource) {
  log(messageSource, LOG_LEVELS.DEBUG)
}

export function log(messageSource, logLevel = DEFAULT_LOG_LEVEL) {
  if (shouldLog(logLevel)) {
    const message = typeof messageSource === 'function' ? messageSource() : messageSource

    logPrefixedMessage(message)
  }
}

export function time(timerName, logLevel = LOG_LEVELS.DEBUG) {
  if (shouldLog(logLevel)) {
    logPrefixedMessage(`Timer start: ${timerName}`)
    // eslint-disable-next-line no-console
    console.time(timerName)
  }
}

export function timeEnd(timerName, logLevel = LOG_LEVELS.DEBUG) {
  if (shouldLog(logLevel)) {
    logPrefixedMessage(`Timer end: ${timerName}`)
    // eslint-disable-next-line no-console
    console.timeEnd(timerName)
  }
}

export function getCurrentLogLevelName() {
  return getKeyByValue(CURRENT_LOG_LEVEL, LOG_LEVELS)
}
