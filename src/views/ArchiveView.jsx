// src/views/ArchiveView.jsx
import { useState } from 'react'
import Badge from '../components/Badge.jsx'

const AVATAR_COLORS = [
  ['#B5D4F4','#0C447C'], ['#C0DD97','#173404'],
  ['#FAC775','#412402'], ['#CECBF6','#26215C'], ['#F4C0D1','#4B1528'],
]
function Avatar({ name, photo, size = 30 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2)
  const [bg, color] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:600, flexShrink:0 }}>{initials}</div>
}

export default function ArchiveView({ archives, onRestore, persistArchives }) {
  const [selected, setSelected]   = useState(null)   // archive entry id
  const [search,   setSearch]     = useState('')
  const [restoring, setRestoring] = useState(false)

  const entry = archives.find(a => a.id === selected)

  const filtered = archives.filter(a =>
    a.job.title.toLowerCase().includes(search.toLowerCase()) ||
    a.job.dept.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRestore(archiveId) {
    if (!window.confirm('Stelle und alle Bewerber wieder aktivieren?')) return
    setRestoring(true)
    await onRestore(archiveId)
    setSelected(null)
    setRestoring(false)
  }

  // ── Detail: one archived job ────────────────────────────────────────────────
  if (selected && entry) {
    const { job, candidates, interviews } = entry
    return (
      <div>
        <button onClick={() => setSelected(null)} style={backBtn}>← Zurück zum Archiv</button>

        {/* Job header */}
        <div style={card}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                <h2 style={{ fontSize:18, fontWeight:600 }}>{job.title}</h2>
                <span style={archiveBadge}>📦 Archiviert</span>
              </div>
              <p style={{ fontSize:13, color:'#78716c' }}>{job.dept} · {job.location}</p>
              <p style={{ fontSize:12, color:'#aaa', marginTop:3 }}>
                Archiviert am {entry.archivedAt} · {candidates.length} Bewerber · {interviews.length} Gespräche
              </p>
            </div>
            <button onClick={() => handleRestore(entry.id)} disabled={restoring} style={btnOutline}>
              {restoring ? 'Wird wiederhergestellt…' : '↩ Wiederherstellen'}
            </button>
          </div>
          {job.desc && <p style={{ fontSize:13, color:'#555', marginTop:12, lineHeight:1.7 }}>{job.desc}</p>}
          {job.links?.length > 0 && (
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              {job.links.map((l,i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" style={linkChip}>↗ {l.label}</a>
              ))}
            </div>
          )}
        </div>

        {/* Candidates */}
        <h3 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Bewerber ({candidates.length})</h3>
        {candidates.length === 0
          ? <p style={{ color:'#aaa', fontSize:13 }}>Keine Bewerber in diesem Archiv.</p>
          : candidates.map((c, i) => {
              const civs = interviews.filter(iv => iv.candidateId === c.id)
              return (
                <div key={c.id} style={{ ...card, marginBottom:12 }}>
                  {/* Candidate header */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: civs.length ? 14 : 0 }}>
                    <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={40} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:600 }}>{c.firstName} {c.lastName}</span>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#78716c', marginTop:3 }}>
                        <span>✉ {c.email}</span>
                        {c.phone && <span>📞 {c.phone}</span>}
                        {c.appliedAt && <span>📅 Beworben am {c.appliedAt}</span>}
                      </div>
                      {c.notes && <p style={{ fontSize:12, color:'#555', marginTop:6, padding:'6px 9px', background:'#f5f5f4', borderRadius:7, lineHeight:1.5 }}>{c.notes}</p>}
                    </div>
                  </div>

                  {/* Interviews for this candidate */}
                  {civs.length > 0 && (
                    <div style={{ borderTop:'1px solid #f0f0ee', paddingTop:12 }}>
                      <p style={{ fontSize:11, fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>
                        Gespräche ({civs.length})
                      </p>
                      {civs.map(iv => (
                        <div key={iv.id} style={{ display:'flex', gap:10, marginBottom:10 }}>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:iv.done?'#EAF3DE':'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 }}>
                            {iv.done ? '✓' : '⏱'}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ fontSize:12, fontWeight:600 }}>{iv.type}</span>
                              <span style={{ fontSize:11, color:'#aaa' }}>{iv.scheduledAt?.replace('T',' ').slice(0,16)}</span>
                            </div>
                            <p style={{ fontSize:11, color:'#78716c', marginTop:1 }}>👤 {iv.interviewer}</p>
                            {iv.feedback && <p style={{ fontSize:11, color:'#555', marginTop:5, padding:'6px 8px', background:'#f5f5f4', borderRadius:6, lineHeight:1.5 }}>{iv.feedback}</p>}
                            {iv.rating > 0 && <p style={{ color:'#BA7517', fontSize:11, marginTop:3 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
        }
      </div>
    )
  }

  // ── List: all archived jobs ─────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Archiv</h1>
          <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>{archives.length} archivierte Ausschreibungen</p>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Stelle oder Abteilung suchen…"
        style={{ width:'100%', padding:'8px 12px', border:'1px solid #e5e5e3', borderRadius:8, fontSize:13, marginBottom:18, background:'#fff' }}
      />

      {/* Empty state */}
      {archives.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#aaa' }}>
          <p style={{ fontSize:36, marginBottom:12 }}>📦</p>
          <p style={{ fontSize:14, fontWeight:500 }}>Noch keine archivierten Ausschreibungen</p>
          <p style={{ fontSize:13, marginTop:6 }}>Abgeschlossene Stellen können in den Stellenangeboten archiviert werden.</p>
        </div>
      )}

      {/* Archive cards */}
      {filtered.map(a => (
        <div key={a.id} onClick={() => setSelected(a.id)} style={{ ...card, cursor:'pointer' }}
          onMouseOver={e => e.currentTarget.style.background='#fafaf9'}
          onMouseOut={e =>  e.currentTarget.style.background='#fff'}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>{a.job.title}</span>
                <span style={archiveBadge}>📦 Archiviert</span>
              </div>
              <p style={{ fontSize:12, color:'#78716c' }}>{a.job.dept} · {a.job.location}</p>
              <p style={{ fontSize:11, color:'#aaa', marginTop:4 }}>Archiviert am {a.archivedAt}</p>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0 }}>
              <Pill icon="👥" count={a.candidates.length} label="Bewerber" />
              <Pill icon="🗓" count={a.interviews.length} label="Gespräche" />
            </div>
          </div>

          {/* Status distribution bar */}
          {a.candidates.length > 0 && <StatusBar candidates={a.candidates} />}
        </div>
      ))}

      {filtered.length === 0 && archives.length > 0 && (
        <p style={{ textAlign:'center', padding:24, color:'#aaa', fontSize:13 }}>Keine Treffer für „{search}"</p>
      )}
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Pill({ icon, count, label }) {
  return (
    <div style={{ textAlign:'center', background:'#f5f5f4', borderRadius:8, padding:'6px 12px', minWidth:64 }}>
      <p style={{ fontSize:16 }}>{icon}</p>
      <p style={{ fontSize:14, fontWeight:600 }}>{count}</p>
      <p style={{ fontSize:10, color:'#aaa' }}>{label}</p>
    </div>
  )
}

function StatusBar({ candidates }) {
  const COLORS = {
    'Ausgewählt': '#639922', 'Abgelehnt': '#E24B4A',
    'Technisches Gespräch': '#7F77DD', 'Erstgespräch': '#BA7517', 'Eingegangen': '#378ADD',
  }
  const total = candidates.length
  const counts = candidates.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})
  return (
    <div style={{ marginTop:12 }}>
      <div style={{ display:'flex', height:6, borderRadius:3, overflow:'hidden', gap:1 }}>
        {Object.entries(counts).map(([st, n]) => (
          <div key={st} style={{ flex: n/total, background: COLORS[st] || '#ccc', borderRadius:3 }} title={`${st}: ${n}`} />
        ))}
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
        {Object.entries(counts).map(([st, n]) => (
          <span key={st} style={{ fontSize:10, color:'#78716c' }}>
            <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:COLORS[st]||'#ccc', marginRight:3 }} />
            {st}: {n}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const card        = { background:'#fff', borderRadius:12, padding:'16px 18px', border:'1px solid #e5e5e3', marginBottom:12, transition:'background .15s' }
const backBtn     = { background:'none', border:'none', color:'#78716c', cursor:'pointer', fontSize:13, marginBottom:18, padding:0 }
const archiveBadge= { fontSize:11, padding:'2px 9px', borderRadius:100, background:'#F1EFE8', color:'#555', fontWeight:500 }
const btnOutline  = { background:'#fff', color:'#333', border:'1px solid #e5e5e3', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer' }
const linkChip    = { fontSize:11, color:'#185FA5', background:'#E6F1FB', padding:'2px 8px', borderRadius:6, textDecoration:'none' }
