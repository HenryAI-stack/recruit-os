// src/components/PhotoUpload.jsx
// Converts image to Base64 in the browser and stores it encrypted with the candidate data.
// No external service needed — works entirely within GitHub storage.

import { useState, useRef } from 'react'

export default function PhotoUpload({ currentPhoto, onSave }) {
  const [preview, setPreview] = useState(currentPhoto || null)
  const [saving, setSaving]   = useState(false)
  const [hover, setHover]     = useState(false)
  const inputRef              = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate: images only, max 2 MB
    if (!file.type.startsWith('image/')) {
      alert('Bitte nur Bilddateien hochladen (JPG, PNG, WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Bild zu groß. Bitte maximal 2 MB verwenden.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      // Resize to max 300×300 to keep storage small
      const dataUrl = await resizeImage(ev.target.result, 300)
      setPreview(dataUrl)
      setSaving(true)
      await onSave(dataUrl)   // persist to GitHub (encrypted)
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  function handleRemove(e) {
    e.stopPropagation()
    setPreview(null)
    onSave(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Photo circle — click to upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        style={{
          width: 96, height: 96, borderRadius: '50%',
          border: '2px dashed ' + (hover ? '#378ADD' : '#e5e5e3'),
          background: preview ? 'transparent' : (hover ? '#E6F1FB' : '#f5f5f4'),
          cursor: 'pointer', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all .2s',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Bewerberfoto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Overlay on hover */}
            {hover && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 22,
              }}>📷</div>
            )}
          </>
        ) : (
          <span style={{ fontSize: 28, opacity: hover ? 1 : 0.4 }}>📷</span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {/* Status & remove button */}
      {saving && <span style={{ fontSize: 11, color: '#78716c' }}>Wird gespeichert…</span>}
      {preview && !saving && (
        <button onClick={handleRemove} style={{
          fontSize: 11, color: '#E24B4A', background: 'none',
          border: 'none', cursor: 'pointer', padding: 0,
        }}>
          Foto entfernen
        </button>
      )}
      {!preview && !saving && (
        <span style={{ fontSize: 11, color: '#aaa' }}>JPG / PNG / WebP · max. 2 MB</span>
      )}
    </div>
  )
}

// ── Resize helper (canvas) ────────────────────────────────────────────────────
function resizeImage(dataUrl, maxSize) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}
