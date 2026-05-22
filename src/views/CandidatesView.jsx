// src/views/CandidatesView.jsx
import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import PhotoUpload from '../components/PhotoUpload.jsx'

const STATUSES = ['Eingegangen', 'Erstgespräch', 'Technisches Gespräch', 'Ausgewählt', 'Abgelehnt']
const EMPTY    = { firstName:'', lastName:'', email:'', phone:'', jobId:'', status:'Eingegangen', notes:'' }

const AVATAR_COLORS = [
  ['#B5D4F4','#0C447C'], ['#C0DD97','#173404'],
  ['#FAC775','#412402'], ['#CECBF6','#26215C'], ['#F4C0D1','#4B1528'],
]

function Avatar({ name, photo, size = 34 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2)
  const [bg, color] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:600, flexShrink:0 }}>{initials}</div>
}

export default function CandidatesView({ jobs, candidates, interviews, persistCandidates, persistInterviews }) {
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [showIvForm, setShowIvForm] = useState(false)
  const [ivForm, setIvForm] = useState({ type:'Erstgespräch', scheduledAt:'', interviewer:'', done:false, feedback:'', rating:0 })

  const candidate = candidates.find(c => c.id === selected)
  const filtered  = filter === 'all' ? candidates : candidates.filter(c => c.status === filter)

  // ── Add candidate ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) return
    setSaving(true)
    const next = [...candidates, { ...form, id: crypto.randomUUID(), photo: null, createdAt: new Date().toISOString().split('T')[0] }]
    await persistCandidates(next)
    setForm(EMPTY); setShowForm(false); setSaving(false)
  }

  // ── Save photo ────────────────────────────────────────────────────────────────
  async function handlePhoto(dataUrl) {
    const next = candidates.map(c => c.id === selected ? { ...c, photo: dataUrl } : c)
    await persistCandidates(next)
  }

  // ── Change status ─────────────────────────────────────────────────────────────
  async function handleStatus(status) {
    const next = candidates.map(c => c.id === selected ? { ...c, status } : c)
    await persistCandidates(next)
    setShowStatusPicker(false)
  }

  // ── Add interview ─────────────────────────────────────────────────────────────
  async function handleAddIv() {
    const next = [...interviews, {
      ...ivForm,
      id: crypto.randomUUID(),
      candidateId: selected,
      jobId: candidate?.jobId,
      createdAt: new Date().toISOString(),
    }]
    await persistInterviews(next)
    setIvForm({ type:'Erstgespräch', scheduledAt:'', interviewer:'', done:false, feedback:'', rating:0 })
    setShowIvForm(false)
  }

  // ── Detail view ───────────────────────────────────────────────────────────────
  if (selected && candidate) {
    const job  = jobs.find(j => j.id === candidate.jobId)
    const civs = interviews.filter(i => i.candidateId === selected)
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    const fullName = `${candidate.firstName} ${candidate.lastName}`

    return (
      <div>
        <button onClick={() => { setSelected(null); setShowStatusPicker(false); setShowIvForm(false) }} style={backBtn}>
          ← Zurück zu Bewerber
        </button>

        {/* Header card */}
        <div style={card}>
          <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>

            {/* Photo upload */}
            <PhotoUpload currentPhoto={candidate.photo} onSave={handlePhoto} />

            {/* Info */}
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
                <h2 style={{ fontSize:18, fontWeight:600 }}>{fullName}</h2>
                <Badge status={candidate.status} />
                <button onClick={() => setShowStatusPicker(v => !v)} style={btnSm}>Status ändern</button>
              </div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:12, color:'#78716c', marginBottom:8 }}>
                <span>✉ {candidate.email}</span>
                <span>📞 {candidate.phone}</span>
                {job && <span>💼 {job.title}</span>}
                <span style={{ color:'#aaa' }}>Seit {candidate.createdAt}</span>
              </div>
              {candidate.notes && (
                <p style={{ fontSize:12, color:'#555', padding:'8px 10px', background:'#f5f5f4', borderRadius:8, lineHeight:1.6 }}>
                  {candidate.notes}
                </p>
              )}
            </div>
          </div>

          {/* Status picker */}
          {showStatusPicker && (
            <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleStatus(s)} style={{
                  padding:'9px 12px',
                  border: candidate.status === s ? '2px solid #378ADD' : '1px solid #e5e5e3',
                  borderRadius:8,
                  background: candidate.status === s ? '#E6F1FB' : '#fff',
                  cursor:'pointer', textAlign:'left', fontSize:13,
                }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Interviews */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <h3 style={{ fontSize:14, fontWeight:600 }}>Gesprächsverlauf ({civs.length})</h3>
          <button onClick={() => setShowIvForm(v => !v)} style={btnPrimary}>+ Gespräch erfassen</button>
        </div>

        {showIvForm && (
          <div style={card}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Gesprächsart" value={ivForm.type} onChange={v => setIvForm({...ivForm, type:v})} select={['Erstgespräch','Technisches Gespräch','Fachgespräch','HR-Interview','Finalgespräch']} />
              <Field label="Datum & Uhrzeit" value={ivForm.scheduledAt} onChange={v => setIvForm({...ivForm, scheduledAt:v})} type="datetime-local" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Interviewer" value={ivForm.interviewer} onChange={v => setIvForm({...ivForm, interviewer:v})} placeholder="Name" />
              <Field label="Status" value={ivForm.done ? '1' : '0'} onChange={v => setIvForm({...ivForm, done:v==='1'})} select={[{v:'0',l:'Geplant'},{v:'1',l:'Abgeschlossen'}]} />
            </div>
            <Field label="Feedback & Notizen" value={ivForm.feedback} onChange={v => setIvForm({...ivForm, feedback:v})} placeholder="Gesprächsnotizen..." multiline />
            <Field label="Bewertung" value={String(ivForm.rating)} onChange={v => setIvForm({...ivForm, rating:Number(v)})} select={[{v:'0',l:'Keine'},{v:'1',l:'★ 1/5'},{v:'2',l:'★★ 2/5'},{v:'3',l:'★★★ 3/5'},{v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'}]} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowIvForm(false)} style={btnSm}>Abbrechen</button>
              <button onClick={handleAddIv} style={btnPrimary}>Speichern</button>
            </div>
          </div>
        )}

        {civs.length === 0 && !showIvForm && (
          <p style={{ color:'#aaa', fontSize:13 }}>Noch keine Gespräche erfasst.</p>
        )}

        {civs.map(iv => (
          <div key={iv.id} style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:iv.done?'#EAF3DE':'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, marginTop:2 }}>
              {iv.done ? '✓' : '⏱'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{iv.type}</span>
                <span style={{ fontSize:11, padding:'1px 8px', borderRadius:100, background:iv.done?'#EAF3DE':'#E6F1FB', color:iv.done?'#173404':'#0C447C' }}>
                  {iv.done ? '✓ Abgeschlossen' : '⏱ Geplant'}
                </span>
              </div>
              <p style={{ fontSize:12, color:'#78716c', marginTop:2 }}>👤 {iv.interviewer} · 📅 {iv.scheduledAt?.replace('T',' ').slice(0,16)}</p>
              {iv.feedback && <p style={{ fontSize:12, color:'#555', marginTop:8, padding:'8px 10px', background:'#f5f5f4', borderRadius:8, lineHeight:1.6 }}>{iv.feedback}</p>}
              {iv.rating > 0 && <p style={{ color:'#BA7517', fontSize:12, marginTop:4 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Bewerber</h1>
          <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>{candidates.length} Personen erfasst</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={btnPrimary}>+ Bewerber anlegen</button>
      </div>

      {showForm && (
        <div style={card}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Neuen Bewerber anlegen</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Vorname"  value={form.firstName} onChange={v => setForm({...form, firstName:v})} placeholder="Vorname" />
            <Field label="Nachname" value={form.lastName}  onChange={v => setForm({...form, lastName:v})}  placeholder="Nachname" />
          </div>
          <Field label="E-Mail"  value={form.email}  onChange={v => setForm({...form, email:v})}  placeholder="email@beispiel.at" />
          <Field label="Telefon" value={form.phone}  onChange={v => setForm({...form, phone:v})}  placeholder="+43 ..." />
          <Field label="Stelle"  value={form.jobId}  onChange={v => setForm({...form, jobId:v})}  select={jobs.map(j => ({v:j.id, l:j.title}))} />
          <Field label="Status"  value={form.status} onChange={v => setForm({...form, status:v})} select={STATUSES} />
          <Field label="Notizen" value={form.notes}  onChange={v => setForm({...form, notes:v})}  placeholder="Erste Eindrücke..." multiline />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={btnSm}>Abbrechen</button>
            <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? 'Speichern…' : 'Bewerber anlegen'}</button>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        {['all', ...STATUSES].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'4px 12px', borderRadius:100, fontSize:12, cursor:'pointer',
            border:  filter===f ? '1px solid #B5D4F4' : '1px solid #e5e5e3',
            background: filter===f ? '#E6F1FB' : '#fff',
            color:   filter===f ? '#0C447C' : '#78716c',
          }}>{f === 'all' ? 'Alle' : f}</button>
        ))}
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr>{['Name','Status','Stelle','E-Mail','Erfasst'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {filtered.map(c => {
            const j = jobs.find(x => x.id === c.jobId)
            return (
              <tr key={c.id} onClick={() => setSelected(c.id)} style={{ cursor:'pointer' }}
                onMouseOver={e => e.currentTarget.style.background='#f5f5f4'}
                onMouseOut={e =>  e.currentTarget.style.background=''}
              >
                <td style={td}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={28} />
                    {c.firstName} {c.lastName}
                  </div>
                </td>
                <td style={td}><Badge status={c.status} /></td>
                <td style={td}>{j?.title ?? '–'}</td>
                <td style={td}>{c.email}</td>
                <td style={td}>{c.createdAt}</td>
              </tr>
            )
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'#aaa' }}>Keine Bewerber in dieser Kategorie</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const card      = { background:'#fff', borderRadius:12, padding:'18px 20px', border:'1px solid #e5e5e3', marginBottom:16 }
const btnPrimary= { background:'#378ADD', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer', fontWeight:500 }
const btnSm     = { background:'#fff', color:'#333', border:'1px solid #e5e5e3', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }
const backBtn   = { background:'none', border:'none', color:'#78716c', cursor:'pointer', fontSize:13, marginBottom:18, padding:0 }
const th        = { textAlign:'left', padding:'8px 12px', fontSize:11, fontWeight:500, color:'#78716c', borderBottom:'1px solid #e5e5e3', textTransform:'uppercase', letterSpacing:'.04em' }
const td        = { padding:'10px 12px', borderBottom:'1px solid #e5e5e3' }

function Field({ label, value, onChange, placeholder, multiline, select, type }) {
  const s = { width:'100%', padding:'7px 10px', border:'1px solid #e5e5e3', borderRadius:8, fontSize:13, marginBottom:12, fontFamily:'inherit' }
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:500, color:'#78716c', marginBottom:5, textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</label>
      {select
        ? <select style={s} value={value} onChange={e => onChange(e.target.value)}>
            {select.map(o => typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.v} value={o.v}>{o.l}</option>
            )}
          </select>
        : multiline
          ? <textarea style={{...s, resize:'vertical', minHeight:72}} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
          : <input type={type||'text'} style={s} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}
