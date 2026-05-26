// src/components/DateField.jsx
// Three separate inputs (Day / Month / Year) to avoid browser date-picker year entry issues.
import { useState, useEffect } from 'react'
import { useT } from '../lib/i18n.jsx'

export default function DateField({ label, value, onChange }) {
  const { lang } = useT()

  // Parse existing value (stored as YYYY-MM-DD)
  function parse(v) {
    if (!v) return { d:'', m:'', y:'' }
    const [y,m,d] = v.split('-')
    return { d: d||'', m: m||'', y: y||'' }
  }

  const [parts, setParts] = useState(() => parse(value))

  // Sync outward whenever any part changes
  useEffect(() => {
    const { d, m, y } = parts
    if (d && m && y && y.length === 4) {
      onChange(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
    } else {
      onChange('')
    }
  }, [parts])

  // Re-parse if value is reset externally (e.g. form clear)
  useEffect(() => {
    setParts(parse(value))
  }, [value])

  function set(key, raw) {
    let v = raw.replace(/\D/g,'')
    if (key === 'd') v = v.slice(0,2)
    if (key === 'm') v = v.slice(0,2)
    if (key === 'y') v = v.slice(0,4)
    setParts(p => ({ ...p, [key]: v }))
  }

  const inp = {
    border:'1px solid #DDDDD8', borderRadius:8, fontSize:13,
    background:'#fff', color:'#1A1A1A', textAlign:'center',
    padding:'8px 6px', fontFamily:'inherit',
  }

  const isDE = lang === 'de'
  // Order: DE → DD MM YYYY, EN → MM DD YYYY
  const fields = isDE
    ? [
        { key:'d', placeholder:'TT',   w:52 },
        { key:'m', placeholder:'MM',   w:52 },
        { key:'y', placeholder:'JJJJ', w:72 },
      ]
    : [
        { key:'m', placeholder:'MM',  w:52 },
        { key:'d', placeholder:'DD',  w:52 },
        { key:'y', placeholder:'YYYY',w:72 },
      ]

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        {fields.map((f,i) => (
          <span key={f.key} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input
              value={parts[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              inputMode="numeric"
              style={{ ...inp, width:f.w }}
            />
            {i < fields.length - 1 && <span style={{ color:'#bbb', fontSize:14 }}>/</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
