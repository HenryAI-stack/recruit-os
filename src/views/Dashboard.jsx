// src/views/Dashboard.jsx
import Badge from '../components/Badge.jsx'

export default function Dashboard({ jobs, candidates, interviews, onNavigate }) {
  const openJobs      = jobs.filter(j => j.isOpen).length
  const doneIv        = interviews.filter(i => i.done).length
  const selected      = candidates.filter(c => c.status === 'Ausgewählt').length
  const recent        = [...candidates].reverse().slice(0, 4)
  const upcoming      = interviews.filter(i => !i.done).slice(0, 4)

  const stat = (label, value, sub) => (
    <div style={{ background:'#fff', borderRadius:10, padding:'16px 18px', border:'1px solid #e5e5e3' }}>
      <div style={{ fontSize:11, color:'#78716c', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:600 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#aaa', marginTop:3 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:600 }}>Dashboard</h1>
        <p style={{ fontSize:13, color:'#78716c', marginTop:2 }}>Willkommen zurück. Hier ist Ihre aktuelle Übersicht.</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {stat('Offene Stellen',    openJobs,           `von ${jobs.length} gesamt`)}
        {stat('Bewerber',         candidates.length,   'im aktiven Prozess')}
        {stat('Gespräche geführt', doneIv,             `von ${interviews.length} gesamt`)}
        {stat('Ausgewählt',        selected,           'Kandidaten')}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Recent candidates */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h2 style={{ fontSize:14, fontWeight:600 }}>Neue Bewerber</h2>
            <button onClick={() => onNavigate('candidates')} style={{ fontSize:12, color:'#378ADD', background:'none', border:'none', cursor:'pointer' }}>Alle →</button>
          </div>
          {recent.map(c => {
            const j = jobs.find(x => x.id === c.jobId)
            return (
              <div key={c.id} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e5e5e3', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={`${c.firstName} ${c.lastName}`} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{c.firstName} {c.lastName}</div>
                  <div style={{ fontSize:11, color:'#78716c' }}>{j?.title ?? '–'}</div>
                </div>
                <Badge status={c.status} />
              </div>
            )
          })}
          {recent.length === 0 && <p style={{ fontSize:13, color:'#aaa' }}>Noch keine Bewerber</p>}
        </div>

        {/* Upcoming interviews */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h2 style={{ fontSize:14, fontWeight:600 }}>Geplante Gespräche</h2>
            <button onClick={() => onNavigate('interviews')} style={{ fontSize:12, color:'#378ADD', background:'none', border:'none', cursor:'pointer' }}>Alle →</button>
          </div>
          {upcoming.map(iv => {
            const c = candidates.find(x => x.id === iv.candidateId)
            return (
              <div key={iv.id} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e5e5e3', marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{c?.firstName} {c?.lastName}</div>
                <div style={{ fontSize:11, color:'#78716c', marginTop:3 }}>📅 {iv.scheduledAt} · {iv.type}</div>
                <div style={{ fontSize:11, color:'#aaa' }}>👤 {iv.interviewer}</div>
              </div>
            )
          })}
          {upcoming.length === 0 && <p style={{ fontSize:13, color:'#aaa' }}>Keine geplanten Gespräche</p>}
        </div>
      </div>
    </div>
  )
}

function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = [
    ['#B5D4F4','#0C447C'], ['#C0DD97','#173404'],
    ['#FAC775','#412402'], ['#CECBF6','#26215C'],
  ]
  const [bg, color] = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{ width:32, height:32, borderRadius:'50%', background:bg, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
      {initials}
    </div>
  )
}
