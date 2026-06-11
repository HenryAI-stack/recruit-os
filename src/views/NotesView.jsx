// src/views/NotesView.jsx
import { useState, useRef, useEffect } from 'react'
import Icon     from '../components/Icon.jsx'
import { useT } from '../lib/i18n.jsx'

export default function NotesView({ notes, persistNotes }) {
  const { lang } = useT()
  const [text,    setText]    = useState(notes || '')
  const [saving,  setSaving]  = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const timerRef = useRef(null)
  const taRef    = useRef(null)

  // Sync if notes change externally (e.g. on initial load)
  useEffect(() => { setText(notes || '') }, [notes])

  function handleChange(e) {
    const val = e.target.value
    setText(val)
    // Debounced auto-save
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(val), 800)
  }

  async function save(val) {
    setSaving(true)
    await persistNotes(val)
    setSaving(false)
    setSavedAt(new Date())
  }

  // Handle Enter to continue bullet points like Google Keep
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      const ta = taRef.current
      const start = ta.selectionStart
      const value = ta.value
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.slice(lineStart, start)
      const bulletMatch = currentLine.match(/^(\s*)([-*•])\s+/)

      if (bulletMatch) {
        e.preventDefault()
        const [full, indent, bullet] = bulletMatch
        // If the line only contains the bullet (empty item), remove it instead
        if (currentLine.trim() === bullet) {
          const newValue = value.slice(0, lineStart) + value.slice(start)
          setText(newValue)
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart })
        } else {
          const insertion = `\n${indent}${bullet} `
          const newValue = value.slice(0, start) + insertion + value.slice(start)
          setText(newValue)
          const newPos = start + insertion.length
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newPos })
        }
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => save(taRef.current.value), 800)
      }
    }
  }

  function insertBulletPrefix() {
    const ta = taRef.current
    const start = ta.selectionStart
    const value = ta.value
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const newValue = value.slice(0, lineStart) + '• ' + value.slice(lineStart)
    setText(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + 2
    })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(newValue), 800)
  }

  function timeAgo() {
    if (!savedAt) return null
    const secs = Math.floor((Date.now() - savedAt.getTime()) / 1000)
    if (secs < 5)  return lang==='de' ? 'Gerade eben gespeichert' : 'Saved just now'
    if (secs < 60) return lang==='de' ? `Vor ${secs}s gespeichert` : `Saved ${secs}s ago`
    const mins = Math.floor(secs/60)
    return lang==='de' ? `Vor ${mins} Min. gespeichert` : `Saved ${mins}m ago`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang==='de' ? 'Notizen' : 'Notes'}</h1>
          <p className="page-sub">
            {lang==='de'
              ? 'Persönliche Notizen — werden automatisch gespeichert.'
              : 'Personal notes — saved automatically.'}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {saving && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#888' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#3B82F6', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
              {lang==='de' ? 'Speichern…' : 'Saving…'}
            </span>
          )}
          {!saving && savedAt && (
            <span style={{ fontSize:11, color:'#10B981' }}>✓ {timeAgo()}</span>
          )}
          <button className="btn btn-sm" onClick={insertBulletPrefix} title={lang==='de'?'Aufzählungspunkt einfügen':'Insert bullet'}>
            <Icon name="plus" size={13} />•
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={lang==='de'
            ? '• Notiz hinzufügen…\n• Mit Enter geht es bei Aufzählungen automatisch weiter\n• Beliebig viele Punkte möglich'
            : '• Add a note…\n• Press Enter to continue bullet points automatically\n• Add as many items as you like'}
          spellCheck={false}
          style={{
            width:'100%', minHeight:480, padding:'18px 20px',
            border:'none', outline:'none', resize:'vertical',
            fontSize:14, lineHeight:1.9, fontFamily:'inherit',
            color:'#1A1A1A', background:'transparent',
          }}
        />
      </div>
    </div>
  )
}
