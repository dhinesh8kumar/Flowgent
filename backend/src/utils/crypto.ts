import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export const decrypt = (text: string): string => {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString()
}