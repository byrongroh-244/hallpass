import { useState } from 'react'
import { Link } from 'react-router-dom'

const C = {
  bg: '#f8fafc', white: '#fff', ink: '#0f172a', slate: '#475569',
  muted: '#94a3b8', cloud: '#f1f5f9', border: '#e2e8f0',
  green: '#10b981', red: '#ef4444', amber: '#f59e0b',
  primary: '#667eea', purple: '#8b5cf6',
}

const pages = [
  {
    href: '/scanner', label: 'Scanner', desc: 'Students check in and out by name', color: C.primary,
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    href: '/dashboard', label: 'Dashboard', desc: 'Live view — who is in and out right now', color: C.green,
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },
  {
    href: '/analytics', label: 'Analytics', desc: 'Trip history, trends, and reports', color: C.amber,
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  {
    href: '/editor', label: 'Roster Editor', desc: 'Set up classes and student lists each semester', color: C.purple,
    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
]

const setupSteps = [
  {
    number: '1',
    title: 'Create a Firebase project',
    color: C.primary,
    steps: [
      'Go to console.firebase.google.com',
      'Click Add project → name it anything → click through',
      'Go to Build → Realtime Database → Create database',
      'Choose your region → start in test mode',
      'Go to Project settings → General → Your apps → Add app → Web',
      'Register the app and copy the config values — you\'ll need these in step 3',
    ],
  },
  {
    number: '2',
    title: 'Set Firebase security rules',
    color: C.red,
    steps: [
      'In Firebase console → Realtime Database → Rules tab',
      'Replace everything with the rules block below',
      'Click Publish',
    ],
    code: `{
  "rules": {
    "students": { ".read": true, ".write": true },
    "logs":     { ".read": false, ".write": true },
    "roster":   { ".read": true, ".write": false }
  }
}`,
  },
  {
    number: '3',
    title: 'Fork the repo and add secrets',
    color: C.green,
    steps: [
      'Fork byrongroh-244/hallpass on GitHub',
      'Go to your fork → Settings → Secrets and variables → Actions',
      'Add each secret from your Firebase config: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID',
      'Add VITE_ADMIN_PIN (4-digit PIN for home button and max students)',
      'Add VITE_EDITOR_PIN (4-digit PIN for roster editor)',
    ],
  },
  {
    number: '4',
    title: 'Enable GitHub Pages',
    color: C.amber,
    steps: [
      'In your forked repo → Settings → Pages',
      'Source → GitHub Actions → Save',
      'Push any commit to trigger your first deploy',
      'Your app will be live at https://YOUR-USERNAME.github.io/hallpass/',
    ],
  },
  {
    number: '5',
    title: 'Upload your roster',
    color: C.purple,
    steps: [
      'Go to your live app → Roster Editor → enter your PIN',
      'Export your class roster from PowerSchool as Excel',
      'Click "Upload Excel or CSV roster" and select the file',
      'Review the preview — periods auto-populate from the Course column',
      'Click Confirm — students appear on the scanner immediately',
    ],
  },
  {
    number: '6',
    title: 'Set up the iPad kiosk',
    color: '#06b6d4',
    steps: [
      'Open Safari on the iPad and go to your app URL',
      'Tap Share → Add to Home Screen → Add',
      'Open from the home screen icon — runs fullscreen with no browser bar',
      'Go to Scanner, tap Schedule, set the correct day and period',
      'Students tap their name to check in and out',
    ],
  },
]

function SetupStep({ step, isOpen, onToggle }: {
  step: typeof setupSteps[0]; isOpen: boolean; onToggle: () => void
}) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: step.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 700, color: step.color }}>{step.number}</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.ink, flex: 1 }}>{step.title}</span>
        <svg width="16" height="16" fill="none" stroke={C.muted} viewBox="0 0 24 24" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: `1px solid ${C.border}` }}>
          <ol style={{ margin: '1rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {step.steps.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: C.slate, lineHeight: 1.6 }}>{s}</li>
            ))}
          </ol>
          {'code' in step && step.code && (
            <pre style={{ marginTop: 14, background: C.cloud, borderRadius: 8, padding: '0.875rem 1rem', fontSize: 12, color: C.ink, overflow: 'auto', border: `1px solid ${C.border}`, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6 }}>
              {step.code}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [openStep, setOpenStep] = useState<number | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2.5rem', color: C.ink, margin: '0 0 6px' }}>Hall Pass</h1>
          <p style={{ color: C.muted, fontSize: '0.95rem', margin: 0 }}>Classroom hall pass tracking for teachers</p>
        </div>

        {/* ── Nav cards ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
          {pages.map(p => (
            <Link key={p.href} to={p.href} style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', border: `1px solid ${C.border}`, transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: p.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.ink, marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: '0.8rem', color: C.muted }}>{p.desc}</div>
              </div>
              <svg width="14" height="14" fill="none" stroke={C.border} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          ))}
        </div>

        {/* ── Setup guide ──────────────────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1.75rem' }}>
          <button onClick={() => setShowSetup(s => !s)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showSetup ? '1.25rem' : 0 }}>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.4rem', color: C.ink, margin: '0 0 3px' }}>Setup guide</h2>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Get your own instance running in about 15 minutes</p>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.cloud, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" stroke={C.slate} viewBox="0 0 24 24" style={{ transform: showSetup ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showSetup && (
            <>
              {/* What you need */}
              <div style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', border: `1px solid ${C.border}`, marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1rem', color: C.ink, margin: '0 0 10px' }}>What you need</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'GitHub account', sub: 'free — github.com', color: C.ink },
                    { label: 'Firebase account', sub: 'free tier is plenty — firebase.google.com', color: C.ink },
                    { label: 'PowerSchool access', sub: 'to export your class roster as Excel', color: C.ink },
                    { label: 'An iPad (or any tablet)', sub: 'for the student kiosk — any modern browser works', color: C.ink },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: 6 }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}</span>
                        <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              {setupSteps.map((step, i) => (
                <SetupStep
                  key={i}
                  step={step}
                  isOpen={openStep === i}
                  onToggle={() => setOpenStep(openStep === i ? null : i)}
                />
              ))}

              {/* Data + privacy note */}
              <div style={{ background: C.cloud, borderRadius: 10, padding: '0.875rem 1.1rem', border: `1px solid ${C.border}`, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Privacy note</div>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
                  Only student first names are stored — no IDs, grades, or identifying information. Trip data includes timestamps and durations only. All data lives in your own Firebase project — no third party has access. Consider making your GitHub repo private before sharing with administration.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
