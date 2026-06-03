// src/lib/crypto.js
// All encryption/decryption happens in the browser — data is NEVER stored unencrypted.

const SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'change-me-in-github-secrets'

async function getKey(salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Safe base64 encoding — processes in 8 KB chunks to avoid
// "Maximum call stack size exceeded" when spreading large Uint8Arrays.
function bytesToBase64(bytes) {
  const CHUNK = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export async function encrypt(data, salt = 'recruit-os-v1') {
  const key       = await getKey(salt)
  const iv        = crypto.getRandomValues(new Uint8Array(12))
  const encoded   = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext= await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const combined  = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return bytesToBase64(combined)          // ← chunk-safe, no stack overflow
}

export async function decrypt(base64, salt = 'recruit-os-v1') {
  const key       = await getKey(salt)
  const combined  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const iv        = combined.slice(0, 12)
  const ciphertext= combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return JSON.parse(new TextDecoder().decode(decrypted))
}
