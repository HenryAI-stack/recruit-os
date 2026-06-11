// src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import { onAuth, loginWithGoogle, logout } from './lib/auth.js'
import { loadCollection, saveCollection } from './lib/github-storage.js'

import LoginPage      from './views/LoginPage.jsx'
import Dashboard      from './views/Dashboard.jsx'
import JobsView       from './views/JobsView.jsx'
import CandidatesView from './views/CandidatesView.jsx'
import InterviewsView from './views/InterviewsView.jsx'
import ArchiveView    from './views/ArchiveView.jsx'
import NotesView      from './views/NotesView.jsx'
import Sidebar        from './components/Sidebar.jsx'

export default function App() {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError,   setAuthError]   = useState(null)
  const [view,        setView]        = useState('dashboard')
  const [loading,     setLoading]     = useState(false)

  const [jobs,       setJobs]       = useState([])
  const [candidates, setCandidates] = useState([])
  const [interviews, setInterviews] = useState([])
  const [archives,   setArchives]   = useState([])
  const [notesText,  setNotesText]  = useState('')

  async function handleLogin() {
    try {
      setAuthError(null)
      await loginWithGoogle()
    } catch (e) {
      if (e.message === 'ACCESS_DENIED') {
        setAuthError('access_denied')
      }
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return onAuth(u => { setUser(u); setAuthLoading(false) })
  }, [])

  // ── Load all collections after login ──────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      loadCollection('jobs'),
      loadCollection('candidates'),
      loadCollection('interviews'),
      loadCollection('archives'),
      loadCollection('notes'),
    ]).then(([j, c, i, a, n]) => {
      setJobs(j); setCandidates(c); setInterviews(i); setArchives(a)
      setNotesText(n?.[0]?.text || '')
    }).finally(() => setLoading(false))
  }, [user])

  // ── Persist helpers ───────────────────────────────────────────────────────
  const persistJobs       = useCallback(async next => { setJobs(next);       await saveCollection('jobs',       next) }, [])
  const persistCandidates = useCallback(async next => { setCandidates(next); await saveCollection('candidates', next) }, [])
  const persistInterviews = useCallback(async next => { setInterviews(next); await saveCollection('interviews', next) }, [])
  const persistArchives   = useCallback(async next => { setArchives(next);   await saveCollection('archives',   next) }, [])
  const persistNotes      = useCallback(async text => { setNotesText(text);  await saveCollection('notes', [{ text }]) }, [])

  // ── Archive a job (move job + its candidates + interviews into archives) ──
  const handleArchive = useCallback(async (jobId) => {
    const job        = jobs.find(j => j.id === jobId)
    const jobCands   = candidates.filter(c => c.jobId === jobId)
    const candIds    = new Set(jobCands.map(c => c.id))
    const jobIvs     = interviews.filter(iv => candIds.has(iv.candidateId))

    const entry = {
      id:         crypto.randomUUID(),
      archivedAt: new Date().toLocaleDateString('de-AT'),
      job,
      candidates: jobCands,
      interviews: jobIvs,
    }

    // Add to archives, remove from active collections — all in parallel
    const nextArchives   = [...archives,   entry]
    const nextJobs       = jobs.filter(j => j.id !== jobId)
    const nextCandidates = candidates.filter(c => c.jobId !== jobId)
    const nextInterviews = interviews.filter(iv => !candIds.has(iv.candidateId))

    await Promise.all([
      persistArchives(nextArchives),
      persistJobs(nextJobs),
      persistCandidates(nextCandidates),
      persistInterviews(nextInterviews),
    ])

    setView('archive')
  }, [jobs, candidates, interviews, archives, persistArchives, persistJobs, persistCandidates, persistInterviews])

  // ── Restore a job from archive ────────────────────────────────────────────
  const handleRestore = useCallback(async (archiveId) => {
    const entry = archives.find(a => a.id === archiveId)
    if (!entry) return

    await Promise.all([
      persistJobs(       [...jobs,       { ...entry.job, isOpen: false }]),
      persistCandidates( [...candidates, ...entry.candidates]),
      persistInterviews( [...interviews, ...entry.interviews]),
      persistArchives(   archives.filter(a => a.id !== archiveId)),
    ])

    setView('jobs')
  }, [archives, jobs, candidates, interviews, persistJobs, persistCandidates, persistInterviews, persistArchives])

  // ── Render ────────────────────────────────────────────────────────────────
  if (authLoading) return <Centered>Laden…</Centered>
  if (!user)       return <LoginPage onLogin={handleLogin} authError={authError} />
  if (loading)     return <Centered>Daten werden entschlüsselt…</Centered>

  const shared = { jobs, candidates, interviews, persistJobs, persistCandidates, persistInterviews }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar view={view} onNavigate={setView} user={user} onLogout={logout} />
      <main style={{ flex:1, overflowY:'auto', padding:'28px 32px', background:'#f5f5f4' }}>
        {view === 'dashboard'  && <Dashboard     {...shared} onNavigate={setView} />}
        {view === 'jobs'       && <JobsView       {...shared} onArchive={handleArchive} />}
        {view === 'candidates' && <CandidatesView {...shared} user={user} />}
        {view === 'interviews' && <InterviewsView {...shared} />}
        {view === 'archive'    && <ArchiveView    archives={archives} persistArchives={persistArchives} onRestore={handleRestore} />}
        {view === 'notes'      && <NotesView      notes={notesText} persistNotes={persistNotes} />}
      </main>
    </div>
  )
}

function Centered({ children }) {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontSize:14, color:'#888' }}>{children}</div>
}
