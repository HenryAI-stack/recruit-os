// src/views/Dashboard.jsx
import Badge    from '../components/Badge.jsx'
import Icon     from '../components/Icon.jsx'
import { useT } from '../lib/i18n.jsx'

const AV_COLORS = [['#EBF4FF','#1A56DB'],['#ECFDF5','#065F46'],['#FEF3C7','#92400E'],['#F0EEFF','#4C1D95'],['#FEF2F2','#991B1B']]
function Avatar({ name, photo, size=34 }) {
  if (photo) return <img src={photo} alt="" style={{ width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0 }} />
  const ini = name.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)
  const [bg,color] = AV_COLORS[name.charCodeAt(0)%AV_COLORS.length]
  return <div style={{ width:size,height:size,borderRadius:'50%',background:bg,color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.34,fontWeight:700,flexShrink:0 }}>{ini}</div>
}

export default function Dashboard({ jobs, candidates, interviews, onNavigate }) {
  const { t } = useT()
  const td = t.dashboard

  const openJobs = jobs.filter(j=>j.isOpen).length
  const doneIv   = interviews.filter(i=>i.done).length
  const selected = candidates.filter(c=>c.status==='Ausgewählt').length
  const recent   = [...candidates].reverse().slice(0,4)
  const upcoming = interviews.filter(i=>!i.done).slice(0,4)

  const stats = [
    { label:td.openJobs,    value:openJobs,          sub:td.ofTotal.replace('{n}',jobs.length),        icon:'briefcase' },
    { label:td.candidates,  value:candidates.length, sub:td.activeProcess,                              icon:'users'     },
    { label:td.interviews,  value:doneIv,            sub:td.ofTotal.replace('{n}',interviews.length),   icon:'calendar'  },
    { label:td.selected,    value:selected,          sub:td.candidates_plural,                          icon:'check', color:'#10B981' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{td.title}</h1>
          <p className="page-sub">{td.subtitle}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#999', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</span>
              <div style={{ width:32, height:32, borderRadius:8, background:'#F7F7F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={s.icon} size={16} color="#888" />
              </div>
            </div>
            <div style={{ fontSize:32, fontWeight:700, letterSpacing:'-1px', color:s.color||'#1A1A1A' }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#bbb', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* Recent candidates */}
        <div>
          <div className="section-header">
            <span className="section-title">{td.recentCandidates}</span>
            <button className="btn btn-sm" onClick={() => onNavigate('candidates')}>
              {td.viewAll} <Icon name="chevronRight" size={12} />
            </button>
          </div>
          <div style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            {recent.length === 0
              ? <p style={{ padding:20, fontSize:13, color:'#bbb', textAlign:'center' }}>{td.noRecentCandidates}</p>
              : recent.map((c,i) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 14px', borderBottom:i<recent.length-1?'1px solid #F3F3F1':'none' }}>
                  <Avatar name={`${c.firstName} ${c.lastName}`} photo={c.photo} size={32} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{jobs.find(j=>j.id===c.jobId)?.title??'–'}</div>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))
            }
          </div>
        </div>

        {/* Upcoming interviews */}
        <div>
          <div className="section-header">
            <span className="section-title">{td.upcomingInterviews}</span>
            <button className="btn btn-sm" onClick={() => onNavigate('interviews')}>
              {td.viewAll} <Icon name="chevronRight" size={12} />
            </button>
          </div>
          <div style={{ background:'#fff', border:'1px solid #EBEBEA', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            {upcoming.length === 0
              ? <p style={{ padding:20, fontSize:13, color:'#bbb', textAlign:'center' }}>{td.noUpcomingInterviews}</p>
              : upcoming.map((iv,i) => {
                  const c = candidates.find(x=>x.id===iv.candidateId)
                  return (
                    <div key={iv.id} style={{ padding:'11px 14px', borderBottom:i<upcoming.length-1?'1px solid #F3F3F1':'none' }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{c?.firstName} {c?.lastName}</div>
                      <div style={{ display:'flex', gap:10, fontSize:11, color:'#aaa', marginTop:3 }}>
                        <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="calendar" size={11} color="#ccc" />{iv.scheduledAt?.replace('T',' ').slice(0,16)}</span>
                        <span>{iv.type}</span>
                        <span style={{ display:'flex',alignItems:'center',gap:3 }}><Icon name="users" size={11} color="#ccc" />{iv.interviewer}</span>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>
    </div>
  )
}
