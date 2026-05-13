import { useState, useEffect, useMemo, useCallback } from 'react'
import { ref, get } from 'firebase/database'
import { db } from '../firebase/config'
import { scheduleStr, studentKey, writeManualAction, writeAutoReset } from '../firebase/writes'
import { useStudents } from '../hooks/useStudents'
import { useTodayLogs } from '../hooks/useLogs'
import { SCHEDULES } from '../data/schedules'
import { fmtDuration, fmt, fmt12, MAX_OUT, todayStr } from '../utils/schedule'
import type { ScheduleDay, StartType, StudentRecord } from '../types'
import { useWindowSize } from '../hooks/useWindowSize'

const C = {
  bg: '#f8fafc', white: '#fff', ink: '#0f172a', slate: '#475569',
  muted: '#94a3b8', cloud: '#f1f5f9', border: '#e2e8f0',
  green: '#10b981', greenBg: 'rgba(16,185,129,0.08)', greenBorder: 'rgba(16,185,129,0.2)',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.06)', redBorder: 'rgba(239,68,68,0.2)',
  amber: '#f59e0b', primary: '#667eea',
}

// ─── Small reusable components ────────────────────────────────────────────────

function NavIcon({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <a href={href} title={title} style={{ width: 36, height: 36, borderRadius: 8, background: C.cloud, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: C.slate }}>
      {children}
    </a>
  )
}

function SegmentedControl({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: C.cloud, padding: 3, borderRadius: 8 }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', background: value === v ? C.white : 'transparent', color: value === v ? C.ink : C.slate, boxShadow: value === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
          {label}
        </button>
      ))}
    </div>
  )
}

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 10px' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{label}</span>
      {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.cloud, borderRadius: 100, padding: '1px 7px' }}>{count}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isWide, width } = useWindowSize()
  const allStudents = useStudents()
  const todayLogs = useTodayLogs()
  const [tick, setTick] = useState(0)
  const [showStats, setShowStats] = useState(() => localStorage.getItem('db_showStats') !== 'false')

  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { localStorage.setItem('db_showStats', String(showStats)) }, [showStats])

  const [day, setDay] = useState<ScheduleDay>(() => (localStorage.getItem('db_day') as ScheduleDay) ?? 'red')
  const [start, setStart] = useState<StartType>(() => (localStorage.getItem('db_start') as StartType) ?? 'regular')
  const [periodName, setPeriodName] = useState(() => localStorage.getItem('db_period') ?? '')
  useEffect(() => { localStorage.setItem('db_day', day); localStorage.setItem('db_start', start); localStorage.setItem('db_period', periodName) }, [day, start, periodName])

  const periods = SCHEDULES[day][start]
  const period = periods.find(p => p.name === periodName) ?? periods[0]
  const sched = scheduleStr(day, start)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!periods.find(p => p.name === periodName)) setPeriodName(periods[0]?.name ?? '') }, [day, start])

  const isPeriodActive = useMemo(() => {
    if (!period) return false
    const now = new Date()
    const t = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')
    return t >= period.startTime && t < period.endTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, tick])

  // Auto-reset at period end
  useEffect(() => {
    const id = setInterval(async () => {
      if (!period || isPeriodActive) return
      const snap = await get(ref(db, 'students'))
      const all = (snap.val() ?? {}) as Record<string, StudentRecord>
      const now = Date.now(); const today = todayStr()
      await Promise.all(
        Object.entries(all)
          .filter(([, s]) => s.status === 'out' && s.schedule === sched && s.period === period.name)
          .map(async ([key, s]) => writeAutoReset({ name: s.name, period: s.period, schedule: s.schedule, studentKey: key, outStart: s.outTimestamp ?? s.timestamp, resetTime: now, date: today }))
      )
    }, 30000)
    return () => clearInterval(id)
  }, [period, isPeriodActive, sched])

  // Last trip per student today
  const lastTripMap = useMemo(() => {
    const m: Record<string, number> = {}; const ts: Record<string, number> = {}
    todayLogs.forEach(l => {
      if (['in', 'manual-in', 'auto-reset'].includes(l.action) && l.duration && l.schedule === sched && l.period === period?.name) {
        if (!ts[l.studentName] || l.timestamp > ts[l.studentName]) { m[l.studentName] = l.duration; ts[l.studentName] = l.timestamp }
      }
    })
    return m
  }, [todayLogs, sched, period])

  // Trip count per student today
  const tripCountMap = useMemo(() => {
    const m: Record<string, number> = {}
    todayLogs.forEach(l => {
      if (l.action === 'out' && l.schedule === sched && l.period === period?.name) {
        m[l.studentName] = (m[l.studentName] ?? 0) + 1
      }
    })
    return m
  }, [todayLogs, sched, period])

  // 12-hour cutoff — only treat a student as "active today" if they had a trip in last 12h
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000

  // Set of students with any log entry in the last 12 hours for this period
  const recentlyActiveSet = useMemo(() => {
    const s = new Set<string>()
    todayLogs.forEach(l => {
      if (l.schedule === sched && l.period === period?.name && l.timestamp > twelveHoursAgo) {
        s.add(l.studentName)
      }
    })
    return s
  }, [todayLogs, sched, period, twelveHoursAgo])

  const roster = useMemo(() => {
    if (!period) return []
    return period.students.map(name => {
      const key = studentKey(day, start, name, period.name)
      const rec = allStudents[key]
      return {
        name,
        status: (rec?.status ?? 'in') as 'in' | 'out',
        hasScanned: recentlyActiveSet.has(name),   // true only if active in last 12h
        outTimestamp: rec?.outTimestamp ?? null,
        lastTrip: lastTripMap[name] ?? null,
        tripCount: tripCountMap[name] ?? 0,
      }
    })
  }, [allStudents, period, day, start, lastTripMap, tripCountMap, recentlyActiveSet])

  const relevantLogs = todayLogs.filter(l => ['in', 'manual-in', 'auto-reset'].includes(l.action) && l.schedule === sched && l.period === period?.name && l.duration)
  const totalMs = relevantLogs.reduce((s, l) => s + (l.duration ?? 0), 0)
  const outCount = roster.filter(s => s.status === 'out').length

  const manualAction = useCallback(async (name: string, action: 'in' | 'out', outTimestamp: number | null) => {
    if (action === 'out') {
      const out = Object.values(allStudents).filter(s => s.status === 'out' && s.period === period?.name && s.schedule === sched).length
      if (out >= MAX_OUT) { alert(`Max ${MAX_OUT} students out at a time`); return }
    }
    const now = Date.now(); const today = todayStr()
    await writeManualAction({ day, start, name, period: period!.name, action: `manual-${action}` as 'manual-in' | 'manual-out', outStart: outTimestamp, inTime: action === 'in' ? now : null, now, date: today })
  }, [allStudents, period, sched, day, start])

  // Split roster into three sections
  const studentsOut     = roster.filter(s => s.status === 'out')
  const studentsIn      = roster.filter(s => s.status === 'in' && s.hasScanned)
  const studentsUnknown = roster.filter(s => !s.hasScanned)

  void tick

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '1rem 1.5rem' }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '2rem', color: C.ink, margin: 0 }}>Dashboard</h1>
            {period && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: isPeriodActive ? C.green : C.muted, display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: C.slate }}>
                  {period.name} · {fmt12(period.startTime)} – {fmt12(period.endTime)} · {isPeriodActive ? 'Active' : 'Not active'}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Stats toggle */}
            <button onClick={() => setShowStats(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: showStats ? C.ink : C.white, color: showStats ? '#fff' : C.slate, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              {showStats ? 'Hide stats' : 'Show stats'}
            </button>
            <NavIcon href="/analytics" title="Analytics">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </NavIcon>
            <NavIcon href="/" title="Home">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </NavIcon>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, padding: '1rem 1.5rem', border: `1px solid ${C.border}`, marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Schedule</div>
            <SegmentedControl options={[['red', 'Red'], ['black', 'Black']]} value={day} onChange={v => setDay(v as ScheduleDay)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Start</div>
            <SegmentedControl options={[['regular', 'Regular'], ['late', 'Late']]} value={start} onChange={v => setStart(v as StartType)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Period</div>
            <SegmentedControl
              options={periods.map(p => [p.name, p.name.replace(/-\w+$/, '')] as [string, string])}
              value={period?.name ?? ''}
              onChange={v => setPeriodName(v)}
            />
          </div>
        </div>

        {/* ── Stats (collapsible) ──────────────────────────────────────────────── */}
        {showStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Out now', value: outCount, color: outCount > 0 ? C.red : C.ink },
              { label: 'In class', value: studentsIn.length, color: C.green },
              { label: 'Trips today', value: relevantLogs.length, color: C.primary },
              { label: 'Total time', value: fmtDuration(totalMs), color: C.amber },
              { label: 'Avg duration', value: relevantLogs.length > 0 ? fmtDuration(totalMs / relevantLogs.length) : '—', color: '#8b5cf6' },
              { label: '> 10 min', value: relevantLogs.filter(l => (l.duration ?? 0) > 600000).length, color: C.red },
            ].map(s => (
              <div key={s.label} style={{ background: C.white, borderRadius: 10, padding: '0.75rem 1rem', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Student sections ─────────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '0.25rem 1.25rem 1.5rem' }}>

          {/* Currently Out */}
          {studentsOut.length > 0 && (
            <>
              <SectionDivider label="Currently Out" count={studentsOut.length} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isWide ? 8 : width >= 1200 ? 7 : width >= 900 ? 6 : 5}, 1fr)`, gap: '0.6rem' }}>
                {studentsOut.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} />)}
              </div>
            </>
          )}

          {/* Back in / scanned today */}
          {studentsIn.length > 0 && (
            <>
              <SectionDivider label={studentsOut.length > 0 ? 'Back In' : 'In Class'} count={studentsIn.length} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isWide ? 8 : width >= 1200 ? 7 : width >= 900 ? 6 : 5}, 1fr)`, gap: '0.6rem' }}>
                {studentsIn.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} />)}
              </div>
            </>
          )}

          {/* Not yet scanned */}
          {studentsUnknown.length > 0 && (
            <>
              <SectionDivider label="Not Scanned" count={studentsUnknown.length} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isWide ? 8 : width >= 1200 ? 7 : width >= 900 ? 6 : 5}, 1fr)`, gap: '0.6rem' }}>
                {studentsUnknown.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Student Tile ─────────────────────────────────────────────────────────────

function StudentTile({ s, isPeriodActive, onAction, tick }: {
  s: { name: string; status: 'in' | 'out'; hasScanned: boolean; outTimestamp: number | null; lastTrip: number | null; tripCount: number }
  isPeriodActive: boolean
  onAction: (name: string, action: 'in' | 'out', outTimestamp: number | null) => void
  tick: number
}) {
  void tick
  const elapsed = s.status === 'out' && s.outTimestamp ? Date.now() - s.outTimestamp : 0
  const isOut = s.status === 'out'
  const over10 = elapsed > 600_000
  const over5  = elapsed > 300_000

  // Compact layout: no reserved space, height shrinks to content
  const showTimer    = isOut && s.outTimestamp
  const showLastTrip = !isOut && s.lastTrip

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isOut ? C.redBorder : s.hasScanned ? C.greenBorder : C.border}`, borderWidth: isOut ? '1.5px' : s.hasScanned ? '1.5px' : '1px',
      background: isOut ? C.redBg : C.white,
      padding: '12px 14px',
      transition: 'border-color 0.2s, background 0.2s',
      opacity: isPeriodActive ? 1 : 0.55,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Row 1: name + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showTimer || showLastTrip ? 6 : 10 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: C.ink }}>{s.name}</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginLeft: 6,
          letterSpacing: '0.5px',
          background: isOut ? 'rgba(239,68,68,0.15)' : s.hasScanned ? 'rgba(16,185,129,0.15)' : C.cloud,
          color: isOut ? C.red : s.hasScanned ? C.green : C.muted,
        }}>
          {isOut ? 'OUT' : s.hasScanned ? 'IN' : '—'}
        </span>
      </div>

      {/* Row 2: timer or last trip */}
      {showTimer && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.35rem', fontWeight: 600, color: over10 ? C.red : over5 ? C.amber : C.ink, letterSpacing: '-0.5px', marginBottom: 10 }}>
          {fmt(elapsed)}
        </div>
      )}
      {showLastTrip && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
          {fmtDuration(s.lastTrip!)}{s.tripCount > 1 ? ` · ${s.tripCount} trips` : ''}
        </div>
      )}

      {/* Row 3: action button */}
      {isPeriodActive && (
        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          {isOut ? (
            <button onClick={() => onAction(s.name, 'in', s.outTimestamp)}
              style={{ width: '100%', padding: '5px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.12)', color: C.green }}>
              Mark In
            </button>
          ) : (
            <button onClick={() => onAction(s.name, 'out', s.outTimestamp)}
              style={{ width: '100%', padding: '5px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.09)', color: C.red }}>
              Mark Out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
