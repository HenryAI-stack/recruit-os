// src/lib/github-storage.js
// Uses the GitHub Contents API to store encrypted JSON files in a private repo.
// This replaces a traditional database — no backend server needed.

import { encrypt, decrypt } from './crypto.js'

const OWNER = import.meta.env.VITE_GITHUB_OWNER   // your GitHub username
const REPO  = import.meta.env.VITE_GITHUB_REPO    // private repo name, e.g. "recruit-os-data"
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN   // Personal Access Token (repo scope)

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data`
const HEADERS = {
  Authorization: `token ${TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github.v3+json',
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getFile(filename) {
  const res = await fetch(`${BASE}/${filename}`, { headers: HEADERS })
  if (res.status === 404) return { content: null, sha: null }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const json = await res.json()
  // GitHub returns base64-encoded file content
  const raw = atob(json.content.replace(/\n/g, ''))
  return { content: raw, sha: json.sha }
}

async function putFile(filename, encryptedContent, sha) {
  const body = {
    message: `update ${filename}`,
    content: btoa(encryptedContent),
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(`${BASE}/${filename}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GitHub write error: ${res.status}`)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load a collection (e.g. 'jobs', 'candidates', 'interviews').
 * Returns the decrypted array, or [] if the file doesn't exist yet.
 */
export async function loadCollection(name) {
  try {
    const { content } = await getFile(`${name}.enc`)
    if (!content) return []
    return await decrypt(content)
  } catch {
    return []
  }
}

/**
 * Save an entire collection back to GitHub as an encrypted file.
 */
export async function saveCollection(name, data) {
  const { sha } = await getFile(`${name}.enc`)
  const encrypted = await encrypt(data)
  await putFile(`${name}.enc`, encrypted, sha)
}

/**
 * Helper: add one item to a collection and persist.
 */
export async function addItem(name, item) {
  const list = await loadCollection(name)
  list.push({ ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
  await saveCollection(name, list)
  return list
}

/**
 * Helper: update one item in a collection and persist.
 */
export async function updateItem(name, id, patch) {
  const list = await loadCollection(name)
  const idx = list.findIndex(x => x.id === id)
  if (idx === -1) throw new Error(`Item ${id} not found in ${name}`)
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  await saveCollection(name, list)
  return list
}

/**
 * Helper: delete one item from a collection and persist.
 */
export async function deleteItem(name, id) {
  const list = await loadCollection(name)
  const filtered = list.filter(x => x.id !== id)
  await saveCollection(name, filtered)
  return filtered
}
