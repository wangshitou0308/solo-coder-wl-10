const encoder = new TextEncoder()

async function deriveKey(password: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(password, salt.buffer as ArrayBuffer)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${saltHex}$${hashHex}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2$')) {
    return password === stored
  }
  const parts = stored.split('$')
  if (parts.length !== 3) return false
  const saltArr = new Uint8Array(parts[1].match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const hash = await deriveKey(password, saltArr.buffer as ArrayBuffer)
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex === parts[2]
}
