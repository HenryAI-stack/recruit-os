// src/views/JobsView.jsx
import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import Icon  from '../components/Icon.jsx'

const EMPTY = { title:'', dept:'', location:'', desc:'', links:[], isOpen:true }

export default function JobsView({ jobs, candidates, persistJobs, onArchive }) {
  const [selected,  setSelected]  = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [editMode,  setEditMode]  = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl,   setLinkUrl]   = useState('')
  const [saving,    setSaving]    = useState(false)

  const job = jobs.find(j => j.id === selected)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function F(key, v) { setForm(f => ({ ...f, [key]: v })) }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const links = linkLabel && linkUrl ? [{ label:linkLabel, url:linkUrl }] : []
    const next = selected && editMode
      ? jobs.map(j => j.id === selected ? { ...j, ...form, links: links.length ? links : j.links } : j)
      : [...jobs, { ...form, id:crypto.randomUUID(), links, createdAt:new Date().toISOString().split('T')[0] }]
    await persistJobs(next)
    setShowForm(false); setEditMode(false)
    setForm(EMPTY); setLinkLabel(''); setLinkUrl('')
    setSaving(false)
  }

  async function toggleOpen(id) {
    await persistJobs(jobs.map(j => j.id === id ? { ...j, isOpen: !j.isOpen } : j))
  }

  function startEdit() {
    setForm({ title:job.title, dept:job.dept, location:job.location, desc:job.desc, links:job.links, isOpen:job.isOpen })
    if (job.links?.[0]) { setLinkLabel(job.links[0].label); setLinkUrl(job.links[0].url) }
    setEditMode(true); setShowForm(true)
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selected && job) {
    const jobCands = candidates.filter(c => c.jobId === job.id)
    return (
      <div>
        <button className="btn btn-sm" onClick={() => { setSelected(null); setShowForm(false); setEditMode(false) }} style={{ marginBottom:20 }}>
          <Icon name="arrowLeft" size={14} /> Zurück
        </button>

        {/* Edit form */}
        {showForm && editMode && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ marginBottom:16 }}>Stelle bearbeiten</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="field"><label>Berufsbezeichnung</label><input value={form.title}    onChange={e=>F('title',e.target.value)}    placeholder="z.B. Senior Developer" /></div>
              <div className="field"><label>Abteilung</label>        <input value={form.dept}     onChange={e=>F('dept',e.target.value)}     placeholder="z.B. Engineering" /></div>
            </div>
            <div className="field"><label>Standort</label><input value={form.location} onChange={e=>F('location',e.target.value)} placeholder="z.B. Wien / Remote" /></div>
            <div className="field"><label>Beschreibung</label><textarea value={form.desc} onChange={e=>F('desc',e.target.value)} /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="field"><label>Link-Bezeichnung</label><input value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} placeholder="z.B. LinkedIn" /></div>
              <div className="field"><label>URL</label>              <input value={linkUrl}   onChange={e=>setLinkUrl(e.target.value)}   placeholder="https://..." /></div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-sm" onClick={() => { setShowForm(false); setEditMode(false) }}>Abbrechen</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Icon name="save" size={13} color="#fff" />{saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Job header */}
        {!editMode && (
          <div className="card" style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                  <h2>{job.title}</h2>
                  <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, fontWeight:600,
                    background: job.isOpen ? '#ECFDF5' : '#F7F7F5',
                    color:      job.isOpen ? '#065F46' : '#888' }}>
                    {job.isOpen ? 'Offen' : 'Geschlossen'}
                  </span>
                </div>
                <div style={{ display:'flex', gap:14, fontSize:12, color:'#888' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon name="building" size={12} color="#bbb" />{job.dept}</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon name="target" size={12} color="#bbb" />{job.location}</span>
                  <span style={{ color:'#ccc' }}>seit {job.createdAt}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                <button className="btn btn-sm" onClick={startEdit}><Icon name="edit" size={13} />Bearbeiten</button>
                <button className="btn btn-sm" onClick={() => toggleOpen(job.id)}>
                  {job.isOpen ? 'Schließen' : 'Wieder öffnen'}
                </button>
                {!job.isOpen && onArchive && (
                  <button className="btn btn-sm btn-danger" onClick={() => {
                    if (window.confirm(`„${job.title}" mit allen Bewerbern archivieren?`)) { onArchive(job.id); setSelected(null) }
                  }}>
                    <Icon name="archive" size={13} />Archivieren
                  </button>
                )}
              </div>
            </div>
            {job.desc && <p style={{ fontSize:13, color:'#555', marginTop:14, lineHeight:1.75 }}>{job.desc}</p>}
            {job.links?.length > 0 && (
              <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
                {job.links.map((l,i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'#1A56DB', background:'#EBF4FF', padding:'3px 9px', borderRadius:6, textDecoration:'none' }}>
                    <Icon name="externalLink" size={11} color="#1A56DB" />{l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Candidates table */}
        <div className="section-header">
          <span className="section-title">Bewerber ({jobCands.length})</span>
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table">
            <thead><tr><th>Name</th><th>Status</th><th>E-Mail</th><th>Beworben am</th></tr></thead>
            <tbody>
              {jobCands.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight:500 }}>{c.firstName} {c.lastName}</td>
                  <td><Badge status={c.status} /></td>
                  <td style={{ color:'#888' }}>{c.email}</td>
                  <td style={{ color:'#888' }}>{c.appliedAt || '–'}</td>
                </tr>
              ))}
              {jobCands.length === 0 && <tr><td colSpan={4} style={{ textAlign:'center', color:'#bbb', padding:24 }}>Noch keine Bewerber</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stellenangebote</h1>
          <p className="page-sub">{jobs.filter(j=>j.isOpen).length} offen · {jobs.length} gesamt</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditMode(false); setShowForm(true) }}>
          <Icon name="plus" size={14} color="#fff" />Neue Stelle
        </button>
      </div>

      {/* Add form */}
      {showForm && !editMode && (
        <div className="card" style={{ marginBottom:18 }}>
          <h3 style={{ marginBottom:16 }}>Neue Stelle anlegen</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="field"><label>Berufsbezeichnung</label><input value={form.title}    onChange={e=>F('title',e.target.value)}    placeholder="z.B. Senior Developer" /></div>
            <div className="field"><label>Abteilung</label>        <input value={form.dept}     onChange={e=>F('dept',e.target.value)}     placeholder="z.B. Engineering" /></div>
          </div>
          <div className="field"><label>Standort</label><input value={form.location} onChange={e=>F('location',e.target.value)} placeholder="z.B. Wien / Remote" /></div>
          <div className="field"><label>Beschreibung</label><textarea value={form.desc} onChange={e=>F('desc',e.target.value)} placeholder="Stellenbeschreibung..." /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="field"><label>Link-Bezeichnung</label><input value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} placeholder="z.B. LinkedIn" /></div>
            <div className="field"><label>URL</label>              <input value={linkUrl}   onChange={e=>setLinkUrl(e.target.value)}   placeholder="https://..." /></div>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-sm" onClick={() => setShowForm(false)}>Abbrechen</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Icon name="save" size={13} color="#fff" />{saving ? 'Speichern…' : 'Stelle anlegen'}
            </button>
          </div>
        </div>
      )}

      {/* Job cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {jobs.map(j => {
          const cnt = candidates.filter(c => c.jobId === j.id).length
          return (
            <div key={j.id} className="card" style={{ cursor:'pointer' }}
              onClick={() => setSelected(j.id)}
              onMouseOver={e => e.currentTarget.style.borderColor='#C8C8C3'}
              onMouseOut={e  => e.currentTarget.style.borderColor='#EBEBEA'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0, paddingRight:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{j.title}</div>
                  <div style={{ fontSize:12, color:'#aaa' }}>{j.dept} · {j.location}</div>
                </div>
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, fontWeight:600, flexShrink:0,
                  background: j.isOpen ? '#ECFDF5' : '#F7F7F5',
                  color:      j.isOpen ? '#065F46' : '#888' }}>
                  {j.isOpen ? 'Offen' : 'Geschlossen'}
                </span>
              </div>
              <p style={{ fontSize:12, color:'#888', lineHeight:1.65, marginBottom:12 }}>
                {j.desc?.substring(0,100)}{j.desc?.length > 100 ? '…' : ''}
              </p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {j.links?.map((l,i) => (
                  <span key={i} onClick={e => { e.stopPropagation(); window.open(l.url,'_blank') }}
                    style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:500, color:'#1A56DB', background:'#EBF4FF', padding:'2px 8px', borderRadius:6, cursor:'pointer' }}>
                    <Icon name="externalLink" size={10} color="#1A56DB" />{l.label}
                  </span>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'#aaa', background:'#F7F7F5', padding:'3px 8px', borderRadius:6 }}>
                  <Icon name="users" size={11} color="#bbb" />{cnt} Bewerber
                </span>
                <span style={{ fontSize:11, color:'#ccc' }}>seit {j.createdAt}</span>
              </div>
            </div>
          )
        })}
        {jobs.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'#ccc' }}>
            <Icon name="briefcase" size={36} color="#ddd" style={{ marginBottom:12, display:'block', margin:'0 auto 12px' }} />
            <p style={{ fontSize:14, fontWeight:500, color:'#bbb' }}>Noch keine Stellen angelegt</p>
          </div>
        )}
      </div>
    </div>
  )
}
