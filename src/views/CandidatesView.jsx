// src/views/CandidatesView.jsx
import { useState, useRef, useEffect } from 'react'
import Badge        from '../components/Badge.jsx'
import Icon         from '../components/Icon.jsx'
import PhotoUpload  from '../components/PhotoUpload.jsx'
import DateField    from '../components/DateField.jsx'
import ResumeUpload from '../components/ResumeUpload.jsx'
import { useT }     from '../lib/i18n.jsx'
import { improveText, generateInterviewQuestions, extractCandidateInfo } from '../lib/ai.js'
import { saveResume, extractText } from '../lib/resume.js'

const STATUSES   = ['Eingegangen','Erstgespräch','Technisches Gespräch','Ausgewählt','Abgelehnt']
const EMPTY = { firstName:'',lastName:'',email:'',phone:'',mobile:'',address:'',birthday:'',jobId:'',status:'Eingegangen',notes:'',appliedAt:'',hasResume:false,resumeName:null }
const AV_COLORS  = [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]
const ivEmpty = (displayName='') => ({ type:'Erstgespräch', scheduledAt:'', interviewer:displayName, ivStatus:'planned', done:false, feedback:'', rating:0 })

// Backward-compatible status helper — old records use done:boolean, new ones use ivStatus string
function getIvStatus(iv) { return iv.ivStatus || (iv.done ? 'done' : 'planned') }

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

function IvForm({ initial, jobs, candidateId, candidates, onSave, onCancel, t }) {
  const { lang } = useT()
  const [f,             setF]             = useState(initial)
  const [improving,     setImproving]     = useState(false)
  const [aiApplied,     setAiApplied]     = useState(false)
  const [feedbackError, setFeedbackError] = useState(null)
  const feedbackRef = useRef(initial.feedback || '')

  const F = (k,v) => {
    setF(x=>({...x,[k]:v}))
    if (k==='feedback') { feedbackRef.current = v; setAiApplied(false); setFeedbackError(null) }
  }

  const jobId  = initial.jobId || candidates.find(c=>c.id===candidateId)?.jobId
  const ti     = t.interviews
  const tc     = t.common
  const ratingOpts = [
    {v:'0',l:ti.noRating},{v:'1',l:'★ 1/5'},{v:'2',l:'★★ 2/5'},
    {v:'3',l:'★★★ 3/5'},{v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'},
  ]

  async function triggerImprove() {
    const text = feedbackRef.current
    if (!text || text.trim().length < 15 || improving) return
    setImproving(true); setFeedbackError(null)
    try {
      const improved = await improveText(text, lang)
      if (improved) { setF(x=>({...x, feedback: improved})); feedbackRef.current = improved; setAiApplied(true) }
    } catch(e) {
      setFeedbackError(lang==='de' ? `KI-Fehler: ${e.message}` : `AI error: ${e.message}`)
    } finally { setImproving(false) }
  }

  return (
    <div className="card" style={{ marginBottom:12, background:'#FAFAF9' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={ti.type}     value={f.type}        onChange={v=>F('type',v)}        select={ti.types} />
        <Field label={ti.dateTime} value={f.scheduledAt} onChange={v=>F('scheduledAt',v)} type="datetime-local" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={ti.interviewer} value={f.interviewer}  onChange={v=>F('interviewer',v)} placeholder="Name" />
        <Field label={ti.statusLabel} value={f.ivStatus||'planned'} onChange={v=>F('ivStatus',v)} select={[{v:'planned',l:ti.statusPlanned},{v:'done',l:ti.statusDone},{v:'noshow',l:ti.statusNoShow}]} />
      </div>

      {/* Feedback field with AI improvement button */}
      <div className="field">
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
          <span>{ti.feedback}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {improving && (
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#7C3AED', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#7C3AED', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
                {lang==='de' ? 'KI verbessert…' : 'AI improving…'}
              </span>
            )}
            {aiApplied && !improving && (
              <span style={{ fontSize:10, color:'#10B981', fontWeight:600 }}>✦ {lang==='de' ? 'KI verbessert' : 'AI improved'}</span>
            )}
            <button type="button" onClick={triggerImprove}
              disabled={improving || !f.feedback || f.feedback.trim().length < 15}
              style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', border:'1px solid #C4B5FD', background:'#F0EEFF', color:'#5B21B6', fontFamily:'inherit', opacity:(!f.feedback || f.feedback.trim().length < 15) ? 0.4 : 1 }}>
              ✦ {lang==='de' ? 'Verbessern' : 'Improve'}
            </button>
          </div>
        </label>
        <textarea
          value={f.feedback}
          onChange={e => F('feedback', e.target.value)}
          placeholder={lang==='de' ? 'Gesprächsnotizen… (per Klick auf ✦ Verbessern)' : 'Interview notes… (click ✦ Improve to enhance)'}
          disabled={improving}
          style={{ opacity: improving ? 0.6 : 1, transition:'opacity .2s' }}
        />
        {feedbackError && <p style={{ fontSize:11, color:'#EF4444', marginTop:4 }}>{feedbackError}</p>}
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

export default function CandidatesView({ jobs, candidates, interviews, persistCandidates, persistInterviews, user, openCandidateId, onCandidateOpened }) {
  const { t, STATUS_DISPLAY, TYPE_DISPLAY, lang } = useT()
  const tc = t.common; const tca = t.candidates; const ti = t.interviews

  const [filter,         setFilter]         = useState('all')
  const [filterJob,      setFilterJob]      = useState('all')
  const [selected,       setSelected]       = useState(null)

  // Open a candidate when navigated here from another view (e.g. Job Postings)
  useEffect(() => {
    if (openCandidateId) {
      setSelected(openCandidateId)
      setShowForm(false); setEditCand(false)
      onCandidateOpened?.()
    }
  }, [openCandidateId])
  const [search,         setSearch]         = useState('')
  const [showForm,       setShowForm]       = useState(false)
  const [editCand,       setEditCand]       = useState(false)
  const [form,           setForm]           = useState(EMPTY)
  const [saving,         setSaving]         = useState(false)
  const [showStPicker,   setShowStPicker]   = useState(false)
  const [showIvForm,     setShowIvForm]     = useState(false)
  const [editingIvId,    setEditingIvId]    = useState(null)
  const [notesImproving, setNotesImproving] = useState(false)
  const [notesAiApplied, setNotesAiApplied] = useState(false)
  const [notesError,     setNotesError]     = useState(null)
  const [questions,      setQuestions]      = useState(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError,   setQuestionsError]   = useState(null)
  const [pendingResume,  setPendingResume]  = useState(null)  // { file, name } for new candidates
  const [cvExtracting,   setCvExtracting]   = useState(false)
  const [cvError,        setCvError]        = useState(null)
  const notesRef = useRef('')
  const cvInputRef = useRef()   // always holds the latest notes value, avoids stale closure

  const candidate = candidates.find(c=>c.id===selected)
  const filtered = candidates.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.email||'').toLowerCase().includes(q) ||
      (c.phone||'').toLowerCase().includes(q) ||
      (c.mobile||'').toLowerCase().includes(q) ||
      (jobs.find(j=>j.id===c.jobId)?.title||'').toLowerCase().includes(q)
    const matchStatus = filter==='all' || c.status===filter
    const matchJob    = filterJob==='all' || c.jobId===filterJob
    return matchSearch && matchStatus && matchJob
  })
  const F = (k,v) => {
    setForm(f=>({...f,[k]:v}))
    if (k==='notes') { notesRef.current = v; setNotesAiApplied(false); setNotesError(null) }
  }

  async function triggerNotesImprove() {
    const text = notesRef.current
    if (!text || text.trim().length < 15 || notesImproving) return
    setNotesImproving(true); setNotesError(null)
    try {
      const improved = await improveText(text, lang)
      if (improved) { setForm(f=>({...f, notes: improved})); notesRef.current = improved; setNotesAiApplied(true) }
    } catch(e) {
      console.error('OpenRouter notes error:', e)
      setNotesError(lang==='de' ? `KI-Fehler: ${e.message}` : `AI error: ${e.message}`)
    } finally { setNotesImproving(false) }
  }

  // ── Resume handlers ───────────────────────────────────────────────────────
  async function handleResumeChange(hasResume, resumeName) {
    const next = candidates.map(c => c.id===selected ? { ...c, hasResume, resumeName } : c)
    await persistCandidates(next)
  }

  // Called when ResumeUpload extracts structured data from CV
  async function handleDataExtracted(data) {
    if (!data || typeof data !== 'object') return
    const merge = {}
    const fields = ['firstName','lastName','email','phone','mobile','address','birthday','notes']
    fields.forEach(k => {
      const v = data[k]
      if (typeof v === 'string' && v.trim()) merge[k] = v.trim()
    })
    const next = candidates.map(c => c.id===selected ? { ...c, ...merge } : c)
    await persistCandidates(next)
    if (showForm && editCand) {
      setForm(f => ({ ...f, ...merge }))
      if (merge.notes) { notesRef.current = merge.notes; setNotesAiApplied(false) }
    }
  }

  // ── Interview question generation ─────────────────────────────────────────
  // Load existing questions when entering a candidate detail view
  const existingQuestions = candidate?.interviewQuestions || null

  async function handleGenerateQuestions() {
    const cand = candidates.find(c => c.id===selected)
    const job  = jobs.find(j => j.id===cand?.jobId)
    if (!job) return
    setQuestionsLoading(true); setQuestionsError(null)
    try {
      const result = await generateInterviewQuestions(job.title, job.desc, cand?.notes, lang)
      if (result) {
        setQuestions(result)
        // Persist to candidate so they don't need to be regenerated
        const next = candidates.map(c => c.id===selected ? { ...c, interviewQuestions: result } : c)
        await persistCandidates(next)
      } else throw new Error(lang==='de' ? 'Keine Fragen generiert' : 'No questions generated')
    } catch(e) {
      setQuestionsError(lang==='de' ? `Fehler: ${e.message}` : `Error: ${e.message}`)
    } finally { setQuestionsLoading(false) }
  }

  async function handleSave() {
    if (!form.firstName.trim()||!form.lastName.trim()) return
    setSaving(true)
    const newId = editCand ? selected : crypto.randomUUID()
    const next = editCand
      ? candidates.map(c=>c.id===selected?{...c,...form}:c)
      : [...candidates,{ ...form, id:newId, photo:null,
          hasResume: !!pendingResume,
          resumeName: pendingResume?.name || null,
          createdAt:new Date().toISOString().split('T')[0] }]
    await persistCandidates(next)
    // Save pending resume for new candidates
    if (!editCand && pendingResume) {
      try {
        const buf = await pendingResume.file.arrayBuffer()
        await saveResume(newId, buf, pendingResume.name)
      } catch(e) { console.error('Resume save error:', e) }
    }
    setShowForm(false); setEditCand(false); setForm(EMPTY)
    setPendingResume(null); setCvError(null); setSaving(false)
  }

  function startEdit() {
    const notes = candidate.notes||''
    setForm({ firstName:candidate.firstName, lastName:candidate.lastName, email:candidate.email,
              phone:candidate.phone, jobId:candidate.jobId, status:candidate.status,
              notes, appliedAt:candidate.appliedAt||'' })
    notesRef.current = notes
    setNotesAiApplied(false); setNotesError(null)
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
    const normalised = { ...data, ivStatus: data.ivStatus||'planned', done: (data.ivStatus||'planned')==='done' }
    const next = isNew
      ? [...interviews,{...normalised,id:crypto.randomUUID(),candidateId:selected,createdAt:new Date().toISOString()}]
      : interviews.map(i=>i.id===editingIvId?{...i,...normalised}:i)
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
    async function handleCvFile(e) {
      const file = e.target.files?.[0]
      if (!file) return
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['pdf','docx'].includes(ext)) { setCvError(lang==='de'?'Nur PDF oder DOCX.':'Only PDF or DOCX.'); return }
      setPendingResume({ file, name: file.name }); setCvError(null)
    }

    async function handleCvExtract() {
      if (!pendingResume) return
      setCvExtracting(true); setCvError(null)
      try {
        const text = await extractText(pendingResume.file)
        if (!text || text.trim().length < 50) throw new Error(lang==='de'?'Text konnte nicht gelesen werden':'Could not read text from file')
        const data = await extractCandidateInfo(text, lang)
        if (!data || typeof data !== 'object') throw new Error(lang==='de'?'KI konnte keine Daten extrahieren':'AI could not extract data')
        const fields = ['firstName','lastName','email','phone','mobile','address','birthday','notes']
        fields.forEach(k => {
          const v = data[k]
          if (typeof v === 'string' && v.trim()) {
            const val = v.trim()
            setForm(f=>({...f,[k]:val}))
            if (k==='notes') notesRef.current = val
          }
        })
      } catch(e) { setCvError(`${lang==='de'?'Fehler':'Error'}: ${e.message}`) }
      finally { setCvExtracting(false) }
    }

    return (
    <div className="card" style={{ marginBottom:16 }}>
      <h3 style={{ marginBottom:16 }}>{title}</h3>

      {/* CV upload & extract — before filling the form manually */}
      <div style={{ marginBottom:16, padding:'12px 14px', background:'#FAFAF9', border:'1px solid #EBEBEA', borderRadius:9 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Icon name="upload" size={13} color="#888" />
          <span style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.05em' }}>
            {lang==='de' ? 'Lebenslauf importieren (optional)' : 'Import Resume (optional)'}
          </span>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
          <button type="button" className="btn btn-sm" onClick={() => cvInputRef.current?.click()}>
            <Icon name="upload" size={12} color="#555" />
            {pendingResume ? pendingResume.name : (lang==='de'?'PDF / DOCX wählen':'Choose PDF / DOCX')}
          </button>
          <input ref={cvInputRef} type="file" accept=".pdf,.docx" style={{ display:'none' }} onChange={handleCvFile} />
          {pendingResume && (
            <button type="button" onClick={handleCvExtract} disabled={cvExtracting}
              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid #C4B5FD', background:'#F0EEFF', color:'#5B21B6', fontFamily:'inherit' }}>
              {cvExtracting
                ? <><span style={{ width:7,height:7,borderRadius:'50%',background:'#7C3AED',display:'inline-block',animation:'pulse 1s ease-in-out infinite' }}/>{lang==='de'?'Extrahiere…':'Extracting…'}</>
                : <><Icon name="star" size={12} color="#7C3AED"/>{lang==='de'?'Felder befüllen':'Fill Fields'}</>}
            </button>
          )}
          {pendingResume && (
            <button type="button" className="btn btn-sm" style={{ color:'#aaa', border:'none' }} onClick={() => { setPendingResume(null); setCvError(null) }}>
              <Icon name="x" size={12} color="#aaa" />
            </button>
          )}
        </div>
        {cvError && <p style={{ fontSize:11, color:'#EF4444', marginTop:6 }}>{cvError}</p>}
        <p style={{ fontSize:10, color:'#bbb', marginTop:6 }}>{lang==='de'?'Das Dokument wird nach dem Speichern verschlüsselt hinterlegt.':'The file will be stored encrypted after saving.'}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={tca.firstName} value={form.firstName} onChange={v=>F('firstName',v)} placeholder={tca.firstName} />
        <Field label={tca.lastName}  value={form.lastName}  onChange={v=>F('lastName',v)}  placeholder={tca.lastName} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={tca.email}  value={form.email}  onChange={v=>F('email',v)}  placeholder="email@..." />
        <Field label={tca.phone}  value={form.phone}  onChange={v=>F('phone',v)}  placeholder="+43 ..." />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label={lang==='de'?'Mobil':'Mobile'} value={form.mobile||''} onChange={v=>F('mobile',v)} placeholder="+43 ..." />
        <DateField label={lang==='de'?'Geburtsdatum':'Birthday'} value={form.birthday||''} onChange={v=>F('birthday',v)} />
      </div>
      <Field label={lang==='de'?'Adresse':'Address'} value={form.address||''} onChange={v=>F('address',v)} placeholder={lang==='de'?'Straße, PLZ Ort':'Street, ZIP City'} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <DateField label={tca.appliedAt} value={form.appliedAt} onChange={v=>F('appliedAt',v)} />
        <Field label={tca.job}   value={form.jobId}  onChange={v=>F('jobId',v)}  select={jobs.map(j=>({v:j.id,l:j.location?`${j.title} (${j.location})`:j.title}))} />
      </div>
      <Field label={tca.status} value={form.status} onChange={v=>F('status',v)} select={STATUSES.map(s=>({v:s,l:STATUS_DISPLAY[s]||s}))} />

      {/* Notes with AI improvement */}
      <div className="field">
        <label style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
          <span>{tca.notes}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {notesImproving && (
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#7C3AED', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#7C3AED', display:'inline-block', animation:'pulse 1s ease-in-out infinite' }} />
                {lang==='de' ? 'KI verbessert…' : 'AI improving…'}
              </span>
            )}
            {notesAiApplied && !notesImproving && (
              <span style={{ fontSize:10, color:'#10B981', fontWeight:600 }}>✦ {lang==='de' ? 'KI verbessert' : 'AI improved'}</span>
            )}
            <button
              type="button"
              onClick={triggerNotesImprove}
              disabled={notesImproving || !form.notes || form.notes.trim().length < 15}
              style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', border:'1px solid #C4B5FD', background:'#F0EEFF', color:'#5B21B6', fontFamily:'inherit', opacity: (!form.notes || form.notes.trim().length < 15) ? 0.4 : 1 }}>
              ✦ {lang==='de' ? 'Verbessern' : 'Improve'}
            </button>
          </div>
        </label>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        <textarea
          value={form.notes}
          onChange={e => F('notes', e.target.value)}
          placeholder={lang==='de' ? 'Erste Eindrücke… (per Klick auf ✦ Verbessern)' : 'First impressions… (click ✦ Improve to enhance)'}
          disabled={notesImproving}
          style={{ opacity: notesImproving ? 0.6 : 1, transition:'opacity .2s' }}
        />
        {notesError && <p style={{ fontSize:11, color:'#EF4444', marginTop:4 }}>{notesError}</p>}
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
                  {candidate.mobile   && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="phone"     size={12} color="#ccc" />{candidate.mobile}</span>}
                  {candidate.address  && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="target"    size={12} color="#ccc" />{candidate.address}</span>}
                  {candidate.birthday && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="calendar"  size={12} color="#ccc" />{candidate.birthday}</span>}
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

        {/* Resume upload panel */}
        {!editCand && (
          <div style={{ marginBottom:16 }}>
            <ResumeUpload
              candidateId={selected}
              hasResume={!!candidate.hasResume}
              onResumeChange={handleResumeChange}
              onDataExtracted={handleDataExtracted}
            />
          </div>
        )}

        {/* Interview preparation — question generator */}
        {!editCand && (
          <div style={{ marginBottom:16, background:'#FAFAF9', border:'1px solid #EBEBEA', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Icon name="calendar" size={14} color="#888" />
                <span style={{ fontSize:12, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.05em' }}>
                  {lang==='de' ? 'Interview-Vorbereitung' : 'Interview Preparation'}
                </span>
                {existingQuestions && !questions && (
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:'#ECFDF5', color:'#065F46', fontWeight:600 }}>
                    ✓ {lang==='de' ? 'Gespeichert' : 'Saved'}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:7 }}>
                {existingQuestions && !questions && (
                  <button onClick={() => setQuestions(existingQuestions)}
                    style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #EBEBEA', background:'#fff', fontFamily:'inherit' }}>
                    {lang==='de' ? 'Anzeigen' : 'Show saved'}
                  </button>
                )}
                <button
                  onClick={handleGenerateQuestions}
                  disabled={questionsLoading || !jobs.find(j=>j.id===candidate.jobId)}
                  style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid #C4B5FD', background:'#F0EEFF', color:'#5B21B6', fontFamily:'inherit', opacity:questionsLoading?0.7:1 }}>
                  {questionsLoading
                    ? <><span style={{ width:7,height:7,borderRadius:'50%',background:'#7C3AED',display:'inline-block',animation:'pulse 1s ease-in-out infinite' }}/>{lang==='de'?'Generiere…':'Generating…'}</>
                    : <><Icon name="star" size={13} color="#7C3AED"/>{existingQuestions ? (lang==='de'?'Neu generieren':'Regenerate') : (lang==='de'?'Fragen generieren':'Generate Questions')}</>}
                </button>
              </div>
            </div>

            {questionsError && <p style={{ marginTop:8, fontSize:11, color:'#EF4444' }}>{questionsError}</p>}

            {(questions || (existingQuestions && questions)) && (
              <div style={{ marginTop:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:11, color:'#888' }}>
                    {jobs.find(j=>j.id===candidate.jobId)?.title}
                  </span>
                  <button onClick={() => navigator.clipboard?.writeText(questions||existingQuestions)}
                    style={{ fontSize:11, color:'#1A56DB', background:'none', border:'none', cursor:'pointer', padding:'2px 6px' }}>
                    {lang==='de' ? '📋 Kopieren' : '📋 Copy all'}
                  </button>
                </div>
                <div style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:8, padding:'12px 14px' }}>
                  {(questions||existingQuestions).split('\n').filter(l=>l.trim()).map((line, i, arr) => (
                    <p key={i} style={{ fontSize:13, color:'#1A1A1A', lineHeight:1.7, marginBottom:i<arr.length-1?8:0 }}>{line}</p>
                  ))}
                </div>
                <button onClick={() => setQuestions(null)} style={{ marginTop:6, fontSize:11, color:'#aaa', background:'none', border:'none', cursor:'pointer' }}>
                  {lang==='de' ? 'Verbergen' : 'Hide'}
                </button>
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
                  {(() => {
                    const s = getIvStatus(iv)
                    const bg  = s==='done'?'#ECFDF5':s==='noshow'?'#FEF2F2':'#EBF4FF'
                    const ico = s==='done'?'check':s==='noshow'?'x':'clock'
                    const col = s==='done'?'#10B981':s==='noshow'?'#EF4444':'#3B82F6'
                    return <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, marginTop:1, background:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name={ico} size={14} color={col} />
                    </div>
                  })()}
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{TYPE_DISPLAY[iv.type]||iv.type}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {(() => {
                          const s = getIvStatus(iv)
                          const bg  = s==='done'?'#ECFDF5':s==='noshow'?'#FEF2F2':'#EBF4FF'
                          const col = s==='done'?'#065F46':s==='noshow'?'#991B1B':'#1A56DB'
                          const lbl = s==='done'?ti.statusDone:s==='noshow'?ti.statusNoShow:ti.statusPlanned
                          return <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600, background:bg, color:col }}>{lbl}</span>
                        })()}
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

      {/* Search bar */}
      <div style={{ position:'relative', marginBottom:14 }}>
        <Icon name="search" size={14} color="#bbb" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder={lang==='de' ? 'Name, E-Mail, Telefon, Stelle…' : 'Name, email, phone, position…'}
          style={{ width:'100%', padding:'9px 12px 9px 36px', border:'1px solid #EBEBEA', borderRadius:9, fontSize:13, background:'#fff', fontFamily:'inherit' }}
        />
        {search && (
          <button onClick={()=>setSearch('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', color:'#aaa', display:'flex' }}>
            <Icon name="x" size={14} color="#bbb" />
          </button>
        )}
      </div>

      {/* Filters — job dropdown + status chips */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
        {/* Job dropdown */}
        {jobs.length > 0 && (
          <select value={filterJob} onChange={e=>setFilterJob(e.target.value)} style={{
            padding:'5px 28px 5px 10px', borderRadius:8, fontSize:12, border:'1px solid #EBEBEA',
            background:'#fff', cursor:'pointer', color: filterJob==='all'?'#888':'#1A1A1A',
            fontWeight: filterJob==='all'?400:600, fontFamily:'inherit', appearance:'none',
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E")`,
            backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
          }}>
            <option value="all">{lang==='de'?'Alle Stellen':'All Positions'}</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}{j.location?` (${j.location})`:''}</option>
            ))}
          </select>
        )}
        {/* Status chips */}
        {['all',...STATUSES].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'4px 12px', borderRadius:100, fontSize:12, fontWeight:filter===f?600:400,
            cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
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
