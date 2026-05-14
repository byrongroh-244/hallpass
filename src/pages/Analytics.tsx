import { Link } from 'react-router-dom'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useAllLogs } from '../hooks/useLogs'
import { fmtDuration } from '../utils/schedule'
import { SCHEDULES } from '../data/schedules'
import type { ScheduleDay } from '../types'
import { useWindowSize } from '../hooks/useWindowSize'

Chart.register(...registerables)

type TimeRange = '7days' | '14days' | '30days' | 'custom'
type Tab = 'overview' | 'student'

function getRange(timeRange: TimeRange, customStart: string, customEnd: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = today.toISOString().split('T')[0]
  if (timeRange === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd }
  const days = parseInt(timeRange.replace('days', ''))
  const s = new Date(today); s.setDate(today.getDate() - days)
  return { start: s.toISOString().split('T')[0], end }
}

const C = {
  bg: '#f8fafc', white: '#fff', ink: '#0f172a', slate: '#475569',
  cloud: '#f1f5f9', border: '#e2e8f0',
  green: '#10b981', red: '#ef4444', primary: '#667eea',
}

export default function Analytics() {
  const { isWide } = useWindowSize()
  const { logs, loading } = useAllLogs()
  const [tab, setTab] = useState<Tab>('overview')
  const [schedDay, setSchedDay] = useState<ScheduleDay>('red')
  const [periodName, setPeriodName] = useState(SCHEDULES.red.regular[0].name)
  const [timeRange, setTimeRange] = useState<TimeRange>('14days')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0])
  const [selectedStudent, setSelectedStudent] = useState('')
  const trendRef = useRef<HTMLCanvasElement>(null)
  const trendChart = useRef<Chart | null>(null)

  const periods = SCHEDULES[schedDay].regular
  const range = getRange(timeRange, customStart, customEnd)

  const filtered = useMemo(() => logs.filter(l =>
    l.scheduleDay === schedDay &&
    l.periodName === periodName &&
    l.date >= range.start && l.date <= range.end &&
    ['in', 'auto-reset', 'manual-in'].includes(l.action)
  ), [logs, schedDay, periodName, range])

  const studentStats = useMemo(() => {
    const m: Record<string, { trips: number; duration: number; over10: number }> = {}
    filtered.forEach(l => {
      if (!m[l.studentName]) m[l.studentName] = { trips: 0, duration: 0, over10: 0 }
      m[l.studentName].trips++
      m[l.studentName].duration += l.duration
      if (l.duration > 600000) m[l.studentName].over10++
    })
    return Object.entries(m).sort((a, b) => b[1].duration - a[1].duration)
  }, [filtered])

  useEffect(() => {
    if (!trendRef.current || tab !== 'overview') return
    const dayMap: Record<string, number> = {}
    const end = new Date(range.end + 'T00:00:00')
    const startD = new Date(range.start + 'T00:00:00')
    const days = Math.round((end.getTime() - startD.getTime()) / 86400000) + 1
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end); d.setDate(end.getDate() - i)
      dayMap[d.toISOString().split('T')[0]] = 0
    }
    filtered.forEach(l => { if (l.date in dayMap) dayMap[l.date]++ })
    if (trendChart.current) trendChart.current.destroy()
    trendChart.current = new Chart(trendRef.current, {
      type: 'line',
      data: {
        labels: Object.keys(dayMap).map(d =>
          new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Trips', data: Object.values(dayMap),
          borderColor: C.primary, backgroundColor: 'rgba(102,126,234,0.1)',
          borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 3,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    })
  }, [filtered, tab, range])

  useEffect(() => () => { trendChart.current?.destroy() }, [])

  const allStudentsInPeriod = useMemo(() =>
    [...new Set(logs.filter(l => l.scheduleDay === schedDay && l.periodName === periodName).map(l => l.studentName))].sort()
  , [logs, schedDay, periodName])

  const studentLogs = useMemo(() => {
    if (!selectedStudent) return []
    return filtered.filter(l => l.studentName === selectedStudent).sort((a, b) => b.timestamp - a.timestamp)
  }, [filtered, selectedStudent])

  const totalDuration = filtered.reduce((s, l) => s + l.duration, 0)

  const exportCSV = () => {
    const rows = [
      ['Date', 'Action', 'Duration (min)', 'Out Time', 'In Time'],
      ...studentLogs.map(l => [
        l.date, l.action, (l.duration / 60000).toFixed(1),
        l.outTime ? new Date(l.outTime).toLocaleTimeString() : '',
        l.inTime ? new Date(l.inTime).toLocaleTimeString() : '',
      ]),
    ]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = `${selectedStudent}_hall_pass.csv`
    a.click()
  }

  // Shared filter bar component (inline for simplicity)
  const FilterBar = () => (
    <div style={{ background: C.white, borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1.25rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
      {([
        { label: 'Schedule', opts: [['red','Red'],['black','Black']] as [string,string][], val: schedDay, onSet: (v: string) => { setSchedDay(v as ScheduleDay); setPeriodName(SCHEDULES[v as ScheduleDay].regular[0].name); setSelectedStudent('') } },
        { label: 'Period', opts: periods.map(p => [p.name, p.name.replace(/-\w+$/, '')] as [string, string]), val: periodName, onSet: (v: string) => { setPeriodName(v); setSelectedStudent('') } },
        { label: 'Range', opts: [['7days','7 Days'],['14days','14 Days'],['30days','30 Days'],['custom','Custom']] as [string,string][], val: timeRange, onSet: (v: string) => setTimeRange(v as TimeRange) },
      ]).map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{g.label}</div>
          <div style={{ display: 'flex', gap: 4, background: C.cloud, padding: 3, borderRadius: 8 }}>
            {g.opts.map(([v, l]) => (
              <button key={v} onClick={() => g.onSet(v)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer', background: g.val === v ? C.white : 'transparent', color: g.val === v ? C.ink : C.slate, boxShadow: g.val === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
            ))}
          </div>
        </div>
      ))}
      {timeRange === 'custom' && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Date Range</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '4px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
            <span style={{ color: C.slate }}>→</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '4px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '1.5rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ maxWidth: isWide ? 1440 : 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: C.white, borderRadius: 16, padding: '1.25rem 1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.75rem', color: C.ink, margin: 0 }}>Analytics</h1>
            <p style={{ color: C.slate, fontSize: 13, margin: '3px 0 0' }}>Hall pass history and trends</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/dashboard" title="Dashboard" style={{ width: 36, height: 36, borderRadius: 8, background: C.cloud, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: C.slate }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
            </Link>
            <Link to="/" title="Home" style={{ width: 36, height: 36, borderRadius: 8, background: C.cloud, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: C.slate }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 001 1m-6 0h6" /></svg>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: C.white, borderRadius: 12, padding: 4, marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', width: 'fit-content' }}>
          {(['overview', 'student'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: tab === t ? C.primary : 'transparent', color: tab === t ? '#fff' : C.slate }}>
              {t === 'overview' ? 'Class Overview' : 'Student Detail'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: C.slate }}>Loading data…</div>
        ) : (
          <>
            <FilterBar />

            {tab === 'overview' ? (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isWide ? '110px' : '130px'}, 1fr))`, gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Students w/ trips', value: new Set(filtered.map(l => l.studentName)).size },
                    { label: 'Total trips', value: filtered.length },
                    { label: 'Avg duration', value: filtered.length > 0 ? fmtDuration(totalDuration / filtered.length) : '—' },
                    { label: 'Trips > 10 min', value: filtered.filter(l => l.duration > 600000).length },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: '0.875rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.ink }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Trend chart */}
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', color: C.ink, margin: '0 0 12px' }}>Daily trip trend</h3>
                  <div style={{ height: 240 }}><canvas ref={trendRef} /></div>
                </div>

                {/* Student table */}
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', color: C.ink, margin: '0 0 12px' }}>All students</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['#', 'Student', 'Trips', 'Total time', 'Avg', '> 10 min'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px', borderBottom: `2px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentStats.length === 0
                        ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: C.slate }}>No data in selected range</td></tr>
                        : studentStats.map(([name, st], i) => (
                          <tr key={name} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                            onClick={() => { setTab('student'); setSelectedStudent(name) }}>
                            <td style={{ padding: '8px 8px', fontSize: 13, color: C.slate }}>{i + 1}</td>
                            <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: 600, color: C.ink }}>{name}</td>
                            <td style={{ padding: '8px 8px', fontSize: 13, color: C.ink }}>{st.trips}</td>
                            <td style={{ padding: '8px 8px', fontSize: 13, color: C.ink }}>{fmtDuration(st.duration)}</td>
                            <td style={{ padding: '8px 8px', fontSize: 13, color: C.ink }}>{fmtDuration(st.trips > 0 ? st.duration / st.trips : 0)}</td>
                            <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: st.over10 > 0 ? 700 : 400, color: st.over10 > 0 ? C.red : C.ink }}>{st.over10}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                {/* Student picker */}
                <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.slate, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Student</label>
                  <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
                    style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.ink, fontFamily: 'inherit', width: '100%', maxWidth: 360 }}>
                    <option value="">— Choose a student —</option>
                    {allStudentsInPeriod.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {selectedStudent && (
                  <>
                    {/* Student stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isWide ? '110px' : '130px'}, 1fr))`, gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Total trips', value: studentLogs.length },
                        { label: 'Total time', value: fmtDuration(studentLogs.reduce((s, l) => s + l.duration, 0)) },
                        { label: 'Avg duration', value: studentLogs.length > 0 ? fmtDuration(studentLogs.reduce((s, l) => s + l.duration, 0) / studentLogs.length) : '—' },
                        { label: 'Longest trip', value: studentLogs.length > 0 ? fmtDuration(Math.max(...studentLogs.map(l => l.duration))) : '—' },
                        { label: '> 10 min', value: studentLogs.filter(l => l.duration > 600000).length },
                        { label: 'Auto-resets', value: studentLogs.filter(l => l.action === 'auto-reset').length },
                      ].map(s => (
                        <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: '0.875rem 1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: C.ink }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Trip log */}
                    <div style={{ background: C.white, borderRadius: 12, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', color: C.ink, margin: 0 }}>Recent trips</h3>
                        <button onClick={exportCSV} style={{ padding: '6px 14px', background: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Export CSV</button>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {['Date', 'Action', 'Duration', 'Out time', 'In time'].map(h => (
                              <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px', borderBottom: `2px solid ${C.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {studentLogs.slice(0, 20).map((l, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '8px 8px', fontSize: 13, color: C.ink }}>{l.date}</td>
                              <td style={{ padding: '8px 8px', fontSize: 12, color: C.slate }}>{l.action}</td>
                              <td style={{ padding: '8px 8px', fontSize: 13, fontWeight: 600, color: l.duration > 600000 ? C.red : l.duration > 300000 ? '#f59e0b' : C.green }}>{fmtDuration(l.duration)}</td>
                              <td style={{ padding: '8px 8px', fontSize: 12, color: C.slate }}>{l.outTime ? new Date(l.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td style={{ padding: '8px 8px', fontSize: 12, color: C.slate }}>{l.inTime ? new Date(l.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
