// src/views/CandidatesView.jsx
import { useState } from 'react'
import Badge       from '../components/Badge.jsx'
import Icon        from '../components/Icon.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'

const STATUSES = ['Eingegangen','Erstgespräch','Technisches Gespräch','Ausgewählt','Abgelehnt']
const EMPTY    = { firstName:'', lastName:'', email:'', phone:'', jobId:'', status:'Eingegangen', notes:'', appliedAt:'' }
const AV_COLORS= [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]

function Avatar({ name, photo, size=34 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
  const ini = name.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const [bg,color] = AV_COLORS[name.charCodeAt(0)%AV_COLORS.length]
  return <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,fontWeight:700,flexShrink:0 }}>{ini}</div>
}

function Field({ label, value, onChange, placeholder, multiline, select, type }) {
  return (
    <div className="field">
      <label>{label}</label>
      {select
        ? <select value={value} onChange={e=>onChange(e.target.value)}>
            {select.map(o => typeof o==='string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : multiline
          ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
          : <input type={type||'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}

// ── Shared interview form ───────────────────────────────────────────────────
function IvForm({ initial, jobs, candidateId, candidates, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const F = (k,v) => setF(x=>({...x,[k]:v}))
  const jobId = initial.jobId || candidates.find(c=>c.id===candidateId)?.jobId
  return (
    <div className="card" style={{ marginBottom:12, background:'#FAFAF9' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label="Gesprächsart"   value={f.type}        onChange={v=>F('type',v)}        select={['Erstgespräch','Technisches Gespräch','Fachgespräch','HR-Interview','Finalgespräch']} />
        <Field label="Datum & Uhrzeit" value={f.scheduledAt} onChange={v=>F('scheduledAt',v)} type="datetime-local" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <Field label="Interviewer" value={f.interviewer} onChange={v=>F('interviewer',v)} placeholder="Name" />
        <Field label="Status"      value={f.done?'1':'0'} onChange={v=>F('done',v==='1')}  select={[{v:'0',l:'Geplant'},{v:'1',l:'Abgeschlossen'}]} />
      </div>
      <Field label="Feedback & Notizen" value={f.feedback} onChange={v=>F('feedback',v)} placeholder="Gesprächsnotizen..." multiline />
      <Field label="Bewertung" value={String(f.rating)} onChange={v=>F('rating',Number(v))} select={[{v:'0',l:'Keine Bewertung'},{v:'1',l:'★ 1/5'},{v:'2',l:'★★ 2/5'},{v:'3',l:'★★★ 3/5'},{v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'}]} />
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button className="btn btn-sm" onClick={onCancel}>Abbrechen</button>
        <button className="btn btn-primary btn-sm" onClick={() => onSave({...f, jobId})}>
          <Icon name="save" size={13} color="#fff" />Speichern
        </button>
      </div>
    </div>
  )
}

const IV_EMPTY = { type:'Erstgespräch', scheduledAt:'', interviewer:'', done:false, feedback:'', rating:0 }

export default function CandidatesView({ jobs, candidates, interviews, persistCandidates, persistInterviews }) {
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editCand, setEditCand] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [showStPicker, setShowStPicker] = useState(false)
  const [showIvForm,   setShowIvForm]   = useState(false)
  const [editingIvId,  setEditingIvId]  = useState(null)

  const candidate = candidates.find(c=>c.id===selected)
  const filtered  = filter==='all' ? candidates : candidates.filter(c=>c.status===filter)
  const F         = (k,v) => setForm(f=>({...f,[k]:v}))

  // ── Save candidate (add or edit) ──────────────────────────────────────────
  async function handleSave() {
    if (!form.firstName.trim()||!form.lastName.trim()) return
    setSaving(true)
    const next = editCand
      ? candidates.map(c => c.id===selected ? { ...c, ...form } : c)
      : [...candidates, { ...form, id:crypto.randomUUID(), photo:null, createdAt:new Date().toISOString().split('T')[0] }]
    await persistCandidates(next)
    setShowForm(false); setEditCand(false); setForm(EMPTY); setSaving(false)
  }

  function startEdit() {
    setForm({ firstName:candidate.firstName, lastName:candidate.lastName, email:candidate.email,
              phone:candidate.phone, jobId:candidate.jobId, status:candidate.status,
              notes:candidate.notes||'', appliedAt:candidate.appliedAt||'' })
    setEditCand(true); setShowForm(true)
  }

  async function handlePhoto(dataUrl) {
    await persistCandidates(candidates.map(c=>c.id===selected?{...c,photo:dataUrl}:c))
  }
  async function handleStatus(status) {
    await persistCandidates(candidates.map(c=>c.id===selected?{...c,status}:c))
    setShowStPicker(false)
  }

  // ── Save interview (add or edit) ──────────────────────────────────────────
  async function handleSaveIv(data) {
    const next = editingIvId
      ? interviews.map(i => i.id===editingIvId ? { ...i, ...data } : i)
      : [...interviews, { ...data, id:crypto.randomUUID(), candidateId:selected, createdAt:new Date().toISOString() }]
    await persistInterviews(next)
    setShowIvForm(false); setEditingIvId(null)
  }

  async function handleDeleteIv(id) {
    if (!window.confirm('Gespräch löschen?')) return
    await persistInterviews(interviews.filter(i=>i.id!==id))
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selected && candidate) {
    const job  = jobs.find(j=>j.id===candidate.jobId)
    const civs = interviews.filter(i=>i.candidateId===selected).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
    const editingIv = interviews.find(i=>i.id===editingIvId)

    return (
      <div>
        <button className="btn btn-sm" onClick={() => { setSelected(null); setShowForm(false); setEditCand(false); setShowIvForm(false); setEditingIvId(null) }} style={{ marginBottom:20 }}>
          <Icon name="arrowLeft" size={14} />Zurück
        </button>

        {/* Edit form */}
        {showForm && editCand && (
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ marginBottom:16 }}>Bewerber bearbeiten</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Vorname"  value={form.firstName} onChange={v=>F('firstName',v)} placeholder="Vorname" />
              <Field label="Nachname" value={form.lastName}  onChange={v=>F('lastName',v)}  placeholder="Nachname" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="E-Mail"   value={form.email}     onChange={v=>F('email',v)}     placeholder="email@..." />
              <Field label="Telefon"  value={form.phone}     onChange={v=>F('phone',v)}     placeholder="+43 ..." />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Bewerbungsdatum" value={form.appliedAt} onChange={v=>F('appliedAt',v)} type="date" />
              <Field label="Stelle"          value={form.jobId}    onChange={v=>F('jobId',v)}     select={jobs.map(j=>({v:j.id,l:j.title}))} />
            </div>
            <Field label="Status" value={form.status} onChange={v=>F('status',v)} select={STATUSES} />
            <Field label="Notizen" value={form.notes} onChange={v=>F('notes',v)} placeholder="Anmerkungen..." multiline />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-sm" onClick={() => { setShowForm(false); setEditCand(false) }}>Abbrechen</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Icon name="save" size={13} color="#fff" />{saving?'Speichern…':'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Candidate header */}
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
                  {candidate.email    && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="mail"     size={12} color="#ccc" />{candidate.email}</span>}
                  {candidate.phone    && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="phone"    size={12} color="#ccc" />{candidate.phone}</span>}
                  {job                && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="briefcase" size={12} color="#ccc" />{job.title}</span>}
                  {candidate.appliedAt && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Icon name="calendar" size={12} color="#ccc" />Beworben am {candidate.appliedAt}</span>}
                </div>
                {candidate.notes && <p style={{ fontSize:12,color:'#666',padding:'8px 10px',background:'#F7F7F5',borderRadius:8,lineHeight:1.65 }}>{candidate.notes}</p>}
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button className="btn btn-sm" onClick={startEdit}><Icon name="edit" size={13} />Bearbeiten</button>
                <button className="btn btn-sm" onClick={() => setShowStPicker(v=>!v)}>Status ändern</button>
              </div>
            </div>
            {/* Status picker */}
            {showStPicker && (
              <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:7 }}>
                {STATUSES.map(s => (
                  <button key={s} onClick={()=>handleStatus(s)} style={{
                    padding:'8px 10px', border: candidate.status===s ? '2px solid #1A1A1A' : '1px solid #EBEBEA',
                    borderRadius:8, background: candidate.status===s ? '#F0F0EE' : '#fff',
                    cursor:'pointer', fontSize:12, fontWeight: candidate.status===s ? 600 : 400, fontFamily:'inherit',
                  }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interviews */}
        <div className="section-header">
          <span className="section-title">Gesprächsverlauf ({civs.length})</span>
          {!showIvForm && !editingIvId && (
            <button className="btn btn-primary btn-sm" onClick={() => { setShowIvForm(true); setEditingIvId(null) }}>
              <Icon name="plus" size={13} color="#fff" />Gespräch erfassen
            </button>
          )}
        </div>

        {showIvForm && !editingIvId && (
          <IvForm initial={IV_EMPTY} jobs={jobs} candidateId={selected} candidates={candidates}
            onSave={handleSaveIv} onCancel={() => setShowIvForm(false)} />
        )}

        {civs.length===0 && !showIvForm && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'#ccc' }}>
            <Icon name="calendar" size={32} color="#ddd" style={{ margin:'0 auto 10px', display:'block' }} />
            <p style={{ fontSize:13 }}>Noch keine Gespräche erfasst</p>
          </div>
        )}

        {civs.map(iv => (
          <div key={iv.id}>
            {editingIvId===iv.id
              ? <IvForm initial={editingIv||IV_EMPTY} jobs={jobs} candidateId={selected} candidates={candidates}
                  onSave={handleSaveIv} onCancel={()=>setEditingIvId(null)} />
              : (
                <div style={{ display:'flex', gap:12, marginBottom:14, padding:'14px 16px', background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, marginTop:1,
                    background: iv.done ? '#ECFDF5' : '#EBF4FF',
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={iv.done?'check':'clock'} size={14} color={iv.done?'#10B981':'#3B82F6'} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{iv.type}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600,
                          background: iv.done?'#ECFDF5':'#EBF4FF', color: iv.done?'#065F46':'#1A56DB' }}>
                          {iv.done?'Abgeschlossen':'Geplant'}
                        </span>
                        <button className="btn btn-ghost btn-icon" title="Bearbeiten" onClick={() => { setEditingIvId(iv.id); setShowIvForm(false) }}>
                          <Icon name="edit" size={13} color="#aaa" />
                        </button>
                        <button className="btn btn-ghost btn-icon" title="Löschen" onClick={() => handleDeleteIv(iv.id)}>
                          <Icon name="trash" size={13} color="#f87171" />
                        </button>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'#aaa', marginTop:4 }}>
                      <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="users" size={11} color="#ccc" />{iv.interviewer}</span>
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

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bewerber</h1>
          <p className="page-sub">{candidates.length} Personen erfasst</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setEditCand(false); setShowForm(v=>!v) }}>
          <Icon name="plus" size={14} color="#fff" />Bewerber anlegen
        </button>
      </div>

      {showForm && !editCand && (
        <div className="card" style={{ marginBottom:18 }}>
          <h3 style={{ marginBottom:16 }}>Neuen Bewerber anlegen</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Vorname"  value={form.firstName} onChange={v=>F('firstName',v)} placeholder="Vorname" />
            <Field label="Nachname" value={form.lastName}  onChange={v=>F('lastName',v)}  placeholder="Nachname" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="E-Mail"   value={form.email}     onChange={v=>F('email',v)}     placeholder="email@beispiel.at" />
            <Field label="Telefon"  value={form.phone}     onChange={v=>F('phone',v)}     placeholder="+43 ..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Bewerbungsdatum" value={form.appliedAt} onChange={v=>F('appliedAt',v)} type="date" />
            <Field label="Stelle"          value={form.jobId}    onChange={v=>F('jobId',v)}     select={jobs.map(j=>({v:j.id,l:j.title}))} />
          </div>
          <Field label="Status" value={form.status} onChange={v=>F('status',v)} select={STATUSES} />
          <Field label="Notizen" value={form.notes} onChange={v=>F('notes',v)} placeholder="Erste Eindrücke..." multiline />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-sm" onClick={() => setShowForm(false)}>Abbrechen</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              <Icon name="save" size={13} color="#fff" />{saving?'Speichern…':'Bewerber anlegen'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
        {['all',...STATUSES].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'4px 12px', borderRadius:100, fontSize:12, fontWeight:filter===f?600:400, cursor:'pointer', fontFamily:'inherit',
            border: filter===f?'1px solid #1A1A1A':'1px solid #EBEBEA',
            background: filter===f?'#1A1A1A':'#fff',
            color: filter===f?'#fff':'#888',
          }}>{f==='all'?'Alle':f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Status</th><th>Stelle</th><th>Beworben am</th><th>E-Mail</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={()=>setSelected(c.id)}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={30} />
                    <span style={{ fontWeight:500 }}>{c.firstName} {c.lastName}</span>
                  </div>
                </td>
                <td><Badge status={c.status} /></td>
                <td style={{ color:'#888' }}>{jobs.find(j=>j.id===c.jobId)?.title??'–'}</td>
                <td style={{ color:'#888' }}>{c.appliedAt||'–'}</td>
                <td style={{ color:'#888' }}>{c.email}</td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={5} style={{ textAlign:'center', padding:28, color:'#ccc' }}>Keine Bewerber in dieser Kategorie</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
