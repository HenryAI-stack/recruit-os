// src/views/InterviewsView.jsx
import { useState } from 'react'
import Badge    from '../components/Badge.jsx'
import Icon     from '../components/Icon.jsx'
import { useT } from '../lib/i18n.jsx'

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

export default function InterviewsView({ jobs, candidates, interviews, persistInterviews }) {
  const { t } = useT()
  const ti = t.interviews; const tc = t.common

  const [editingId, setEditingId] = useState(null)
  const [editForm,  setEditForm]  = useState({})
  const [saving,    setSaving]    = useState(false)

  const planned   = interviews.filter(i=>!i.done)
  const completed = interviews.filter(i=> i.done)
  const F = (k,v) => setEditForm(f=>({...f,[k]:v}))

  function startEdit(iv) {
    setEditForm({ type:iv.type, scheduledAt:iv.scheduledAt||'', interviewer:iv.interviewer||'', done:iv.done, feedback:iv.feedback||'', rating:iv.rating||0 })
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
    {v:'3',l:'★★★ 3/5'},{v:'4',l:'★★★★ 4/5'},{v:'5',l:'★★★★★ 5/5'}
  ]

  function IvCard({ iv }) {
    const c = candidates.find(x=>x.id===iv.candidateId)
    const j = jobs.find(x=>x.id===iv.jobId)
    if (!c) return null
    const name      = `${c.firstName} ${c.lastName}`
    const isEditing = editingId===iv.id

    return (
      <div style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, marginBottom:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
          <Avatar name={name} photo={c.photo} size={36} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, fontWeight:700 }}>{name}</span>
              <span style={{ fontSize:12, color:'#888' }}>— {iv.type}</span>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'#aaa', marginTop:3 }}>
              {j && <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="briefcase" size={11} color="#ccc" />{j.title}</span>}
              <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="calendar"  size={11} color="#ccc" />{iv.scheduledAt?.replace('T',' ').slice(0,16)||tc.noData}</span>
              <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="users"     size={11} color="#ccc" />{iv.interviewer||tc.noData}</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Badge status={c.status} />
            <span style={{ fontSize:11, padding:'2px 8px', borderRadius:100, fontWeight:600, background:iv.done?'#ECFDF5':'#EBF4FF', color:iv.done?'#065F46':'#1A56DB' }}>
              {iv.done ? ti.statusDone : ti.statusPlanned}
            </span>
            <button className="btn btn-ghost btn-icon" onClick={() => isEditing ? setEditingId(null) : startEdit(iv)}>
              <Icon name={isEditing?'x':'edit'} size={14} color="#aaa" />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(iv.id)}>
              <Icon name="trash" size={14} color="#f87171" />
            </button>
          </div>
        </div>

        {!isEditing && iv.feedback && (
          <div style={{ padding:'0 16px 12px', borderTop:'1px solid #F3F3F1' }}>
            <p style={{ fontSize:12,color:'#555',padding:'8px 10px',background:'#F7F7F5',borderRadius:8,lineHeight:1.65,marginTop:10 }}>{iv.feedback}</p>
            {iv.rating>0 && <p style={{ color:'#F59E0B',fontSize:12,marginTop:5 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
          </div>
        )}

        {isEditing && (
          <div style={{ padding:'14px 16px', borderTop:'1px solid #EBEBEA', background:'#FAFAF9' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label={ti.type}        value={editForm.type}        onChange={v=>F('type',v)}        select={ti.types} />
              <Field label={ti.dateTime}    value={editForm.scheduledAt} onChange={v=>F('scheduledAt',v)} type="datetime-local" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label={ti.interviewer} value={editForm.interviewer} onChange={v=>F('interviewer',v)} placeholder="Name" />
              <Field label={ti.statusLabel} value={editForm.done?'1':'0'} onChange={v=>F('done',v==='1')} select={[{v:'0',l:ti.statusPlanned},{v:'1',l:ti.statusDone}]} />
            </div>
            <Field label={ti.feedback} value={editForm.feedback} onChange={v=>F('feedback',v)} multiline />
            <Field label={ti.rating}   value={String(editForm.rating)} onChange={v=>F('rating',Number(v))} select={ratingOpts} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-sm" onClick={() => setEditingId(null)}>{tc.cancel}</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                <Icon name="save" size={13} color="#fff" />{saving?tc.saving:tc.save}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{ti.title}</h1>
          <p className="page-sub">{ti.subtitle.replace('{planned}',planned.length).replace('{done}',completed.length)}</p>
        </div>
      </div>

      {interviews.length===0 && (
        <div style={{ textAlign:'center', padding:'70px 0', color:'#ccc' }}>
          <Icon name="calendar" size={40} color="#ddd" style={{ margin:'0 auto 14px', display:'block' }} />
          <p style={{ fontSize:14, fontWeight:500, color:'#bbb' }}>{ti.noInterviews}</p>
          <p style={{ fontSize:13, marginTop:6 }}>{ti.noInterviewsSub}</p>
        </div>
      )}

      {planned.length>0 && (
        <div style={{ marginBottom:24 }}>
          <div className="section-header">
            <span className="section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="clock" size={14} color="#3B82F6" />{ti.planned}
            </span>
          </div>
          {planned.map(iv=><IvCard key={iv.id} iv={iv} />)}
        </div>
      )}

      {completed.length>0 && (
        <div>
          <div className="section-header">
            <span className="section-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="check" size={14} color="#10B981" />{ti.completed}
            </span>
          </div>
          {completed.map(iv=><IvCard key={iv.id} iv={iv} />)}
        </div>
      )}
    </div>
  )
}
