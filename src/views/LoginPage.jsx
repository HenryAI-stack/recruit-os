// src/views/LoginPage.jsx
import { useT } from '../lib/i18n.jsx'
import Icon     from '../components/Icon.jsx'

export default function LoginPage({ onLogin, authError }) {
  const { t, lang, setLang } = useT()
  const tl = t.login

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F7F7F5' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:360, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.08)', border:'1px solid #EBEBEA' }}>
        {/* Language switcher */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
          <div style={{ display:'flex', gap:2, background:'#F7F7F5', borderRadius:7, padding:3 }}>
            {['de','en'].map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding:'3px 10px', borderRadius:5, fontSize:11, fontWeight:700,
                border:'none', cursor:'pointer', fontFamily:'inherit',
                background: lang===l ? '#fff' : 'transparent',
                color:      lang===l ? '#1A1A1A' : '#aaa',
                boxShadow:  lang===l ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div style={{ width:48, height:48, background:'linear-gradient(135deg,#1A1A1A,#444)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
          <Icon name="target" size={22} color="#fff" />
        </div>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:6, letterSpacing:'-.4px' }}>{tl.title}</h1>
        <p style={{ fontSize:13, color:'#999', marginBottom: authError ? 16 : 28, lineHeight:1.6 }}>
          {tl.subtitle}<br />
          <span style={{ fontSize:11 }}>{tl.encrypted}</span>
        </p>

        {authError === 'access_denied' && (
          <div style={{ marginBottom:20, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#991B1B', textAlign:'left', lineHeight:1.5 }}>
            <strong>{lang === 'de' ? 'Zugriff verweigert' : 'Access denied'}</strong><br />
            {lang === 'de'
              ? 'Dieses Konto ist nicht berechtigt, sich anzumelden.'
              : 'This account is not authorised to sign in.'}
          </div>
        )}
        <button onClick={onLogin} style={{
          width:'100%', padding:'10px 16px', border:'1px solid #EBEBEA', borderRadius:10,
          background:'#fff', cursor:'pointer', display:'flex', alignItems:'center',
          justifyContent:'center', gap:10, fontSize:14, fontFamily:'inherit', transition:'background .15s',
        }}
        onMouseOver={e => e.currentTarget.style.background='#F7F7F5'}
        onMouseOut={e  => e.currentTarget.style.background='#fff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {tl.button}
        </button>
        <p style={{ marginTop:18, fontSize:11, color:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
          <Icon name="lock" size={11} color="#ccc" />{tl.security}
        </p>
      </div>
    </div>
  )
}
