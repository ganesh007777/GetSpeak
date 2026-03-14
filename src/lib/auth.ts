import { randomBytes, scryptSync, timingSafeEqual } from "crypto"

const KEY_LENGTH = 64

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":")
  if (!salt || !hash) return false
  const hashedBuffer = scryptSync(password, salt, KEY_LENGTH)
  const storedBuffer = Buffer.from(hash, "hex")
  if (storedBuffer.length !== hashedBuffer.length) return false
  return timingSafeEqual(storedBuffer, hashedBuffer)
}

export function createSessionToken() {
  return randomBytes(32).toString("hex")
}
