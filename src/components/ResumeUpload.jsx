// src/components/ResumeUpload.jsx
import { useState, useRef } from 'react'
import { useT }             from '../lib/i18n.jsx'
import Icon                 from './Icon.jsx'
import { saveResume, loadResume, deleteResume, extractText } from '../lib/resume.js'
import { extractResumeInfo } from '../lib/ai.js'

export default function ResumeUpload({ candidateId, hasResume, onResumeChange, onNotesExtracted }) {
  const { lang }              = useT()
  const inputRef              = useRef()
  const [uploading,  setUploading]  = useState(false)
  const [extracting, setExtracting] = useState(false) // download + AI
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState(null)
  const [status,     setStatus]     = useState(null)  // brief success message

  const de = lang === 'de'

  function showStatus(msg) { setStatus(msg); setTimeout(() => setStatus(null), 3000) }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf','docx'].includes(ext)) {
      setError(de ? 'Nur PDF oder DOCX erlaubt.' : 'Only PDF or DOCX allowed.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(de ? 'Datei zu groß (max. 8 MB).' : 'File too large (max. 8 MB).')
      return
    }
    setError(null); setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      await saveResume(candidateId, buffer, file.name)
      onResumeChange(true, file.name)
      showStatus(de ? 'Lebenslauf gespeichert ✓' : 'Resume saved ✓')
    } catch(e) {
      setError(de ? 'Fehler beim Speichern.' : 'Error saving resume.')
      console.error(e)
    } finally { setUploading(false); e.target.value = '' }
  }

  // ── Extract + AI ──────────────────────────────────────────────────────────
  async function handleExtract() {
    setError(null); setExtracting(true)
    try {
      // 1. Load & decrypt from GitHub
      const resume = await loadResume(candidateId)
      if (!resume) throw new Error('Resume not found')

      // 2. Rebuild File object for text extraction
      const blob = new Blob([resume.bytes])
      const file = new File([blob], resume.filename)

      // 3. Extract text
      const text = await extractText(file)
      if (!text || text.trim().length < 50) throw new Error('Could not extract text')

      // 4. AI summary → notes
      const summary = await extractResumeInfo(text, lang)
      if (summary) {
        onNotesExtracted(summary)
        showStatus(de ? 'Notizen aus Lebenslauf extrahiert ✓' : 'Notes extracted from resume ✓')
      }
    } catch(e) {
      setError(de ? `Fehler: ${e.message}` : `Error: ${e.message}`)
      console.error(e)
    } finally { setExtracting(false) }
  }

  // ── Download (decrypt + trigger browser download) ─────────────────────────
  async function handleDownload() {
    setError(null)
    try {
      const resume = await loadResume(candidateId)
      if (!resume) return
      const url  = URL.createObjectURL(new Blob([resume.bytes]))
      const link = document.createElement('a')
      link.href  = url; link.download = resume.filename
      link.click(); URL.revokeObjectURL(url)
    } catch(e) { setError(de ? 'Fehler beim Laden.' : 'Error loading resume.') }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!window.confirm(de ? 'Lebenslauf löschen?' : 'Delete resume?')) return
    setDeleting(true)
    try {
      await deleteResume(candidateId)
      onResumeChange(false, null)
      showStatus(de ? 'Lebenslauf gelöscht.' : 'Resume deleted.')
    } catch(e) { setError(de ? 'Fehler beim Löschen.' : 'Error deleting.') }
    finally { setDeleting(false) }
  }

  const btnBase = { display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #EBEBEA', background:'#fff', fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap' }

  return (
    <div style={{ background:'#FAFAF9', border:'1px solid #EBEBEA', borderRadius:10, padding:'14px 16px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Icon name="upload" size={14} color="#888" />
        <span style={{ fontSize:12, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.05em' }}>
          {de ? 'Lebenslauf' : 'Resume'}
        </span>
        {hasResume && (
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:'#ECFDF5', color:'#065F46', fontWeight:600 }}>
            ✓ {de ? 'Hochgeladen' : 'Uploaded'}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        {/* Upload / Replace */}
        <button style={btnBase} onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name="upload" size={13} color="#555" />
          {uploading
            ? (de ? 'Wird gespeichert…' : 'Saving…')
            : hasResume
              ? (de ? 'Ersetzen' : 'Replace')
              : (de ? 'PDF / DOCX hochladen' : 'Upload PDF / DOCX')}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display:'none' }} onChange={handleFile} />

        {/* Extract to notes */}
        {hasResume && (
          <button style={{ ...btnBase, background: extracting?'#F0EEFF':'#F0EEFF', borderColor:'#C4B5FD', color:'#5B21B6' }}
            onClick={handleExtract} disabled={extracting || uploading}>
            {extracting
              ? <><span style={{ width:8,height:8,borderRadius:'50%',background:'#7C3AED',display:'inline-block',animation:'pulse 1s ease-in-out infinite' }} />{de?'KI extrahiert…':'AI extracting…'}</>
              : <><Icon name="star" size={13} color="#7C3AED" />{de?'In Notizen extrahieren':'Extract to Notes'}</>
            }
          </button>
        )}

        {/* Download */}
        {hasResume && (
          <button style={btnBase} onClick={handleDownload} disabled={extracting}>
            <Icon name="save" size={13} color="#555" />{de ? 'Herunterladen' : 'Download'}
          </button>
        )}

        {/* Delete */}
        {hasResume && (
          <button style={{ ...btnBase, color:'#991B1B', borderColor:'#FECACA' }}
            onClick={handleDelete} disabled={deleting}>
            <Icon name="trash" size={13} color="#EF4444" />{deleting ? '…' : (de?'Löschen':'Delete')}
          </button>
        )}
      </div>

      {/* Status / Error */}
      {status && <p style={{ marginTop:8, fontSize:11, color:'#10B981', fontWeight:500 }}>{status}</p>}
      {error  && <p style={{ marginTop:8, fontSize:11, color:'#EF4444' }}>{error}</p>}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
