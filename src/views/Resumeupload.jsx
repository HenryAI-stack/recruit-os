// src/components/ResumeUpload.jsx
import { useState, useRef } from 'react'
import { useT }             from '../lib/i18n.jsx'
import Icon                 from './Icon.jsx'
import { saveResume, loadResume, deleteResume, extractText } from '../lib/resume.js'
import { extractCandidateInfo } from '../lib/ai.js'

export default function ResumeUpload({ candidateId, hasResume, onResumeChange, onDataExtracted }) {
  const { lang }              = useT()
  const inputRef              = useRef()
  const [uploading,  setUploading]  = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState(null)
  const [status,     setStatus]     = useState(null)
  const de = lang === 'de'

  function showStatus(msg) { setStatus(msg); setTimeout(() => setStatus(null), 4000) }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf','docx'].includes(ext)) { setError(de ? 'Nur PDF oder DOCX erlaubt.' : 'Only PDF or DOCX allowed.'); return }
    if (file.size > 8 * 1024 * 1024) { setError(de ? 'Datei zu groß (max. 8 MB).' : 'File too large (max. 8 MB).'); return }
    setError(null); setUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      await saveResume(candidateId, buffer, file.name)
      onResumeChange(true, file.name)
      showStatus(de ? 'Lebenslauf gespeichert ✓' : 'Resume saved ✓')
    } catch(e) { setError(de ? 'Fehler beim Speichern.' : 'Error saving resume.'); console.error(e) }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleExtract() {
    setError(null); setExtracting(true)
    try {
      const resume = await loadResume(candidateId)
      if (!resume) throw new Error(de ? 'Lebenslauf nicht gefunden' : 'Resume not found')
      const blob = new Blob([resume.bytes])
      const file = new File([blob], resume.filename)
      const text = await extractText(file)
      if (!text || text.trim().length < 50) throw new Error(de ? 'Text konnte nicht extrahiert werden' : 'Could not extract text')
      const data = await extractCandidateInfo(text, lang)
      if (data) {
        onDataExtracted(data)
        showStatus(de ? '✓ Daten aus Lebenslauf extrahiert' : '✓ Data extracted from resume')
      } else {
        throw new Error(de ? 'KI konnte keine Daten extrahieren' : 'AI could not extract data')
      }
    } catch(e) { setError(`${de?'Fehler':'Error'}: ${e.message}`); console.error(e) }
    finally { setExtracting(false) }
  }

  async function handleDownload() {
    setError(null)
    try {
      const resume = await loadResume(candidateId)
      if (!resume) return
      const url = URL.createObjectURL(new Blob([resume.bytes]))
      const a = document.createElement('a')
      a.href = url; a.download = resume.filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { setError(de ? 'Fehler beim Laden.' : 'Error loading resume.') }
  }

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

  const btn = { display:'inline-flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #EBEBEA', background:'#fff', fontFamily:'inherit', transition:'all .15s', whiteSpace:'nowrap' }

  return (
    <div style={{ background:'#FAFAF9', border:'1px solid #EBEBEA', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Icon name="upload" size={14} color="#888" />
        <span style={{ fontSize:12, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.05em' }}>
          {de ? 'Lebenslauf / CV' : 'Resume / CV'}
        </span>
        {hasResume && (
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:'#ECFDF5', color:'#065F46', fontWeight:600 }}>
            ✓ {de ? 'Hochgeladen' : 'Uploaded'}
          </span>
        )}
      </div>

      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        <button style={btn} onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Icon name="upload" size={13} color="#555" />
          {uploading ? (de?'Speichern…':'Saving…') : hasResume ? (de?'Ersetzen':'Replace') : (de?'PDF / DOCX hochladen':'Upload PDF / DOCX')}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display:'none' }} onChange={handleFile} />

        {hasResume && (
          <button style={{ ...btn, background:extracting?'#F0EEFF':'#F0EEFF', borderColor:'#C4B5FD', color:'#5B21B6' }}
            onClick={handleExtract} disabled={extracting || uploading}>
            {extracting
              ? <><span style={{ width:7,height:7,borderRadius:'50%',background:'#7C3AED',display:'inline-block',animation:'pulse 1s ease-in-out infinite' }}/>{de?'KI extrahiert…':'AI extracting…'}</>
              : <><Icon name="star" size={13} color="#7C3AED"/>{de?'Daten extrahieren':'Extract Data'}</>}
          </button>
        )}

        {hasResume && (
          <button style={btn} onClick={handleDownload} disabled={extracting}>
            <Icon name="save" size={13} color="#555"/>{de?'Herunterladen':'Download'}
          </button>
        )}

        {hasResume && (
          <button style={{ ...btn, color:'#991B1B', borderColor:'#FECACA' }} onClick={handleDelete} disabled={deleting}>
            <Icon name="trash" size={13} color="#EF4444"/>{deleting?'…':(de?'Löschen':'Delete')}
          </button>
        )}
      </div>

      {status && <p style={{ marginTop:8, fontSize:11, color:'#10B981', fontWeight:500 }}>{status}</p>}
      {error  && <p style={{ marginTop:8, fontSize:11, color:'#EF4444' }}>{error}</p>}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
