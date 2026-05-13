export default function Home() {
  const pages = [
    {
      href: '/scanner', label: 'Scanner', desc: 'Students check in and out by name', color: '#667eea',
      icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    },
    {
      href: '/dashboard', label: 'Dashboard', desc: 'Live view — who is in and out right now', color: '#10b981',
      icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    },
    {
      href: '/analytics', label: 'Analytics', desc: 'Trip history, trends, and reports', color: '#f59e0b',
      icon: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
  ]
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2.5rem', color: '#0f172a', margin: '0 0 6px' }}>Hall Pass</h1>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>Select a page to continue</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pages.map(p => (
            <a key={p.href} href={p.href} style={{ background: '#fff', borderRadius: 12, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: p.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color, flexShrink: 0 }}>{p.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.desc}</div>
              </div>
              <svg width="16" height="16" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ marginLeft: 'auto', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
