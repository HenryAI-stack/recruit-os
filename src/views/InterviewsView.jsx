// src/views/InterviewsView.jsx
import { useState, useMemo, useRef } from 'react'
import Badge    from '../components/Badge.jsx'
import Icon     from '../components/Icon.jsx'
import { useT } from '../lib/i18n.jsx'
import { improveText } from '../lib/ai.js'

const AV_COLORS = [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]

function Avatar({ name, photo, size=36 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
  const ini = name.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const [bg,color] = AV_COLORS[name.charCodeAt(0)%AV_COLORS.length]
  return <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,fontWeight:700,flexShrink:0 }}>{ini}</div>
}

function Field({ label,value,onChange,placeholder,multiline,select,type }) {
  return (
    <div className="field">
      <label>{label}</label>
      {select
        ? <select value={value} onChange={e=>onChange(e.target.value)}>
            {select.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : multiline
          ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
          : <input type={type||'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}

// Pill-style filter chip
function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'5px 12px', borderRadius:100, fontSize:12,
      fontWeight: active ? 600 : 400, cursor:'pointer',
      fontFamily:'inherit', transition:'all .15s',
      border:     active ? '1px solid #1A1A1A' : '1px solid #EBEBEA',
      background: active ? '#1A1A1A' : '#fff',
      color:      active ? '#fff'    : '#888',
    }}>{label}</button>
  )
}

export default function InterviewsView({ jobs, candidates, interviews, persistInterviews, onSelectCandidate }) {
  const { t, lang, TYPE_DISPLAY } = useT()
  const ti = t.interviews; const tc = t.common

  // ── Filter / search state ────────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')   // all | planned | done
  const [filterType,   setFilterType]   = useState('all')
  const [filterJob,    setFilterJob]    = useState('all')
  const [filterRating, setFilterRating] = useState(0)       // 0 = all, 1–5 = minimum stars

  // ── Edit state ───────────────────────────────────────────────────────────
  const [editingId,          setEditingId]          = useState(null)
  const [editForm,           setEditForm]           = useState({})
  const [saving,             setSaving]             = useState(false)
  const [feedbackImproving,  setFeedbackImproving]  = useState(false)
  const [feedbackAiApplied,  setFeedbackAiApplied]  = useState(false)
  const [feedbackError,      setFeedbackError]      = useState(null)
  const feedbackRef = useRef('')   // always holds latest feedback value — avoids stale closure

  const F = (k,v) => {
    setEditForm(f=>({...f,[k]:v}))
    if (k==='feedback') { feedbackRef.current = v; setFeedbackAiApplied(false); setFeedbackError(null) }
  }

  async function triggerFeedbackImprove() {
    const text = feedbackRef.current
    if (!text || text.trim().length < 15 || feedbackImproving) return
    setFeedbackImproving(true); setFeedbackError(null)
    try {
      const improved = await improveText(text, lang)
      if (improved) {
        setEditForm(f=>({...f, feedback: improved}))
        feedbackRef.current = improved
        setFeedbackAiApplied(true)
      }
    } catch(e) {
      console.error('OpenRouter error:', e)
      setFeedbackError(lang==='de' ? `KI-Fehler: ${e.message}` : `AI error: ${e.message}`)
    } finally { setFeedbackImproving(false) }
  }

  // ── Derived filter options ───────────────────────────────────────────────
  const allTypes = useMemo(() => [...new Set(interviews.map(i=>i.type).filter(Boolean))], [interviews])
  const allJobs  = useMemo(() => jobs.filter(j => interviews.some(i=>i.jobId===j.id)), [interviews,jobs])

  // ── Filtered interviews ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return interviews.filter(iv => {
      const c = candidates.find(x=>x.id===iv.candidateId)
      const j = jobs.find(x=>x.id===iv.jobId)
      const name = c ? `${c.firstName} ${c.lastName}`.toLowerCase() : ''
      const matchSearch = !q ||
        name.includes(q) ||
        (iv.type||'').toLowerCase().includes(q) ||
        (iv.interviewer||'').toLowerCase().includes(q) ||
        (j?.title||'').toLowerCase().includes(q) ||
        (iv.feedback||'').toLowerCase().includes(q)
      const matchStatus = filterStatus==='all' || (filterStatus==='planned'?!iv.done:iv.done)
      const matchType   = filterType==='all'   || iv.type===filterType
      const matchJob    = filterJob==='all'    || iv.jobId===filterJob
      const matchRating = filterRating === 0 || iv.rating >= filterRating
      return matchSearch && matchStatus && matchType && matchJob && matchRating
    }).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0))
  }, [interviews, candidates, jobs, search, filterStatus, filterType, filterJob])

  const planned   = filtered.filter(i=>!i.done)
  const completed = filtered.filter(i=> i.done)

  // ── Edit handlers ────────────────────────────────────────────────────────
  function startEdit(iv) {
    setEditForm({ type:iv.type, scheduledAt:iv.scheduledAt||'', interviewer:iv.interviewer||'', done:iv.done, feedback:iv.feedback||'', rating:iv.rating||0 })
    feedbackRef.current = iv.feedback || ''
    setFeedbackAiApplied(false); setFeedbackError(null)
    setEditingId(iv.id)
  }
  async function handleSave() {
    setSaving(true)
    await persistInterviews(interviews.map(i=>i.id===editingId?{...i,...editForm}:i))
    setEditingId(null); setSaving(false)
  }
  async function handleDelete(id) {
    if (!window.confirm(ti.confirmDelete)) return
    await persistInterviews(interviews.filter(i=>i.id!==id))
  }

  const ratingOpts = [
    {v:'0',l:ti.noRating},{v:'1',l:'★ 1/5'},{v:'2',l:'★★ 2/5'},
    {v:'3',l:'★★★ 3/5'}, {v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'},
  ]

  function renderIvCard(iv) {
    const c = candidates.find(x=>x.id===iv.candidateId)
    const j = jobs.find(x=>x.id===iv.jobId)
    if (!c) return null
    const name      = `${c.firstName} ${c.lastName}`
    const isEditing = editingId===iv.id

    return (
      <div style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, marginBottom:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
          <Avatar name={name} photo={c.photo} size={36} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span
                onClick={() => onSelectCandidate?.(c.id)}
                style={{ fontSize:13, fontWeight:700, color: onSelectCandidate ? '#1A56DB' : undefined, cursor: onSelectCandidate ? 'pointer' : 'default' }}
              >{name}</span>
              <span style={{ fontSize:12, color:'#888' }}>— {TYPE_DISPLAY[iv.type]||iv.type}</span>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'#aaa', marginTop:3, flexWrap:'wrap' }}>
              {j && <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="briefcase" size={11} color="#ccc" />{j.title}</span>}
              <span   style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="calendar"  size={11} color="#ccc" />{iv.scheduledAt?.replace('T',' ').slice(0,16)||tc.noData}</span>
              <span   style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="users"     size={11} color="#ccc" />{iv.interviewer||tc.noData}</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <Badge status={c.status} />
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600, whiteSpace:'nowrap',
              background: iv.done?'#ECFDF5':'#EBF4FF', color: iv.done?'#065F46':'#1A56DB' }}>
              {iv.done ? ti.statusDone : ti.statusPlanned}
            </span>
            <button className="btn btn-ghost btn-icon" title={tc.edit} onClick={() => isEditing ? setEditingId(null) : startEdit(iv)}>
              <Icon name={isEditing?'x':'edit'} size={14} color="#aaa" />
            </button>
            <button className="btn btn-ghost btn-icon" title={tc.delete} onClick={() => handleDelete(iv.id)}>
              <Icon name="trash" size={14} color="#f87171" />
            </button>
          </div>
        </div>

        {/* Feedback (collapsed view) */}
        {!isEditing && iv.feedback && (
          <div style={{ padding:'0 16px 12px', borderTop:'1px solid #F3F3F1' }}>
            <p style={{ fontSize:12,color:'#555',padding:'8px 10px',background:'#F7F7F5',borderRadius:8,lineHeight:1.65,marginTop:10 }}>{iv.feedback}</p>
            {iv.rating>0 && <p style={{ color:'#F59E0B',fontSize:12,marginTop:5 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
          </div>
        )}

        {/* Inline edit form */}
        {isEditing && (
          <div style={{ padding:'14px 16px', borderTop:'1px solid #EBEBEA', background:'#FAFAF9' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label={ti.type}        value={editForm.type}         onChange={v=>F('type',v)}         select={ti.types} />
              <Field label={ti.dateTime}    value={editForm.scheduledAt}  onChange={v=>F('scheduledAt',v)}  type="datetime-local" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label={ti.interviewer} value={editForm.interviewer}  onChange={v=>F('interviewer',v)}  placeholder="Name" />
              <Field label={ti.statusLabel} value={editForm.done?'1':'0'} onChange={v=>F('done',v==='1')}   select={[{v:'0',l:ti.statusPlanned},{v:'1',l:ti.statusDone}]} />
            </div>
            {/* Feedback with AI improvement */}
            <div className="field">
              <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
                <span>{ti.feedback}</span>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {feedbackImproving && (
                    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#7C3AED', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'#7C3AED', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
                      {lang==='de' ? 'KI verbessert…' : 'AI improving…'}
                    </span>
                  )}
                  {feedbackAiApplied && !feedbackImproving && (
                    <span style={{ fontSize:10, color:'#10B981', fontWeight:600 }}>✦ {lang==='de' ? 'KI verbessert' : 'AI improved'}</span>
                  )}
                  <button
                    type="button"
                    onClick={triggerFeedbackImprove}
                    disabled={feedbackImproving || !editForm.feedback || editForm.feedback.trim().length < 15}
                    style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', border:'1px solid #C4B5FD', background:'#F0EEFF', color:'#5B21B6', fontFamily:'inherit', opacity:(!editForm.feedback || editForm.feedback.trim().length < 15) ? 0.4 : 1 }}>
                    ✦ {lang==='de' ? 'Verbessern' : 'Improve'}
                  </button>
                </div>
              </label>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
              <textarea
                value={editForm.feedback}
                onChange={e => F('feedback', e.target.value)}
                placeholder={lang==='de' ? 'Gesprächsnotizen… (per Klick auf ✦ Verbessern)' : 'Interview notes… (click ✦ Improve to enhance)'}
                disabled={feedbackImproving}
                style={{ opacity: feedbackImproving ? 0.6 : 1, transition:'opacity .2s' }}
              />
              {feedbackError && <p style={{ fontSize:11, color:'#EF4444', marginTop:4 }}>{feedbackError}</p>}
            </div>
            <Field label={ti.rating} value={String(editForm.rating)} onChange={v=>F('rating',Number(v))} select={ratingOpts} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-sm" onClick={()=>setEditingId(null)}>{tc.cancel}</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Icon name="save" size={13} color="#fff" />{saving?tc.saving:tc.save}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const hasResults = planned.length > 0 || completed.length > 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{ti.title}</h1>
          <p className="page-sub">
            {interviews.length > 0
              ? ti.subtitle.replace('{planned}',interviews.filter(i=>!i.done).length).replace('{done}',interviews.filter(i=>i.done).length)
              : ti.noInterviewsSub}
          </p>
        </div>
      </div>

      {interviews.length > 0 && (
        <>
          {/* Search bar */}
          <div style={{ position:'relative', marginBottom:14 }}>
            <Icon name="search" size={14} color="#bbb" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder={t.lang === 'de' ? 'Name, Gesprächsart, Interviewer…' : 'Name, type, interviewer…'}
              style={{ width:'100%', padding:'9px 12px 9px 36px', border:'1px solid #EBEBEA', borderRadius:9, fontSize:13, background:'#fff', fontFamily:'inherit' }}
            />
            {search && (
              <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'#aaa', display:'flex' }}>
                <Icon name="x" size={14} color="#bbb" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18, alignItems:'center' }}>

            {/* Status filter */}
            <Chip label={tc.all}         active={filterStatus==='all'}     onClick={()=>setFilterStatus('all')} />
            <Chip label={ti.statusPlanned} active={filterStatus==='planned'} onClick={()=>setFilterStatus('planned')} />
            <Chip label={ti.statusDone}    active={filterStatus==='done'}    onClick={()=>setFilterStatus('done')} />

            {/* Separator */}
            {(allTypes.length > 0 || allJobs.length > 0) && (
              <span style={{ width:1, height:20, background:'#EBEBEA', margin:'0 4px' }} />
            )}

            {/* Type dropdown */}
            {allTypes.length > 0 && (
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{
                padding:'5px 28px 5px 10px', borderRadius:8, fontSize:12, border:'1px solid #EBEBEA',
                background:'#fff', cursor:'pointer', color: filterType==='all'?'#888':'#1A1A1A',
                fontWeight: filterType==='all'?400:600, fontFamily:'inherit', appearance:'none',
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
                backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
              }}>
                <option value="all">{ti.type}: {tc.all}</option>
                {allTypes.map(tp => <option key={tp} value={tp}>{TYPE_DISPLAY[tp]||tp}</option>)}
              </select>
            )}

            {/* Job dropdown — with location in brackets */}
            {allJobs.length > 0 && (
              <select value={filterJob} onChange={e=>setFilterJob(e.target.value)} style={{
                padding:'5px 28px 5px 10px', borderRadius:8, fontSize:12, border:'1px solid #EBEBEA',
                background:'#fff', cursor:'pointer', color: filterJob==='all'?'#888':'#1A1A1A',
                fontWeight: filterJob==='all'?400:600, fontFamily:'inherit', appearance:'none',
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
                backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
              }}>
                <option value="all">{t.nav.jobs}: {tc.all}</option>
                {allJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}{j.location?` (${j.location})`:''}</option>
                ))}
              </select>
            )}

            {/* Star rating filter */}
            <select value={filterRating} onChange={e=>setFilterRating(Number(e.target.value))} style={{
              padding:'5px 28px 5px 10px', borderRadius:8, fontSize:12, border:'1px solid #EBEBEA',
              background:'#fff', cursor:'pointer', color: filterRating===0?'#888':'#1A1A1A',
              fontWeight: filterRating===0?400:600, fontFamily:'inherit', appearance:'none',
              backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
              backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
            }}>
              <option value={0}>{lang==='de'?'Alle Bewertungen':'All Ratings'}</option>
              <option value={5}>★★★★★ (5)</option>
              <option value={4}>★★★★☆ (4+)</option>
              <option value={3}>★★★☆☆ (3+)</option>
              <option value={2}>★★☆☆☆ (2+)</option>
              <option value={1}>★☆☆☆☆ (1+)</option>
            </select>

            {/* Clear all */}
            {(filterStatus!=='all' || filterType!=='all' || filterJob!=='all' || filterRating!==0 || search) && (
              <button className="btn btn-sm" style={{ marginLeft:'auto', color:'#888' }}
                onClick={()=>{ setSearch(''); setFilterStatus('all'); setFilterType('all'); setFilterJob('all'); setFilterRating(0) }}>
                <Icon name="x" size={12} color="#aaa" />
                {lang==='de' ? 'Filter zurücksetzen' : 'Clear filters'}
              </button>
            )}
          </div>

          {/* No results */}
          {!hasResults && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#ccc' }}>
              <Icon name="search" size={32} color="#ddd" style={{ margin:'0 auto 12px', display:'block' }} />
              <p style={{ fontSize:14, color:'#bbb' }}>{t.lang === 'de' ? 'Keine Treffer' : 'No results found'}</p>
            </div>
          )}
        </>
      )}

      {/* Empty state (no interviews at all) */}
      {interviews.length===0 && (
        <div style={{ textAlign:'center', padding:'70px 0', color:'#ccc' }}>
          <Icon name="calendar" size={40} color="#ddd" style={{ margin:'0 auto 14px', display:'block' }} />
          <p style={{ fontSize:14, fontWeight:500, color:'#bbb' }}>{ti.noInterviews}</p>
          <p style={{ fontSize:13, marginTop:6 }}>{ti.noInterviewsSub}</p>
        </div>
      )}

      {/* Planned */}
      {planned.length>0 && (
        <div style={{ marginBottom:24 }}>
          <div className="section-header">
            <span className="section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="clock" size={14} color="#3B82F6" />{ti.planned}
              <span style={{ fontSize:11, color:'#aaa', fontWeight:400 }}>({planned.length})</span>
            </span>
          </div>
          {planned.map(iv=><div key={iv.id}>{renderIvCard(iv)}</div>)}
        </div>
      )}

      {/* Completed */}
      {completed.length>0 && (
        <div>
          <div className="section-header">
            <span className="section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="check" size={14} color="#10B981" />{ti.completed}
              <span style={{ fontSize:11, color:'#aaa', fontWeight:400 }}>({completed.length})</span>
            </span>
          </div>
          {completed.map(iv=><div key={iv.id}>{renderIvCard(iv)}</div>)}
        </div>
      )}
    </div>
  )
}
