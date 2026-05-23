// src/components/Sidebar.jsx
import Icon from './Icon.jsx'

const NAV = [
  { view: 'dashboard',  label: 'Dashboard',      icon: 'dashboard'  },
  { view: 'jobs',       label: 'Stellenangebote', icon: 'briefcase'  },
  { view: 'candidates', label: 'Bewerber',        icon: 'users'      },
  { view: 'interviews', label: 'Gespräche',       icon: 'calendar'   },
  { view: 'archive',    label: 'Archiv',          icon: 'archive'    },
]

export default function Sidebar({ view, onNavigate, user, onLogout }) {
  return (
    <aside style={{
      width: 224, minWidth: 224,
      background: '#fff',
      borderRight: '1px solid #EBEBEA',
      display: 'flex', flexDirection: 'column',
      padding: '0',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #EBEBEA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #1A1A1A 0%, #444 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="target" size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.3px' }}>RecruitOS</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Applicant Tracking</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 10px', flex: 1 }}>
        {NAV.map(n => {
          const active = view === n.view
          return (
            <button key={n.view} onClick={() => onNavigate(n.view)} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '8px 10px',
              border: 'none', borderRadius: 8,
              background: active ? '#F0F0EE' : 'transparent',
              color: active ? '#1A1A1A' : '#888',
              fontWeight: active ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              textAlign: 'left', marginBottom: 2,
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
            onMouseOver={e => { if (!active) e.currentTarget.style.background = '#F7F7F5' }}
            onMouseOut={e  => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon name={n.icon} size={16} color={active ? '#1A1A1A' : '#AAA'} />
              {n.label}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: '#EBEBEA', margin: '0 10px' }} />

      {/* User */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
          : <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: '#1A1A1A', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {user?.displayName?.[0] ?? '?'}
            </div>
        }
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.displayName ?? 'Benutzer'}
          </div>
          <div style={{ fontSize: 10, color: '#aaa' }}>Administrator</div>
        </div>
        <button onClick={onLogout} title="Abmelden" style={{
          border: 'none', background: 'none', cursor: 'pointer',
          padding: 5, borderRadius: 6, color: '#bbb', display: 'flex',
          transition: 'color .15s',
        }}
        onMouseOver={e => e.currentTarget.style.color = '#666'}
        onMouseOut={e  => e.currentTarget.style.color = '#bbb'}
        >
          <Icon name="logout" size={15} color="currentColor" />
        </button>
      </div>
    </aside>
  )
}
