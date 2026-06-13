// src/views/JobsView.jsx
import { useState } from 'react'
import Badge       from '../components/Badge.jsx'
import Icon        from '../components/Icon.jsx'
import { useT }    from '../lib/i18n.jsx'

const EMPTY = { title:'', dept:'', location:'', desc:'', links:[], isOpen:true }

export default function JobsView({ jobs, candidates, interviews, persistJobs, onArchive, onSelectCandidate }) {
  const { t, lang, TYPE_DISPLAY } = useT()
  const tj = t.jobs; const tc = t.common

  const [selected,  setSelected]  = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [editMode,  setEditMode]  = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl,   setLinkUrl]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [expandedDesc,      setExpandedDesc]      = useState(new Set())
  const [showMoreCandidates,setShowMoreCandidates]= useState(false)
  const [detailDescExpanded,setDetailDescExpanded]= useState(false)

  const job = jobs.find(j=>j.id===selected)
  const F   = (k,v) => setForm(f=>({...f,[k]:v}))

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const links = linkLabel && linkUrl ? [{ label:linkLabel, url:linkUrl }] : []
    const next = selected && editMode
      ? jobs.map(j => j.id===selected ? { ...j, ...form, links: links.length ? links : j.links } : j)
      : [...jobs, { ...form, id:crypto.randomUUID(), links, createdAt:new Date().toISOString().split('T')[0] }]
    await persistJobs(next)
    setShowForm(false); setEditMode(false); setForm(EMPTY); setLinkLabel(''); setLinkUrl(''); setSaving(false)
  }

  async function toggleOpen(id) {
    await persistJobs(jobs.map(j=>j.id===id?{...j,isOpen:!j.isOpen}:j))
  }

  function startEdit() {
    setForm({ title:job.title, dept:job.dept, location:job.location, desc:job.desc, links:job.links, isOpen:job.isOpen })
    if (job.links?.[0]) { setLinkLabel(job.links[0].label); setLinkUrl(job.links[0].url) }
    setEditMode(true); setShowForm(true)
  }

  // Plain render function — NOT a component — avoids remount-on-keystroke bug
  function renderJobForm(title) {
    return (
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:16 }}>{title}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="field"><label>{tj.jobTitle}</label><input value={form.title}    onChange={e=>F('title',e.target.value)}    placeholder={tj.placeholderTitle} /></div>
          <div className="field"><label>{tj.department}</label><input value={form.dept}   onChange={e=>F('dept',e.target.value)}     placeholder={tj.placeholderDept} /></div>
        </div>
        <div className="field"><label>{tj.location}</label><input value={form.location}   onChange={e=>F('location',e.target.value)} placeholder={tj.placeholderLoc} /></div>
        <div className="field"><label>{tj.description}</label><textarea value={form.desc} onChange={e=>F('desc',e.target.value)} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="field"><label>{tj.linkLabel}</label><input value={linkLabel} onChange={e=>setLinkLabel(e.target.value)} placeholder="e.g. LinkedIn" /></div>
          <div className="field"><label>{tj.linkUrl}</label>  <input value={linkUrl}   onChange={e=>setLinkUrl(e.target.value)}   placeholder="https://..." /></div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-sm" onClick={() => { setShowForm(false); setEditMode(false) }}>{tc.cancel}</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <Icon name="save" size={13} color="#fff" />{saving ? tc.saving : tc.save}
          </button>
        </div>
      </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected && job) {
    const jobCands = candidates.filter(c=>c.jobId===job.id)
    return (
      <div>
        <button className="btn btn-sm" onClick={() => { setSelected(null); setShowForm(false); setEditMode(false); setShowMoreCandidates(false); setDetailDescExpanded(false) }} style={{ marginBottom:20 }}>
          <Icon name="arrowLeft" size={14} />{tc.back}
        </button>
        {showForm && editMode && renderJobForm(tj.editTitle)}
        {!editMode && (
          <div className="card" style={{ marginBottom:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                  <h2>{job.title}</h2>
                  <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, fontWeight:600, background:job.isOpen?'#ECFDF5':'#F7F7F5', color:job.isOpen?'#065F46':'#888' }}>
                    {job.isOpen ? tc.open : tc.closed}
                  </span>
                </div>
                <div style={{ display:'flex', gap:14, fontSize:12, color:'#888' }}>
                  <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="building" size={12} color="#ccc" />{job.dept}</span>
                  <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="target"   size={12} color="#ccc" />{job.location}</span>
                  <span style={{ color:'#ccc' }}>{tj.since} {job.createdAt}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                <button className="btn btn-sm" onClick={startEdit}><Icon name="edit" size={13} />{tc.edit}</button>
                <button className="btn btn-sm" onClick={() => toggleOpen(job.id)}>{job.isOpen ? tj.close : tj.reopen}</button>
                {!job.isOpen && onArchive && (
                  <button className="btn btn-sm btn-danger" onClick={() => {
                    if (window.confirm(tj.confirmArchive.replace('{title}',job.title))) { onArchive(job.id); setSelected(null) }
                  }}>
                    <Icon name="archive" size={13} />{tj.archive}
                  </button>
                )}
              </div>
            </div>
            {job.desc && (
              <p style={{ fontSize:13, color:'#555', marginTop:14, lineHeight:1.75 }}>
                {detailDescExpanded || job.desc.length <= 100
                  ? job.desc
                  : <>{job.desc.substring(0,100)}…</>
                }
                {job.desc.length > 100 && (
                  <>{' '}
                    <button type="button" onClick={() => setDetailDescExpanded(v=>!v)}
                      style={{ color: detailDescExpanded?'#aaa':'#378ADD', background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0, fontFamily:'inherit' }}>
                      {detailDescExpanded ? (lang==='de'?'Weniger':'Less') : (lang==='de'?'Mehr lesen':'Read more')}
                    </button>
                  </>
                )}
              </p>
            )}
            {job.links?.length > 0 && (
              <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
                {job.links.map((l,i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,fontWeight:500,color:'#1A56DB',background:'#EBF4FF',padding:'3px 9px',borderRadius:6,textDecoration:'none' }}>
                    <Icon name="externalLink" size={11} color="#1A56DB" />{l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="section-header">
          <span className="section-title">{tj.candidates} — {lang==='de'?'Top 3 nach Bewertung':'Top 3 by Rating'}</span>
          <span style={{ fontSize:11, color:'#aaa' }}>{jobCands.length} {lang==='de'?'gesamt':'total'}</span>
        </div>

        {(() => {
          const ranked = jobCands
            .filter(c => !['Abgelehnt','Rejected'].includes(c.status))
            .map(c => {
              const civs = (interviews||[]).filter(i => i.candidateId===c.id && i.done && i.rating > 0)
              const avg  = civs.length > 0 ? civs.reduce((s,i)=>s+i.rating,0)/civs.length : 0
              return { ...c, avgRating: avg, ratedIvs: civs }
            }).sort((a,b) => b.avgRating - a.avgRating).slice(0, 3)

          const medalColor = ['#F59E0B','#9CA3AF','#B45309']
          const medals     = ['🥇','🥈','🥉']

          return (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width:32 }}></th>
                    <th>{t.candidates.firstName} {t.candidates.lastName}</th>
                    <th>{t.candidates.status}</th>
                    <th>{lang==='de'?'Einzelbewertungen':'Individual Ratings'}</th>
                    <th>{lang==='de'?'Ø':'Avg.'}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, i) => (
                    <tr key={c.id} onClick={() => onSelectCandidate?.(c.id)} style={{ cursor: onSelectCandidate ? 'pointer' : 'default' }}>
                      <td style={{ fontSize:18, textAlign:'center' }}>{medals[i]}</td>
                      <td style={{ fontWeight:600, color: onSelectCandidate ? '#1A56DB' : undefined }}>{c.firstName} {c.lastName}</td>
                      <td><Badge status={c.status} /></td>
                      <td>
                        {c.ratedIvs.length > 0
                          ? <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                              {c.ratedIvs.map((iv,k) => (
                                <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  <span style={{ color:'#F59E0B', fontSize:11, letterSpacing:1 }}>
                                    {'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}
                                  </span>
                                  <span style={{ fontSize:10, color:'#aaa' }}>
                                    {TYPE_DISPLAY[iv.type]||iv.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          : <span style={{ color:'#ccc', fontSize:12 }}>{lang==='de'?'Keine':'None'}</span>
                        }
                      </td>
                      <td>
                        {c.avgRating > 0
                          ? <div>
                              <span style={{ color:medalColor[i], fontSize:13, letterSpacing:1 }}>
                                {'★'.repeat(Math.round(c.avgRating))}{'☆'.repeat(5-Math.round(c.avgRating))}
                              </span>
                              <span style={{ color:'#888', fontSize:11, display:'block', marginTop:2 }}>
                                {c.avgRating.toFixed(1)} · {c.ratedIvs.length}×
                              </span>
                            </div>
                          : <span style={{ color:'#ccc', fontSize:12 }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {ranked.length===0 && (
                    <tr><td colSpan={5} style={{ textAlign:'center',color:'#bbb',padding:24 }}>
                      {lang==='de'?'Noch keine Bewertungen vorhanden.':'No rated interviews yet.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        })()}

        {/* See more candidates — all non-Rejected, sorted by name */}
        {(() => {
          const REJECTED = ['Abgelehnt','Rejected']
          const allRanked = jobCands
            .filter(c => !REJECTED.includes(c.status))
            .map(c => {
              const civs = (interviews||[]).filter(i=>i.candidateId===c.id&&i.done&&i.rating>0)
              const avg  = civs.length>0 ? civs.reduce((s,i)=>s+i.rating,0)/civs.length : 0
              return { ...c, avgRating: avg, ratedIvs: civs }
            }).sort((a,b)=>b.avgRating-a.avgRating)

          const top3Ids = allRanked.slice(0,3).map(x=>x.id)
          const others  = allRanked.filter(c => !top3Ids.includes(c.id))

          if (others.length === 0) return null
          return (
            <div style={{ marginTop:12 }}>
              <button onClick={() => setShowMoreCandidates(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#1A56DB', background:'none', border:'none', cursor:'pointer', padding:'4px 0', fontFamily:'inherit', fontWeight:500 }}>
                <Icon name={showMoreCandidates?'chevronRight':'chevronRight'} size={14} color="#1A56DB"
                  style={{ transform: showMoreCandidates ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .2s' }} />
                {showMoreCandidates
                  ? (lang==='de'?'Weniger anzeigen':'Show less')
                  : `${lang==='de'?'Weitere Kandidaten anzeigen':'See more candidates'} (${others.length})`}
              </button>

              {showMoreCandidates && (
                <div className="card" style={{ padding:0, overflow:'hidden', marginTop:10 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t.candidates.firstName} {t.candidates.lastName}</th>
                        <th>{t.candidates.status}</th>
                        <th>{lang==='de'?'Einzelbewertungen':'Individual Ratings'}</th>
                        <th>{lang==='de'?'Ø':'Avg.'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {others.map(c => (
                        <tr key={c.id} onClick={() => onSelectCandidate?.(c.id)} style={{ cursor: onSelectCandidate ? 'pointer' : 'default' }}>
                          <td style={{ fontWeight:500, color: onSelectCandidate ? '#1A56DB' : undefined }}>{c.firstName} {c.lastName}</td>
                          <td><Badge status={c.status} /></td>
                          <td>
                            {c.ratedIvs.length > 0
                              ? <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                  {c.ratedIvs.map((iv,k) => (
                                    <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                                      <span style={{ color:'#F59E0B', fontSize:11, letterSpacing:1 }}>
                                        {'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}
                                      </span>
                                      <span style={{ fontSize:10, color:'#aaa' }}>
                                        {TYPE_DISPLAY[iv.type]||iv.type}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              : <span style={{ color:'#ccc', fontSize:12 }}>{lang==='de'?'Keine':'None'}</span>
                            }
                          </td>
                          <td>
                            {c.avgRating > 0
                              ? <div>
                                  <span style={{ color:'#aaa', fontSize:13, letterSpacing:1 }}>
                                    {'★'.repeat(Math.round(c.avgRating))}{'☆'.repeat(5-Math.round(c.avgRating))}
                                  </span>
                                  <span style={{ color:'#888', fontSize:11, display:'block', marginTop:2 }}>
                                    {c.avgRating.toFixed(1)} · {c.ratedIvs.length}×
                                  </span>
                                </div>
                              : <span style={{ color:'#ccc', fontSize:12 }}>—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{tj.title}</h1>
          <p className="page-sub">{tj.subtitle.replace('{open}',jobs.filter(j=>j.isOpen).length).replace('{total}',jobs.length)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditMode(false); setShowForm(true) }}>
          <Icon name="plus" size={14} color="#fff" />{tj.newJob}
        </button>
      </div>
      {showForm && !editMode && renderJobForm(tj.addTitle)}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {jobs.map(j => {
          const cnt = candidates.filter(c=>c.jobId===j.id).length
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
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, fontWeight:600, flexShrink:0, background:j.isOpen?'#ECFDF5':'#F7F7F5', color:j.isOpen?'#065F46':'#888' }}>
                  {j.isOpen ? tc.open : tc.closed}
                </span>
              </div>
              <p style={{ fontSize:12, color:'#888', lineHeight:1.65, marginBottom:12 }}>
                {expandedDesc.has(j.id) || (j.desc||'').length <= 100
                  ? j.desc
                  : <>{j.desc?.substring(0,100)}…{' '}
                    <button type="button" onClick={e=>{ e.stopPropagation(); setExpandedDesc(s=>new Set([...s,j.id])) }}
                      style={{ color:'#378ADD', background:'none', border:'none', cursor:'pointer', fontSize:12, padding:0, fontFamily:'inherit' }}>
                      {lang==='de'?'Mehr lesen':'Read more'}
                    </button>
                  </>
                }
                {expandedDesc.has(j.id) && (j.desc||'').length > 100 && (
                  <>{' '}<button type="button" onClick={e=>{ e.stopPropagation(); setExpandedDesc(s=>{ const n=new Set(s); n.delete(j.id); return n }) }}
                    style={{ color:'#aaa', background:'none', border:'none', cursor:'pointer', fontSize:12, padding:0, fontFamily:'inherit' }}>
                    {lang==='de'?'Weniger':'Less'}
                  </button></>
                )}
              </p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
                {j.links?.map((l,i) => (
                  <span key={i} onClick={e => { e.stopPropagation(); window.open(l.url,'_blank') }}
                    style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:11,fontWeight:500,color:'#1A56DB',background:'#EBF4FF',padding:'2px 8px',borderRadius:6,cursor:'pointer' }}>
                    <Icon name="externalLink" size={10} color="#1A56DB" />{l.label}
                  </span>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'#aaa',background:'#F7F7F5',padding:'3px 8px',borderRadius:6 }}>
                  <Icon name="users" size={11} color="#bbb" />{cnt} {tj.candidates}
                </span>
                <span style={{ fontSize:11, color:'#ccc' }}>{tj.since} {j.createdAt}</span>
              </div>
            </div>
          )
        })}
        {jobs.length===0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 0', color:'#ccc' }}>
            <Icon name="briefcase" size={36} color="#ddd" style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ fontSize:14, fontWeight:500, color:'#bbb' }}>{tj.noJobs}</p>
          </div>
        )}
      </div>
    </div>
  )
}
