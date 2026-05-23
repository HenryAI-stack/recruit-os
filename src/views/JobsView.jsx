// src/views/JobsView.jsx
import { useState } from 'react'
import Badge from '../components/Badge.jsx'

const EMPTY_JOB = { title: '', dept: '', location: '', desc: '', links: [], isOpen: true }

export default function JobsView({ jobs, candidates, persistJobs, onArchive }) {
  const [selected, setSelected] = useState(null)   // job id for detail view
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_JOB)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl]     = useState('')
  const [saving, setSaving]       = useState(false)

  const job = jobs.find(j => j.id === selected)

  // ── Save new job ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const next = [...jobs, {
      ...form,
      id: crypto.randomUUID(),
      links: linkLabel && linkUrl ? [{ label: linkLabel, url: linkUrl }] : [],
      createdAt: new Date().toISOString().split('T')[0],
    }]
    await persistJobs(next)
    setForm(EMPTY_JOB); setLinkLabel(''); setLinkUrl('')
    setShowForm(false); setSaving(false)
  }

  // ── Toggle open/closed ──────────────────────────────────────────────────────
  async function toggleOpen(id) {
    const next = jobs.map(j => j.id === id ? { ...j, isOpen: !j.isOpen } : j)
    await persistJobs(next)
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected && job) {
    const jobCandidates = candidates.filter(c => c.jobId === job.id)
    return (
      <div>
        <button onClick={() => setSelected(null)} style={backBtn}>← Zurück</button>
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div>
              <h2 style={{ fontSize:18, fontWeight:600 }}>{job.title}</h2>
              <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>{job.dept} · {job.location}</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background: job.isOpen ? '#EAF3DE' : '#F1EFE8', color: job.isOpen ? '#173404' : '#555' }}>
                {job.isOpen ? 'Offen' : 'Geschlossen'}
              </span>
              <button onClick={() => toggleOpen(job.id)} style={btnSm}>
                {job.isOpen ? 'Schließen' : 'Öffnen'}
              </button>
              {!job.isOpen && onArchive && (
                <button onClick={() => { if (window.confirm(`„${job.title}" mit allen Bewerbern und Gesprächen archivieren?`)) { onArchive(job.id); setSelected(null) } }} style={{ ...btnSm, color:'#8B5500', borderColor:'#e8d5b0', background:'#FDF6E3' }}>
                  📦 Archivieren
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize:13, color:'#555', lineHeight:1.7, marginBottom:12 }}>{job.desc}</p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {job.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" style={linkChip}>↗ {l.label}</a>
            ))}
          </div>
        </div>

        <h3 style={{ fontSize:14, fontWeight:600, margin:'20px 0 12px' }}>Bewerber ({jobCandidates.length})</h3>
        {jobCandidates.length === 0
          ? <p style={{ color:'#aaa', fontSize:13 }}>Noch keine Bewerber für diese Stelle.</p>
          : <table style={tbl}>
              <thead><tr>{['Name','Status','E-Mail','Seit'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {jobCandidates.map(c => (
                  <tr key={c.id}>
                    <td style={td}>{c.firstName} {c.lastName}</td>
                    <td style={td}><Badge status={c.status} /></td>
                    <td style={td}>{c.email}</td>
                    <td style={td}>{c.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Stellenangebote</h1>
          <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>{jobs.filter(j=>j.isOpen).length} offen · {jobs.length} gesamt</p>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Neue Stelle</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={card}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Neue Stelle anlegen</h3>
          <div style={grid2}>
            <Field label="Berufsbezeichnung" value={form.title}    onChange={v => setForm({...form, title: v})}    placeholder="z.B. Senior Developer" />
            <Field label="Abteilung"         value={form.dept}     onChange={v => setForm({...form, dept: v})}     placeholder="z.B. Engineering" />
          </div>
          <Field label="Standort" value={form.location} onChange={v => setForm({...form, location: v})} placeholder="z.B. Wien / Remote" />
          <Field label="Beschreibung" value={form.desc} onChange={v => setForm({...form, desc: v})} placeholder="Stellenbeschreibung..." multiline />
          <div style={grid2}>
            <Field label="Link-Bezeichnung" value={linkLabel} onChange={setLinkLabel} placeholder="z.B. LinkedIn" />
            <Field label="URL"              value={linkUrl}   onChange={setLinkUrl}   placeholder="https://..." />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button onClick={() => setShowForm(false)} style={btnSm}>Abbrechen</button>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? 'Speichern…' : 'Stelle anlegen'}</button>
          </div>
        </div>
      )}

      {/* Job cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {jobs.map(j => {
          const cnt = candidates.filter(c => c.jobId === j.id).length
          return (
            <div key={j.id} onClick={() => setSelected(j.id)} style={{ ...card, cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:600 }}>{j.title}</p>
                  <p style={{ fontSize:12, color:'#78716c', marginTop:2 }}>{j.dept} · {j.location}</p>
                </div>
                <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background: j.isOpen ? '#EAF3DE' : '#F1EFE8', color: j.isOpen ? '#173404' : '#555', whiteSpace:'nowrap' }}>
                  {j.isOpen ? 'Offen' : 'Geschlossen'}
                </span>
              </div>
              <p style={{ fontSize:12, color:'#78716c', lineHeight:1.6, marginBottom:12 }}>
                {j.desc?.substring(0, 100)}…
              </p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {j.links?.map((l, i) => (
                  <span key={i} onClick={e => e.stopPropagation()}>
                    <a href={l.url} target="_blank" rel="noreferrer" style={linkChip}>↗ {l.label}</a>
                  </span>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'#aaa', background:'#f5f5f4', padding:'2px 8px', borderRadius:100 }}>👥 {cnt} Bewerber</span>
                <span style={{ fontSize:11, color:'#aaa' }}>seit {j.createdAt}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const card      = { background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e5e5e3', marginBottom:14 }
const btnPrimary= { background:'#378ADD', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer', fontWeight:500 }
const btnSm     = { background:'#fff', color:'#333', border:'1px solid #e5e5e3', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }
const backBtn   = { background:'none', border:'none', color:'#78716c', cursor:'pointer', fontSize:13, marginBottom:18, padding:0 }
const linkChip  = { fontSize:11, color:'#185FA5', background:'#E6F1FB', padding:'2px 8px', borderRadius:6, textDecoration:'none' }
const tbl       = { width:'100%', borderCollapse:'collapse', fontSize:13 }
const th        = { textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:500, color:'#78716c', borderBottom:'1px solid #e5e5e3', textTransform:'uppercase', letterSpacing:'.04em' }
const td        = { padding:'10px 12px', borderBottom:'1px solid #e5e5e3', color:'#1c1917' }
const grid2     = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }

function Field({ label, value, onChange, placeholder, multiline }) {
  const style = { width:'100%', padding:'7px 10px', border:'1px solid #e5e5e3', borderRadius:8, fontSize:13, marginBottom:12, fontFamily:'inherit', resize: multiline ? 'vertical' : undefined, minHeight: multiline ? 80 : undefined }
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:500, color:'#78716c', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</label>
      {multiline
        ? <textarea style={style} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input    style={style} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}
