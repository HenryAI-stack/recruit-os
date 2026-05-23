// src/views/ArchiveView.jsx
import { useState } from 'react'
import Badge    from '../components/Badge.jsx'
import Icon     from '../components/Icon.jsx'
import { useT } from '../lib/i18n.jsx'

const AV_COLORS = [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]
const DOT_COLORS = { 'Ausgewählt':'#10B981','Abgelehnt':'#EF4444','Technisches Gespräch':'#7C3AED','Erstgespräch':'#F59E0B','Eingegangen':'#3B82F6' }

function Avatar({ name, photo, size=30 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
  const ini = name.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const [bg,color] = AV_COLORS[name.charCodeAt(0)%AV_COLORS.length]
  return <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,fontWeight:700,flexShrink:0 }}>{ini}</div>
}

export default function ArchiveView({ archives, onRestore }) {
  const { t, STATUS_DISPLAY } = useT()
  const ta = t.archive; const tc = t.common; const ti = t.interviews

  const [selected,   setSelected]   = useState(null)
  const [search,     setSearch]     = useState('')
  const [restoring,  setRestoring]  = useState(false)

  const entry    = archives.find(a=>a.id===selected)
  const filtered = archives.filter(a =>
    a.job.title.toLowerCase().includes(search.toLowerCase()) ||
    a.job.dept.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRestore(id) {
    if (!window.confirm(ta.confirmRestore)) return
    setRestoring(true)
    await onRestore(id)
    setSelected(null)
    setRestoring(false)
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected && entry) {
    const { job, candidates, interviews } = entry
    return (
      <div>
        <button className="btn btn-sm" onClick={() => setSelected(null)} style={{ marginBottom:20 }}>
          <Icon name="arrowLeft" size={14} />{tc.back}
        </button>

        <div className="card" style={{ marginBottom:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                <h2>{job.title}</h2>
                <span style={{ fontSize:11,padding:'2px 9px',borderRadius:100,background:'#F7F7F5',color:'#888',fontWeight:600 }}>
                  📦 {ta.archived}
                </span>
              </div>
              <div style={{ display:'flex', gap:14, fontSize:12, color:'#888' }}>
                <span><Icon name="building" size={11} color="#ccc" style={{ marginRight:4 }} />{job.dept}</span>
                <span><Icon name="target"   size={11} color="#ccc" style={{ marginRight:4 }} />{job.location}</span>
                <span style={{ color:'#ccc' }}>{ta.archivedOn} {entry.archivedAt}</span>
              </div>
              <p style={{ fontSize:12, color:'#aaa', marginTop:4 }}>{candidates.length} {ta.candidates} · {interviews.length} {ta.interviews}</p>
            </div>
            <button className="btn btn-sm" onClick={() => handleRestore(entry.id)} disabled={restoring}>
              <Icon name="restore" size={13} />{restoring ? tc.saving : ta.restore}
            </button>
          </div>
          {job.desc && <p style={{ fontSize:13,color:'#555',marginTop:14,lineHeight:1.75 }}>{job.desc}</p>}
          {job.links?.length>0 && (
            <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
              {job.links.map((l,i) => (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:500,color:'#1A56DB',background:'#EBF4FF',padding:'3px 9px',borderRadius:6,textDecoration:'none' }}>
                  <Icon name="externalLink" size={11} color="#1A56DB" />{l.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <h3 style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>{ta.candidates} ({candidates.length})</h3>
        {candidates.length===0
          ? <p style={{ color:'#aaa', fontSize:13 }}>—</p>
          : candidates.map((c,i) => {
              const civs = interviews.filter(iv=>iv.candidateId===c.id)
              return (
                <div key={c.id} className="card" style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:civs.length?14:0 }}>
                    <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={40} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                        <span style={{ fontSize:14,fontWeight:700 }}>{c.firstName} {c.lastName}</span>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#888' }}>
                        <span>{c.email}</span>
                        {c.phone && <span>{c.phone}</span>}
                        {c.appliedAt && <span><Icon name="calendar" size={11} color="#ccc" style={{ marginRight:3 }} />{t.candidates.appliedOn} {c.appliedAt}</span>}
                      </div>
                      {c.notes && <p style={{ fontSize:12,color:'#555',marginTop:6,padding:'6px 9px',background:'#F7F7F5',borderRadius:7,lineHeight:1.5 }}>{c.notes}</p>}
                    </div>
                  </div>
                  {civs.length>0 && (
                    <div style={{ borderTop:'1px solid #F0F0EE', paddingTop:12 }}>
                      <p style={{ fontSize:10,fontWeight:700,color:'#aaa',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10 }}>{ti.title} ({civs.length})</p>
                      {civs.map(iv => (
                        <div key={iv.id} style={{ display:'flex', gap:10, marginBottom:10 }}>
                          <div style={{ width:26,height:26,borderRadius:'50%',background:iv.done?'#ECFDF5':'#EBF4FF',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                            <Icon name={iv.done?'check':'clock'} size={12} color={iv.done?'#10B981':'#3B82F6'} />
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ fontSize:12,fontWeight:700 }}>{iv.type}</span>
                              <span style={{ fontSize:11,color:'#aaa' }}>{iv.scheduledAt?.replace('T',' ').slice(0,16)}</span>
                            </div>
                            <p style={{ fontSize:11,color:'#888',marginTop:1 }}>{iv.interviewer}</p>
                            {iv.feedback && <p style={{ fontSize:11,color:'#555',marginTop:5,padding:'6px 8px',background:'#F7F7F5',borderRadius:6,lineHeight:1.5 }}>{iv.feedback}</p>}
                            {iv.rating>0 && <p style={{ color:'#F59E0B',fontSize:11,marginTop:3 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
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

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{ta.title}</h1>
          <p className="page-sub">{ta.subtitle.replace('{n}',archives.length)}</p>
        </div>
      </div>

      <div style={{ position:'relative', marginBottom:18 }}>
        <Icon name="search" size={14} color="#bbb" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={ta.search}
          style={{ width:'100%',padding:'9px 12px 9px 36px',border:'1px solid #EBEBEA',borderRadius:9,fontSize:13,background:'#fff' }} />
      </div>

      {archives.length===0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc' }}>
          <Icon name="archive" size={40} color="#ddd" style={{ margin:'0 auto 14px', display:'block' }} />
          <p style={{ fontSize:14,fontWeight:500,color:'#bbb' }}>{ta.noArchive}</p>
          <p style={{ fontSize:13,marginTop:6 }}>{ta.noArchiveSub}</p>
        </div>
      )}

      {filtered.map(a => (
        <div key={a.id} className="card" style={{ cursor:'pointer', transition:'border-color .15s' }}
          onClick={() => setSelected(a.id)}
          onMouseOver={e => e.currentTarget.style.borderColor='#C8C8C3'}
          onMouseOut={e  => e.currentTarget.style.borderColor='#EBEBEA'}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                <span style={{ fontSize:14,fontWeight:700 }}>{a.job.title}</span>
                <span style={{ fontSize:10,padding:'2px 8px',borderRadius:100,background:'#F7F7F5',color:'#888',fontWeight:600 }}>📦 {ta.archived}</span>
              </div>
              <p style={{ fontSize:12,color:'#aaa' }}>{a.job.dept} · {a.job.location}</p>
              <p style={{ fontSize:11,color:'#ccc',marginTop:4 }}>{ta.archivedOn} {a.archivedAt}</p>
            </div>
            <div style={{ display:'flex', gap:10, flexShrink:0 }}>
              {[{ icon:'users', count:a.candidates.length, label:ta.candidates },{ icon:'calendar', count:a.interviews.length, label:ta.interviews }].map(p => (
                <div key={p.label} style={{ textAlign:'center',background:'#F7F7F5',borderRadius:8,padding:'6px 12px',minWidth:64 }}>
                  <Icon name={p.icon} size={14} color="#bbb" style={{ margin:'0 auto 3px', display:'block' }} />
                  <p style={{ fontSize:16,fontWeight:700,letterSpacing:'-0.5px' }}>{p.count}</p>
                  <p style={{ fontSize:10,color:'#aaa' }}>{p.label}</p>
                </div>
              ))}
            </div>
          </div>
          {a.candidates.length>0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', height:5, borderRadius:3, overflow:'hidden', gap:1 }}>
                {Object.entries(a.candidates.reduce((acc,c)=>({...acc,[c.status]:(acc[c.status]||0)+1}),{})).map(([st,n]) => (
                  <div key={st} style={{ flex:n/a.candidates.length, background:DOT_COLORS[st]||'#ccc', borderRadius:3 }} title={`${STATUS_DISPLAY[st]||st}: ${n}`} />
                ))}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:6 }}>
                {Object.entries(a.candidates.reduce((acc,c)=>({...acc,[c.status]:(acc[c.status]||0)+1}),{})).map(([st,n]) => (
                  <span key={st} style={{ fontSize:10,color:'#aaa' }}>
                    <span style={{ display:'inline-block',width:6,height:6,borderRadius:'50%',background:DOT_COLORS[st]||'#ccc',marginRight:3 }} />
                    {STATUS_DISPLAY[st]||st}: {n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      {filtered.length===0 && archives.length>0 && (
        <p style={{ textAlign:'center',padding:24,color:'#aaa',fontSize:13 }}>{ta.noResults} „{search}"</p>
      )}
    </div>
  )
}
