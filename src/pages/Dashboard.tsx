import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ref, get } from 'firebase/database'
import { db } from '../firebase/config'
import { scheduleStr, studentKey, writeManualAction, writeAutoReset } from '../firebase/writes'
import { useStudents } from '../hooks/useStudents'
import { useTodayLogs } from '../hooks/useLogs'
import { SCHEDULES } from '../data/schedules'
import { useRoster } from '../hooks/useRoster'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NavIcon({ to, title, children }: { to: string; title: string; children: React.ReactNode }) {
  return (
    <Link to={to} title={title} style={{ width: 34, height: 34, borderRadius: 8, background: C.cloud, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: C.slate }}>
      {children}
    </Link>
  )
}

function SectionDivider({ label, count, accent }: { label: string; count: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 10px' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent ?? C.muted, textTransform: 'uppercase', letterSpacing: '0.7px', whiteSpace: 'nowrap' }}>{label}</span>
      {count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 700, color: accent ?? C.muted, background: accent ? `${accent}18` : C.cloud, borderRadius: 100, padding: '1px 7px', border: accent ? `1px solid ${accent}30` : 'none' }}>{count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

// ─── Schedule picker (compact dropdown) ───────────────────────────────────────

function SchedulePicker({ day, start, periodName, periods, onChange }: {
  day: ScheduleDay; start: StartType; periodName: string
  periods: { name: string; startTime: string; endTime: string }[]
  onChange: (day: ScheduleDay, start: StartType, period: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pickDay, setPickDay] = useState(day)
  const [pickStart, setPickStart] = useState(start)
  const [pickPeriod, setPickPeriod] = useState(periodName)
  const ref_ = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref_.current && !ref_.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayPeriod = periods.find(p => p.name === periodName)
  const displayLabel = displayPeriod
    ? `${day === 'red' ? 'Red' : 'Black'} · ${start === 'regular' ? 'Regular' : 'Late'} · ${displayPeriod.name.replace(/-\w+$/, '')}`
    : 'Select schedule'

  return (
    <div ref={ref_} style={{ position: 'relative' }}>
      <button onClick={() => { setPickDay(day); setPickStart(start); setPickPeriod(periodName); setOpen(o => !o) }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.ink, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {displayLabel}
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, padding: 16, width: 320 }}>
          {/* Day */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Day</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['red', 'black'] as ScheduleDay[]).map(d => (
              <button key={d} onClick={() => { setPickDay(d); setPickPeriod(SCHEDULES[d][pickStart][0]?.name ?? '') }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: pickDay === d ? `2px solid ${d === 'red' ? C.red : C.ink}` : `1px solid ${C.border}`, background: pickDay === d ? (d === 'red' ? 'rgba(239,68,68,0.06)' : C.cloud) : C.white, color: pickDay === d ? (d === 'red' ? '#b91c1c' : C.ink) : C.slate, fontWeight: pickDay === d ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
                {d === 'red' ? 'Red' : 'Black'}
              </button>
            ))}
          </div>

          {/* Start */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Start</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['regular', 'late'] as StartType[]).map(s => (
              <button key={s} onClick={() => { setPickStart(s); setPickPeriod(SCHEDULES[pickDay][s][0]?.name ?? '') }}
                style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: pickStart === s ? `2px solid ${C.green}` : `1px solid ${C.border}`, background: pickStart === s ? C.greenBg : C.white, color: pickStart === s ? '#065f46' : C.slate, fontWeight: pickStart === s ? 700 : 400, fontSize: 13, cursor: 'pointer' }}>
                {s === 'regular' ? 'Regular' : 'Late Start'}
              </button>
            ))}
          </div>

          {/* Period */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Period</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            {SCHEDULES[pickDay][pickStart].map(p => (
              <button key={p.name} onClick={() => setPickPeriod(p.name)}
                style={{ padding: '8px 12px', borderRadius: 7, border: pickPeriod === p.name ? `2px solid ${C.primary}` : `1px solid ${C.border}`, background: pickPeriod === p.name ? 'rgba(102,126,234,0.07)' : C.white, color: pickPeriod === p.name ? C.primary : C.ink, fontSize: 13, fontWeight: pickPeriod === p.name ? 600 : 400, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.name.replace(/-\w+$/, '')}</span>
                <span style={{ color: C.muted, fontWeight: 400, fontSize: 11 }}>{fmt12(p.startTime)} – {fmt12(p.endTime)}</span>
              </button>
            ))}
          </div>

          <button onClick={() => { onChange(pickDay, pickStart, pickPeriod); setOpen(false) }}
            style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: C.ink, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Long-trip alert banner ───────────────────────────────────────────────────

function LongTripAlert({ students, onMarkIn }: {
  students: { name: string; outTimestamp: number | null }[]
  onMarkIn: (name: string, outTimestamp: number | null) => void
}) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const alertStudents = students.filter(s =>
    s.outTimestamp && Date.now() - s.outTimestamp > 600_000 && !dismissed.includes(s.name)
  )
  if (alertStudents.length === 0) return null

  return (
    <div style={{ background: 'rgba(239,68,68,0.06)', border: `1.5px solid rgba(239,68,68,0.25)`, borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', flex: 1 }}>
        {alertStudents.map(s => s.name).join(', ')} {alertStudents.length === 1 ? 'has' : 'have'} been out over 10 minutes
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {alertStudents.map(s => (
          <button key={s.name} onClick={() => onMarkIn(s.name, s.outTimestamp)}
            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: C.red, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Mark {s.name} In
          </button>
        ))}
        <button onClick={() => setDismissed(d => [...d, ...alertStudents.map(s => s.name)])}
          style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: 'transparent', color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isWide, width } = useWindowSize()
  const allStudents = useStudents()
  const { roster: firebaseRoster } = useRoster()
  const todayLogs = useTodayLogs()
  const [tick, setTick] = useState(0)

  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id) }, [])

  const [day, setDay] = useState<ScheduleDay>(() => (localStorage.getItem('db_day') as ScheduleDay) ?? 'red')
  const [start, setStart] = useState<StartType>(() => (localStorage.getItem('db_start') as StartType) ?? 'regular')
  const [periodName, setPeriodName] = useState(() => localStorage.getItem('db_period') ?? '')

  useEffect(() => {
    localStorage.setItem('db_day', day)
    localStorage.setItem('db_start', start)
    localStorage.setItem('db_period', periodName)
  }, [day, start, periodName])

  const periods = SCHEDULES[day][start]
  const period = periods.find(p => p.name === periodName) ?? periods[0]

  // Get student list from Firebase roster if available, fall back to schedules.ts
  const rosterKey_ = period ? `${day}_${period.name.match(/\d+/)?.[0] ?? '1'}` : null
  const rosterPeriod = rosterKey_ ? firebaseRoster[rosterKey_] : null
  const periodStudents: string[] = rosterPeriod?.students?.length
    ? rosterPeriod.students
    : (period?.students ?? [])
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
          .map(async ([key, s]) => writeAutoReset({
            name: s.name, period: s.period, schedule: s.schedule,
            studentKey: key, outStart: s.outTimestamp ?? s.timestamp, resetTime: now, date: today,
          }))
      )
    }, 30000)
    return () => clearInterval(id)
  }, [period, isPeriodActive, sched])

  const lastTripMap = useMemo(() => {
    const m: Record<string, number> = {}; const ts: Record<string, number> = {}
    todayLogs.forEach(l => {
      if (['in', 'manual-in', 'auto-reset'].includes(l.action) && l.duration && l.schedule === sched && l.period === period?.name) {
        if (!ts[l.studentName] || l.timestamp > ts[l.studentName]) {
          m[l.studentName] = l.duration; ts[l.studentName] = l.timestamp
        }
      }
    })
    return m
  }, [todayLogs, sched, period])

  const tripCountMap = useMemo(() => {
    const m: Record<string, number> = {}
    todayLogs.forEach(l => {
      if (l.action === 'out' && l.schedule === sched && l.period === period?.name) {
        m[l.studentName] = (m[l.studentName] ?? 0) + 1
      }
    })
    return m
  }, [todayLogs, sched, period])

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000
  const recentlyActiveSet = useMemo(() => {
    const s = new Set<string>()
    todayLogs.forEach(l => {
      if (l.schedule === sched && l.period === period?.name && l.timestamp > twelveHoursAgo) s.add(l.studentName)
    })
    return s
  }, [todayLogs, sched, period, twelveHoursAgo])

  const roster = useMemo(() => {
    if (!period) return []
    return periodStudents.map(name => {
      const key = studentKey(day, start, name, period.name)
      const rec = allStudents[key]
      return {
        name,
        status: (rec?.status ?? 'in') as 'in' | 'out',
        hasScanned: recentlyActiveSet.has(name),
        outTimestamp: rec?.outTimestamp ?? null,
        lastTrip: lastTripMap[name] ?? null,
        tripCount: tripCountMap[name] ?? 0,
      }
    })
  }, [allStudents, period, day, start, lastTripMap, tripCountMap, recentlyActiveSet, periodStudents])

  const relevantLogs = todayLogs.filter(l =>
    ['in', 'manual-in', 'auto-reset'].includes(l.action) &&
    l.schedule === sched && l.period === period?.name && l.duration
  )
  const totalMs = relevantLogs.reduce((s, l) => s + (l.duration ?? 0), 0)

  const manualAction = useCallback(async (name: string, action: 'in' | 'out', outTimestamp: number | null) => {
    if (action === 'out') {
      const out = Object.values(allStudents).filter(
        s => s.status === 'out' && s.period === period?.name && s.schedule === sched
      ).length
      if (out >= MAX_OUT) { alert(`Max ${MAX_OUT} students out at a time`); return }
    }
    const now = Date.now(); const today = todayStr()
    await writeManualAction({
      day, start, name, period: period!.name,
      action: `manual-${action}` as 'manual-in' | 'manual-out',
      outStart: outTimestamp, inTime: action === 'in' ? now : null, now, date: today,
    })
  }, [allStudents, period, sched, day, start])

  // Sort out students: longest out first
  const studentsOut = roster
    .filter(s => s.status === 'out')
    .sort((a, b) => (a.outTimestamp ?? 0) - (b.outTimestamp ?? 0)) // earliest = longest out

  const studentsIn      = roster.filter(s => s.status === 'in' && s.hasScanned)
  const studentsUnknown = roster.filter(s => !s.hasScanned)

  // Useful quick stats — always visible in header
  const over10Count = relevantLogs.filter(l => (l.duration ?? 0) > 600_000).length
  const avgMs = relevantLogs.length > 0 ? totalMs / relevantLogs.length : 0

  // Column count
  const cols = isWide ? 8 : width >= 1200 ? 7 : width >= 900 ? 6 : 5

  void tick

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
      `}</style>

      <div style={{ padding: '1rem 1.5rem' }}>

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>

          {/* Title + period status */}
          <div style={{ marginRight: 4 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.6rem', color: C.ink, margin: 0, lineHeight: 1 }}>Dashboard</h1>
          </div>

          {/* Active indicator */}
          {period && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, background: isPeriodActive ? 'rgba(16,185,129,0.1)' : C.cloud, border: `1px solid ${isPeriodActive ? 'rgba(16,185,129,0.25)' : C.border}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isPeriodActive ? C.green : C.muted, display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isPeriodActive ? '#065f46' : C.slate }}>
                {isPeriodActive ? 'Active' : 'Not active'} · {rosterPeriod?.name ? `${rosterPeriod.name} · ` : ''}{fmt12(period.startTime)} – {fmt12(period.endTime)}
              </span>
            </div>
          )}

          {/* Quick stats — always visible */}
          <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
            <div style={{ padding: '4px 12px', borderRadius: 100, background: studentsOut.length > 0 ? 'rgba(239,68,68,0.1)' : C.cloud, border: `1px solid ${studentsOut.length > 0 ? 'rgba(239,68,68,0.25)' : C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: studentsOut.length > 0 ? C.red : C.muted }}>{studentsOut.length} out</span>
            </div>
            {relevantLogs.length > 0 && (
              <div style={{ padding: '4px 12px', borderRadius: 100, background: C.cloud, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.slate }}>{relevantLogs.length} trips · avg {fmtDuration(avgMs)}</span>
              </div>
            )}
            {over10Count > 0 && (
              <div style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>{over10Count} over 10 min</span>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Schedule picker + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SchedulePicker
              day={day} start={start} periodName={periodName} periods={periods}
              onChange={(d, s, p) => { setDay(d); setStart(s); setPeriodName(p) }}
            />
            <NavIcon to="/analytics" title="Analytics">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </NavIcon>
            <NavIcon to="/" title="Home">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </NavIcon>
          </div>
        </div>

        {/* ── Long trip alert ───────────────────────────────────────────────────── */}
        <LongTripAlert students={studentsOut} onMarkIn={(name, ts) => manualAction(name, 'in', ts)} />

        {/* ── Student grid ──────────────────────────────────────────────────────── */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '0.25rem 1.25rem 1.5rem' }}>

          {/* Currently Out — dominant, sorted longest first */}
          {studentsOut.length > 0 && (
            <>
              <SectionDivider label="Currently Out" count={studentsOut.length} accent={C.red} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.6rem' }}>
                {studentsOut.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} isOut />)}
              </div>
            </>
          )}

          {/* Back In */}
          {studentsIn.length > 0 && (
            <>
              <SectionDivider label={studentsOut.length > 0 ? 'Back In' : 'In Class'} count={studentsIn.length} accent={C.green} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.5rem' }}>
                {studentsIn.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} isOut={false} />)}
              </div>
            </>
          )}

          {/* Not Scanned — de-emphasized */}
          {studentsUnknown.length > 0 && (
            <>
              <SectionDivider label="Not Scanned" count={studentsUnknown.length} />
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.4rem', opacity: 0.7 }}>
                {studentsUnknown.map(s => <StudentTile key={s.name} s={s} isPeriodActive={isPeriodActive} onAction={manualAction} tick={tick} isOut={false} compact />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Student Tile ─────────────────────────────────────────────────────────────

function StudentTile({ s, isPeriodActive, onAction, tick, isOut, compact }: {
  s: { name: string; status: 'in' | 'out'; hasScanned: boolean; outTimestamp: number | null; lastTrip: number | null; tripCount: number }
  isPeriodActive: boolean
  onAction: (name: string, action: 'in' | 'out', outTimestamp: number | null) => void
  tick: number
  isOut: boolean
  compact?: boolean
}) {
  void tick
  const elapsed = isOut && s.outTimestamp ? Date.now() - s.outTimestamp : 0
  const over10 = elapsed > 600_000
  const over5  = elapsed > 300_000

  // Compact (not-scanned) tile — just name + mark out
  if (compact) {
    return (
      <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: C.slate }}>{s.name}</span>
        {isPeriodActive && (
          <button onClick={() => onAction(s.name, 'out', s.outTimestamp)}
            style={{ padding: '2px 8px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: C.red }}>
            Mark Out
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `${isOut ? (over10 ? '3px' : '2.5px') : '1.5px'} solid ${isOut ? (over10 ? C.red : C.redBorder) : s.hasScanned ? C.greenBorder : C.border}`,
      background: isOut ? (over10 ? 'rgba(239,68,68,0.08)' : C.redBg) : C.white,
      padding: isOut ? '14px' : '10px 12px',
      display: 'flex', flexDirection: 'column',
      animation: over10 && isOut ? 'glowPulse 2s ease-in-out infinite' : 'none',
      transition: 'all 0.2s',
      opacity: isPeriodActive ? 1 : 0.55,
    }}>
      {/* Name + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOut ? 8 : 6 }}>
        <div style={{ fontWeight: 600, fontSize: isOut ? 15 : 14, color: isOut ? (over10 ? '#991b1b' : C.ink) : C.ink }}>{s.name}</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, flexShrink: 0, marginLeft: 4, letterSpacing: '0.5px',
          background: s.status === 'out' ? 'rgba(239,68,68,0.15)' : s.hasScanned ? 'rgba(16,185,129,0.15)' : C.cloud,
          color: s.status === 'out' ? C.red : s.hasScanned ? C.green : C.muted,
        }}>
          {s.status === 'out' ? 'OUT' : s.hasScanned ? 'IN' : '—'}
        </span>
      </div>

      {/* Timer — prominent for out students */}
      {isOut && s.outTimestamp && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: over10 ? '1.5rem' : '1.25rem',
          fontWeight: 700,
          color: over10 ? C.red : over5 ? C.amber : C.ink,
          letterSpacing: '-0.5px',
          marginBottom: 10,
          lineHeight: 1,
        }}>
          {fmt(elapsed)}
        </div>
      )}

      {/* Last trip info for in students */}
      {!isOut && s.lastTrip && (
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
          {fmtDuration(s.lastTrip)}{s.tripCount > 1 ? ` · ${s.tripCount} trips` : ''}
        </div>
      )}

      {/* Action */}
      {isPeriodActive && (
        <div style={{ marginTop: 'auto' }}>
          {isOut ? (
            <button onClick={() => onAction(s.name, 'in', s.outTimestamp)}
              style={{ width: '100%', padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.12)', color: C.green }}>
              Mark In
            </button>
          ) : (
            <button onClick={() => onAction(s.name, 'out', s.outTimestamp)}
              style={{ width: '100%', padding: '5px 0', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: C.red }}>
              Mark Out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
