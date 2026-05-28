// src/lib/resume.js
// Resume storage (encrypted in GitHub) + text extraction (PDF / DOCX).

import { encrypt, decrypt } from './crypto.js'

const OWNER   = import.meta.env.VITE_GITHUB_OWNER
const REPO    = import.meta.env.VITE_GITHUB_REPO
const TOKEN   = import.meta.env.VITE_GITHUB_TOKEN
const BASE    = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/resumes`
const HEADERS = {
  Authorization: `token ${TOKEN}`,
  'Content-Type': 'application/json',
  Accept: 'application/vnd.github.v3+json',
}

// ── GitHub helpers ────────────────────────────────────────────────────────────
async function ghGet(path) {
  const res = await fetch(`${BASE}/${path}`, { headers: HEADERS })
  if (res.status === 404) return { content: null, sha: null }
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const json = await res.json()
  return { content: atob(json.content.replace(/\n/g, '')), sha: json.sha }
}

async function ghPut(path, content, sha) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ message: `resume ${path}`, content: btoa(content), ...(sha ? { sha } : {}) }),
  })
  if (!res.ok) throw new Error(`GitHub write ${res.status}`)
}

async function ghDelete(path, sha) {
  await fetch(`${BASE}/${path}`, {
    method: 'DELETE',
    headers: HEADERS,
    body: JSON.stringify({ message: `delete resume ${path}`, sha }),
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Encrypt and save resume to GitHub. Returns nothing. */
export async function saveResume(candidateId, fileBuffer, filename) {
  const bytes   = new Uint8Array(fileBuffer)
  const b64     = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ''))
  const payload = await encrypt({ filename, data: b64 })
  const { sha } = await ghGet(`${candidateId}.enc`)
  await ghPut(`${candidateId}.enc`, payload, sha)
}

/** Load and decrypt resume. Returns { filename, data: Uint8Array } or null. */
export async function loadResume(candidateId) {
  const { content } = await ghGet(`${candidateId}.enc`)
  if (!content) return null
  const { filename, data } = await decrypt(content)
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  return { filename, bytes }
}

/** Delete resume from GitHub. */
export async function deleteResume(candidateId) {
  const { sha } = await ghGet(`${candidateId}.enc`)
  if (sha) await ghDelete(`${candidateId}.enc`, sha)
}

// ── Text extraction ───────────────────────────────────────────────────────────

/** Extract plain text from a File object (PDF or DOCX). */
export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'pdf')  return extractFromPDF(file)
  if (ext === 'docx') return extractFromDOCX(file)
  throw new Error('Unsupported file type. Please use PDF or DOCX.')
}

async function extractFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
  ).href

  const buffer = await file.arrayBuffer()
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages  = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return pages.join('\n')
}

async function extractFromDOCX(file) {
  const mammoth = await import('mammoth')
  const buffer  = await file.arrayBuffer()
  const result  = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}
