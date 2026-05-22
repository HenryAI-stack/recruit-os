// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import { onAuth, loginWithGoogle, logout } from './lib/auth.js'
import { loadCollection, saveCollection } from './lib/github-storage.js'

import LoginPage    from './views/LoginPage.jsx'
import Dashboard    from './views/Dashboard.jsx'
import JobsView     from './views/JobsView.jsx'
import CandidatesView from './views/CandidatesView.jsx'
import InterviewsView from './views/InterviewsView.jsx'
import Sidebar      from './components/Sidebar.jsx'

const VIEWS = ['dashboard', 'jobs', 'candidates', 'interviews']

export default function App() {
  const [user,       setUser]       = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view,       setView]       = useState('dashboard')
  const [loading,    setLoading]    = useState(false)

  // Data
  const [jobs,        setJobs]        = useState([])
  const [candidates,  setCandidates]  = useState([])
  const [interviews,  setInterviews]  = useState([])

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuth(u => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  // ── Load data after login ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      loadCollection('jobs'),
      loadCollection('candidates'),
      loadCollection('interviews'),
    ]).then(([j, c, i]) => {
      setJobs(j)
      setCandidates(c)
      setInterviews(i)
    }).finally(() => setLoading(false))
  }, [user])

  // ── Persist helpers (optimistic update + GitHub write) ─────────────────────
  const persistJobs = useCallback(async (next) => {
    setJobs(next)
    await saveCollection('jobs', next)
  }, [])

  const persistCandidates = useCallback(async (next) => {
    setCandidates(next)
    await saveCollection('candidates', next)
  }, [])

  const persistInterviews = useCallback(async (next) => {
    setInterviews(next)
    await saveCollection('interviews', next)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888'}}>Laden…</div>

  if (!user) return <LoginPage onLogin={loginWithGoogle} />

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#888'}}>Daten werden entschlüsselt…</div>

  const sharedProps = { jobs, candidates, interviews, persistJobs, persistCandidates, persistInterviews }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar view={view} onNavigate={setView} user={user} onLogout={logout} />
      <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#f5f5f4' }}>
        {view === 'dashboard'   && <Dashboard    {...sharedProps} onNavigate={setView} />}
        {view === 'jobs'        && <JobsView      {...sharedProps} />}
        {view === 'candidates'  && <CandidatesView {...sharedProps} />}
        {view === 'interviews'  && <InterviewsView {...sharedProps} />}
      </main>
    </div>
  )
}
