// TODO: Use flow

function padWithZero(number) {
  return number < 10 ? `0${number}` : number
}

// Formats date as YYYY-MM-DD HH:MM:SS
export function format(date) {
  const year = date.getFullYear()
  const month = padWithZero(date.getMonth() + 1)
  const day = padWithZero(date.getDate())

  const hour = padWithZero(date.getHours())
  const minutes = padWithZero(date.getMinutes())
  const seconds = padWithZero(date.getSeconds())

  return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`
}

// Formats date as DD.MM.YYYY
export function formatRussianDate(date) {
  const day = padWithZero(date.getDate())
  const month = padWithZero(date.getMonth() + 1)
  const year = date.getFullYear()

  return `${day}.${month}.${year}`
}

export function formatNewDate() {
  return format(new Date())
}
