// src/views/CandidatesView.jsx
import { useState } from 'react'
import Badge        from '../components/Badge.jsx'
import Icon         from '../components/Icon.jsx'
import PhotoUpload  from '../components/PhotoUpload.jsx'
import DateField    from '../components/DateField.jsx'
import { useT }     from '../lib/i18n.jsx'

const STATUSES   = ['Eingegangen','Erstgespräch','Technisches Gespräch','Ausgewählt','Abgelehnt']
const EMPTY      = { firstName:'',lastName:'',email:'',phone:'',jobId:'',status:'Eingegangen',notes:'',appliedAt:'' }
const AV_COLORS  = [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]
const ivEmpty = (displayName='') => ({ type:'Erstgespräch', scheduledAt:'', interviewer:displayName, done:false, feedback:'', rating:0 })

// Auto-status logic: interview type → candidate status (both DE + EN keys)
const STATUS_RANK = { 'Eingegangen':0,'Erstgespräch':1,'Technisches Gespräch':2,'Ausgewählt':99,'Abgelehnt':99 }
const IV_TO_STATUS = {
  'Erstgespräch':'Erstgespräch', 'First Interview':'Erstgespräch',
  'Technisches Gespräch':'Technisches Gespräch', 'Technical Interview':'Technisches Gespräch',
  'Fachgespräch':'Technisches Gespräch',         'Specialist Interview':'Technisches Gespräch',
  'HR-Interview':'Technisches Gespräch',          'HR Interview':'Technisches Gespräch',
  'Finalgespräch':'Technisches Gespräch',         'Final Interview':'Technisches Gespräch',
}
// Returns new status only if it's an upgrade; never overrides Ausgewählt / Abgelehnt
function deriveStatus(ivType, currentStatus) {
  const target = IV_TO_STATUS[ivType]
  if (!target) return null
  if (currentStatus === 'Ausgewählt' || currentStatus === 'Abgelehnt') return null
  if ((STATUS_RANK[target] ?? 0) <= (STATUS_RANK[currentStatus] ?? 0)) return null
  return target
}

function Avatar({ name, photo, size=34 }) {
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

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

async function improveText(text, lang) {
  if (!text || text.trim().length < 15) return null
  const systemPrompt = lang === 'de'
    ? 'Du bist ein HR-Profi. Formuliere die folgenden Gesprächsnotizen in ein klares, strukturiertes und professionelles Interviewfeedback um. Behalte alle Kernaussagen. Gib NUR den verbesserten Text zurück – keine Erklärung, kein Präambel.'
    : 'You are an HR professional. Rewrite the following interview notes into clear, structured, professional feedback. Keep all key points. Return ONLY the improved text – no explanation, no preamble.'
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'RecruitOS',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: text },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

function IvForm({ initial, jobs, candidateId, candidates, onSave, onCancel, t }) {
  const { lang } = useT()
  const [f,          setF]          = useState(initial)
  const [improving,  setImproving]  = useState(false)
  const [aiApplied,  setAiApplied]  = useState(false)
  const F = (k,v) => { setF(x=>({...x,[k]:v})); if(k==='feedback') setAiApplied(false) }

  const jobId  = initial.jobId || candidates.find(c=>c.id===candidateId)?.jobId
  const ti     = t.interviews
  const tc     = t.common
  const ratingOpts = [
    {v:'0',l:ti.noRating},{v:'1',l:'★ 1/5'},{v:'2',l:'★★ 2/5'},
    {v:'3',l:'★★★ 3/5'},{v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'},
  ]

  async function handleFeedbackBlur() {
    if (!f.feedback || f.feedback.trim().length < 15 || improving) return
    setImproving(true)
    try {
      const improved = await improveText(f.feedback, lang)
      if (improved) { setF(x=>({...x, feedback: improved})); setAiApplied(true) }
    } catch(e) {
      console.error('OpenRouter error:', e)
    } finally {
      setImproving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom:12, background:'#FAFAF9' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={ti.type}     value={f.type}        onChange={v=>F('type',v)}        select={ti.types} />
        <Field label={ti.dateTime} value={f.scheduledAt} onChange={v=>F('scheduledAt',v)} type="datetime-local" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={ti.interviewer} value={f.interviewer}  onChange={v=>F('interviewer',v)} placeholder="Name" />
        <Field label={ti.statusLabel} value={f.done?'1':'0'} onChange={v=>F('done',v==='1')}  select={[{v:'0',l:ti.statusPlanned},{v:'1',l:ti.statusDone}]} />
      </div>

      {/* Feedback field with AI improvement */}
      <div className="field">
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{ti.feedback}</span>
          {improving && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#7C3AED', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#7C3AED', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
              {lang==='de' ? 'KI verbessert…' : 'AI improving…'}
            </span>
          )}
          {aiApplied && !improving && (
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#10B981', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
              ✦ {lang==='de' ? 'KI verbessert' : 'AI improved'}
            </span>
          )}
        </label>
        <textarea
          value={f.feedback}
          onChange={e => F('feedback', e.target.value)}
          onBlur={handleFeedbackBlur}
          placeholder={lang==='de' ? 'Gesprächsnotizen… (KI verbessert beim Verlassen)' : 'Interview notes… (AI improves on exit)'}
          disabled={improving}
          style={{ opacity: improving ? 0.6 : 1, transition:'opacity .2s' }}
        />
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

      <Field label={ti.rating} value={String(f.rating)} onChange={v=>F('rating',Number(v))} select={ratingOpts} />
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-sm" onClick={onCancel}>{tc.cancel}</button>
        <button className="btn btn-primary btn-sm" disabled={improving} onClick={() => onSave({...f, jobId})}>
          <Icon name="save" size={13} color="#fff" />{tc.save}
        </button>
      </div>
    </div>
  )
}

export default function CandidatesView({ jobs, candidates, interviews, persistCandidates, persistInterviews, user }) {
  const { t, STATUS_DISPLAY, lang } = useT()
  const tc = t.common; const tca = t.candidates; const ti = t.interviews

  const [filter,         setFilter]         = useState('all')
  const [selected,       setSelected]       = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [editCand,       setEditCand]       = useState(false)
  const [form,           setForm]           = useState(EMPTY)
  const [saving,         setSaving]         = useState(false)
  const [showStPicker,   setShowStPicker]   = useState(false)
  const [showIvForm,     setShowIvForm]     = useState(false)
  const [editingIvId,    setEditingIvId]    = useState(null)
  const [notesImproving, setNotesImproving] = useState(false)
  const [notesAiApplied, setNotesAiApplied] = useState(false)

  const candidate = candidates.find(c=>c.id===selected)
  const filtered  = filter==='all' ? candidates : candidates.filter(c=>c.status===filter)
  const F = (k,v) => { setForm(f=>({...f,[k]:v})); if(k==='notes') setNotesAiApplied(false) }

  async function handleNotesBlur() {
    if (!form.notes || form.notes.trim().length < 15 || notesImproving) return
    setNotesImproving(true)
    try {
      const improved = await improveText(form.notes, lang)
      if (improved) { setForm(f=>({...f, notes: improved})); setNotesAiApplied(true) }
    } catch(e) { console.error('OpenRouter notes error:', e) }
    finally { setNotesImproving(false) }
  }

  async function handleSave() {
    if (!form.firstName.trim()||!form.lastName.trim()) return
    setSaving(true)
    const next = editCand
      ? candidates.map(c=>c.id===selected?{...c,...form}:c)
      : [...candidates,{...form,id:crypto.randomUUID(),photo:null,createdAt:new Date().toISOString().split('T')[0]}]
    await persistCandidates(next)
    setShowForm(false); setEditCand(false); setForm(EMPTY); setSaving(false)
  }

  function startEdit() {
    setForm({firstName:candidate.firstName,lastName:candidate.lastName,email:candidate.email,
             phone:candidate.phone,jobId:candidate.jobId,status:candidate.status,
             notes:candidate.notes||'',appliedAt:candidate.appliedAt||''})
    setEditCand(true); setShowForm(true)
  }

  async function handlePhoto(dataUrl) {
    await persistCandidates(candidates.map(c=>c.id===selected?{...c,photo:dataUrl}:c))
  }
  async function handleStatus(status) {
    await persistCandidates(candidates.map(c=>c.id===selected?{...c,status}:c))
    setShowStPicker(false)
  }
  async function handleSaveIv(data) {
    const isNew = !editingIvId
    const next = isNew
      ? [...interviews,{...data,id:crypto.randomUUID(),candidateId:selected,createdAt:new Date().toISOString()}]
      : interviews.map(i=>i.id===editingIvId?{...i,...data}:i)
    await persistInterviews(next)

    // Auto-upgrade candidate status when a new interview is registered
    if (isNew) {
      const newStatus = deriveStatus(data.type, candidate.status)
      if (newStatus) {
        await persistCandidates(candidates.map(c=>c.id===selected?{...c,status:newStatus}:c))
      }
    }

    setShowIvForm(false); setEditingIvId(null)
  }
  async function handleDeleteIv(id) {
    if (!window.confirm(ti.confirmDelete)) return
    await persistInterviews(interviews.filter(i=>i.id!==id))
  }

  // Defined as a plain function (not a component) to avoid React
  // treating it as a new component type on every re-render, which
  // would unmount/remount the form and kill focus on every keystroke.
  function renderCandForm(title) {
    return (
    <div className="card" style={{ marginBottom:16 }}>
      <h3 style={{ marginBottom:16 }}>{title}</h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={tca.firstName} value={form.firstName} onChange={v=>F('firstName',v)} placeholder={tca.firstName} />
        <Field label={tca.lastName}  value={form.lastName}  onChange={v=>F('lastName',v)}  placeholder={tca.lastName} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={tca.email} value={form.email} onChange={v=>F('email',v)} placeholder="email@..." />
        <Field label={tca.phone} value={form.phone} onChange={v=>F('phone',v)} placeholder="+43 ..." />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <DateField label={tca.appliedAt} value={form.appliedAt} onChange={v=>F('appliedAt',v)} />
        <Field label={tca.job}   value={form.jobId}  onChange={v=>F('jobId',v)}  select={jobs.map(j=>({v:j.id,l:j.location?`${j.title} (${j.location})`:j.title}))} />
      </div>
      <Field label={tca.status} value={form.status} onChange={v=>F('status',v)} select={STATUSES.map(s=>({v:s,l:STATUS_DISPLAY[s]||s}))} />

      {/* Notes with AI improvement on blur */}
      <div className="field">
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{tca.notes}</span>
          {notesImproving && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#7C3AED', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#7C3AED', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
              {lang==='de' ? 'KI verbessert…' : 'AI improving…'}
            </span>
          )}
          {notesAiApplied && !notesImproving && (
            <span style={{ fontSize:10, color:'#10B981', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
              ✦ {lang==='de' ? 'KI verbessert' : 'AI improved'}
            </span>
          )}
        </label>
        <textarea
          value={form.notes}
          onChange={e => F('notes', e.target.value)}
          onBlur={handleNotesBlur}
          placeholder={lang==='de' ? 'Erste Eindrücke… (KI verbessert beim Verlassen)' : 'First impressions… (AI improves on exit)'}
          disabled={notesImproving}
          style={{ opacity: notesImproving ? 0.6 : 1, transition:'opacity .2s' }}
        />
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-sm" onClick={() => { setShowForm(false); setEditCand(false) }}>{tc.cancel}</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          <Icon name="save" size={13} color="#fff" />{saving?tc.saving:tc.save}
        </button>
      </div>
    </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected && candidate) {
    const job   = jobs.find(j=>j.id===candidate.jobId)
    const civs  = interviews.filter(i=>i.candidateId===selected).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
    const editIv= interviews.find(i=>i.id===editingIvId)
    return (
      <div>
        <button className="btn btn-sm" onClick={() => { setSelected(null); setShowForm(false); setEditCand(false); setShowIvForm(false); setEditingIvId(null) }} style={{ marginBottom:20 }}>
          <Icon name="arrowLeft" size={14} />{tc.back}
        </button>
        {showForm && editCand && renderCandForm(tca.editTitle)}
        {!editCand && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
              <PhotoUpload currentPhoto={candidate.photo} onSave={handlePhoto} />
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
                  <h2>{candidate.firstName} {candidate.lastName}</h2>
                  <Badge status={candidate.status} />
                </div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontSize:12, color:'#888', marginBottom:candidate.notes?10:0 }}>
                  {candidate.email    && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="mail"      size={12} color="#ccc" />{candidate.email}</span>}
                  {candidate.phone    && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="phone"     size={12} color="#ccc" />{candidate.phone}</span>}
                  {job                && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="briefcase" size={12} color="#ccc" />{job.title}</span>}
                  {candidate.appliedAt&& <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="calendar"  size={12} color="#ccc" />{tca.appliedOn} {candidate.appliedAt}</span>}
                </div>
                {candidate.notes && <p style={{ fontSize:12,color:'#666',padding:'8px 10px',background:'#F7F7F5',borderRadius:8,lineHeight:1.65 }}>{candidate.notes}</p>}
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button className="btn btn-sm" onClick={startEdit}><Icon name="edit" size={13} />{tc.edit}</button>
                <button className="btn btn-sm" onClick={() => setShowStPicker(v=>!v)}>{tca.changeStatus}</button>
              </div>
            </div>
            {showStPicker && (
              <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={()=>handleStatus(s)} style={{
                    padding:'8px 10px', border:candidate.status===s?'2px solid #1A1A1A':'1px solid #EBEBEA',
                    borderRadius:8, background:candidate.status===s?'#F0F0EE':'#fff',
                    cursor:'pointer', fontSize:12, fontWeight:candidate.status===s?600:400, fontFamily:'inherit',
                  }}>{STATUS_DISPLAY[s]||s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="section-header">
          <span className="section-title">{ti.title} ({civs.length})</span>
          {!showIvForm && !editingIvId && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowIvForm(true); setEditingIvId(null) }}>
              <Icon name="plus" size={13} color="#fff" />{ti.addInterview}
            </button>
          )}
        </div>
        {showIvForm && !editingIvId && (
          <IvForm initial={ivEmpty(user?.displayName)} jobs={jobs} candidateId={selected} candidates={candidates}
            onSave={handleSaveIv} onCancel={() => setShowIvForm(false)} t={t} />
        )}
        {civs.length===0 && !showIvForm && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'#ccc' }}>
            <Icon name="calendar" size={32} color="#ddd" style={{ margin:'0 auto 10px', display:'block' }} />
            <p style={{ fontSize:13 }}>{ti.noInterviews}</p>
          </div>
        )}
        {civs.map(iv => (
          <div key={iv.id}>
            {editingIvId===iv.id
              ? <IvForm initial={editIv||ivEmpty(user?.displayName)} jobs={jobs} candidateId={selected} candidates={candidates}
                  onSave={handleSaveIv} onCancel={() => setEditingIvId(null)} t={t} />
              : (
                <div style={{ display:'flex', gap:12, marginBottom:14, padding:'14px 16px', background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, marginTop:1, background:iv.done?'#ECFDF5':'#EBF4FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={iv.done?'check':'clock'} size={14} color={iv.done?'#10B981':'#3B82F6'} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{iv.type}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600, background:iv.done?'#ECFDF5':'#EBF4FF', color:iv.done?'#065F46':'#1A56DB' }}>
                          {iv.done ? ti.statusDone : ti.statusPlanned}
                        </span>
                        <button className="btn btn-ghost btn-icon" onClick={() => { setEditingIvId(iv.id); setShowIvForm(false) }}><Icon name="edit"  size={13} color="#aaa" /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteIv(iv.id)}><Icon name="trash" size={13} color="#f87171" /></button>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#aaa', marginTop:4 }}>
                      <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="users"    size={11} color="#ccc" />{iv.interviewer}</span>
                      <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="calendar" size={11} color="#ccc" />{iv.scheduledAt?.replace('T',' ').slice(0,16)}</span>
                    </div>
                    {iv.feedback && <p style={{ fontSize:12,color:'#555',marginTop:8,padding:'8px 10px',background:'#F7F7F5',borderRadius:8,lineHeight:1.65 }}>{iv.feedback}</p>}
                    {iv.rating>0 && <p style={{ color:'#F59E0B',fontSize:12,marginTop:5 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
                  </div>
                </div>
              )
            }
          </div>
        ))}
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{tca.title}</h1>
          <p className="page-sub">{tca.subtitle.replace('{n}',candidates.length)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditCand(false); setShowForm(v=>!v) }}>
          <Icon name="plus" size={14} color="#fff" />{tca.newCandidate}
        </button>
      </div>
      {showForm && !editCand && renderCandForm(tca.addTitle)}

      {/* Filters */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
        {['all',...STATUSES].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'4px 12px', borderRadius:100, fontSize:12, fontWeight:filter===f?600:400,
            cursor:'pointer', fontFamily:'inherit',
            border:     filter===f?'1px solid #1A1A1A':'1px solid #EBEBEA',
            background: filter===f?'#1A1A1A':'#fff',
            color:      filter===f?'#fff':'#888',
          }}>{f==='all' ? tc.all : (STATUS_DISPLAY[f]||f)}</button>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table">
          <thead><tr><th>{tca.firstName} {tca.lastName}</th><th>{tca.status}</th><th>{t.jobs.candidates}</th><th>{tca.appliedAt}</th><th>{tca.email}</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => setSelected(c.id)}>
                <td><div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={30} />
                  <span style={{ fontWeight:500 }}>{c.firstName} {c.lastName}</span>
                </div></td>
                <td><Badge status={c.status} /></td>
                <td style={{ color:'#888' }}>{jobs.find(j=>j.id===c.jobId)?.title??tc.noData}</td>
                <td style={{ color:'#888' }}>{c.appliedAt||tc.noData}</td>
                <td style={{ color:'#888' }}>{c.email}</td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={5} style={{ textAlign:'center',padding:28,color:'#ccc' }}>{tca.noData}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
