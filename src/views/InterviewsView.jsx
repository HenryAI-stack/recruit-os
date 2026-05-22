// src/views/InterviewsView.jsx
import Badge from '../components/Badge.jsx'

const AVATAR_COLORS = [
  ['#B5D4F4','#0C447C'], ['#C0DD97','#173404'],
  ['#FAC775','#412402'], ['#CECBF6','#26215C'], ['#F4C0D1','#4B1528'],
]
function Avatar({ name, size = 36 }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,2)
  const [bg, color] = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
  return <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:600, flexShrink:0 }}>{initials}</div>
}

export default function InterviewsView({ jobs, candidates, interviews }) {
  const planned   = interviews.filter(i => !i.done)
  const completed = interviews.filter(i =>  i.done)

  function IvCard({ iv }) {
    const c = candidates.find(x => x.id === iv.candidateId)
    const j = jobs.find(x => x.id === iv.jobId)
    if (!c) return null
    const name = `${c.firstName} ${c.lastName}`
    return (
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fff', border:'1px solid #e5e5e3', borderRadius:10, marginBottom:8 }}>
        <Avatar name={name} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:600 }}>{name} <span style={{ fontWeight:400, color:'#78716c' }}>— {iv.type}</span></p>
          <p style={{ fontSize:12, color:'#78716c', marginTop:2 }}>
            {j?.title ?? '–'} · 📅 {iv.scheduledAt?.replace('T',' ').slice(0,16)} · 👤 {iv.interviewer}
          </p>
          {iv.done && iv.feedback && <p style={{ fontSize:12, color:'#555', marginTop:6, padding:'6px 8px', background:'#f5f5f4', borderRadius:6, lineHeight:1.5 }}>{iv.feedback}</p>}
          {iv.done && iv.rating > 0 && <p style={{ color:'#BA7517', fontSize:12, marginTop:4 }}>{'★'.repeat(iv.rating)}{'☆'.repeat(5-iv.rating)}</p>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
          <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100, background: iv.done ? '#EAF3DE' : '#E6F1FB', color: iv.done ? '#173404' : '#0C447C', whiteSpace:'nowrap' }}>
            {iv.done ? '✓ Abgeschlossen' : '⏱ Geplant'}
          </span>
          <Badge status={c.status} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Gespräche</h1>
        <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>
          {planned.length} geplant · {completed.length} abgeschlossen
        </p>
      </div>

      {planned.length > 0 && (
        <>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#0C447C' }}>⏱ Geplante Gespräche</h2>
          {planned.map(iv => <IvCard key={iv.id} iv={iv} />)}
          <div style={{ height:24 }} />
        </>
      )}

      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:12, color:'#173404' }}>✓ Abgeschlossene Gespräche</h2>
          {completed.map(iv => <IvCard key={iv.id} iv={iv} />)}
        </>
      )}

      {interviews.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#aaa' }}>
          <p style={{ fontSize:32, marginBottom:12 }}>🗓</p>
          <p style={{ fontSize:14 }}>Noch keine Gespräche erfasst.</p>
          <p style={{ fontSize:13, marginTop:6 }}>Gespräche können bei jedem Bewerber unter „Gespräch erfassen" hinzugefügt werden.</p>
        </div>
      )}
    </div>
  )
}
