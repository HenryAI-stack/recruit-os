// src/components/PhotoUpload.jsx
import { useState, useRef } from 'react'
import { useT } from '../lib/i18n.jsx'

export default function PhotoUpload({ currentPhoto, onSave }) {
  const { t }                   = useT()
  const tp                      = t.photo
  const [preview, setPreview]   = useState(currentPhoto || null)
  const [saving,  setSaving]    = useState(false)
  const [hover,   setHover]     = useState(false)
  const inputRef                = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert(tp.wrongType); return }
    if (file.size > 2 * 1024 * 1024)    { alert(tp.tooBig);    return }
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = await resizeImage(ev.target.result, 300)
      setPreview(dataUrl)
      setSaving(true)
      await onSave(dataUrl)
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  function handleRemove(e) { e.stopPropagation(); setPreview(null); onSave(null) }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        style={{
          width:88, height:88, borderRadius:'50%',
          border:'2px dashed ' + (hover ? '#1A1A1A' : '#DDDDD8'),
          background: preview ? 'transparent' : (hover ? '#F0F0EE' : '#F7F7F5'),
          cursor:'pointer', overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', transition:'all .2s',
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            {hover && (
              <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20 }}>📷</div>
            )}
          </>
        ) : (
          <span style={{ fontSize:24, opacity: hover ? 0.6 : 0.3 }}>📷</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleFile} />
      {saving   && <span style={{ fontSize:11, color:'#999' }}>{tp.saving}</span>}
      {preview && !saving && <button onClick={handleRemove} style={{ fontSize:11, color:'#EF4444', background:'none', border:'none', cursor:'pointer', padding:0 }}>{tp.remove}</button>}
      {!preview && !saving && <span style={{ fontSize:11, color:'#bbb' }}>{tp.hint}</span>}
    </div>
  )
}

function resizeImage(dataUrl, maxSize) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}
