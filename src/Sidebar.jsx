// src/components/Sidebar.jsx
const NAV = [
  { view: 'dashboard',   label: 'Dashboard',       icon: '⊞' },
  { view: 'jobs',        label: 'Stellenangebote',  icon: '💼' },
  { view: 'candidates',  label: 'Bewerber',         icon: '👥' },
  { view: 'interviews',  label: 'Gespräche',        icon: '🗓' },
]

export default function Sidebar({ view, onNavigate, user, onLogout }) {
  return (
    <aside style={{
      width: 220, minWidth: 220, background: '#fff',
      borderRight: '1px solid #e5e5e3', display: 'flex',
      flexDirection: 'column', padding: '18px 0',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #e5e5e3', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#378ADD', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎯</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>RecruitOS</div>
            <div style={{ fontSize: 10, color: '#888' }}>Applicant Tracking</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      {NAV.map(n => (
        <button key={n.view} onClick={() => onNavigate(n.view)} style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 16px', border: 'none', background: 'none',
          textAlign: 'left', cursor: 'pointer', fontSize: 13,
          color: view === n.view ? '#1c1917' : '#78716c',
          fontWeight: view === n.view ? 600 : 400,
          borderRight: view === n.view ? '2px solid #378ADD' : '2px solid transparent',
          transition: 'all .15s',
        }}>
          <span>{n.icon}</span> {n.label}
        </button>
      ))}

      {/* User */}
      <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid #e5e5e3', display: 'flex', alignItems: 'center', gap: 9 }}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#0C447C' }}>
              {user.displayName?.[0] ?? '?'}
            </div>
        }
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName}</div>
          <div style={{ fontSize: 10, color: '#888' }}>Admin</div>
        </div>
        <button onClick={onLogout} title="Abmelden" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa', padding: 2 }}>↩</button>
      </div>
    </aside>
  )
}
