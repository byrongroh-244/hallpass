/**
 * Typed Firebase write helpers.
 * All student and log writes go through here — one place to change field names,
 * key format, or data shape.
 */
import { ref, set, push, serverTimestamp } from 'firebase/database'
import { db } from './config'
import type { ScheduleDay, StartType } from '../types'

// ─── Key builders ─────────────────────────────────────────────────────────────

/** Firebase key for a student record: red_regular_Liam_Red1-Algebra */
export function studentKey(day: ScheduleDay, start: StartType, name: string, period: string): string {
  const safeName = name.replace(/[.#$[\]/]/g, '_')
  const safePeriod = period.replace(/[.#$[\]/]/g, '_')
  return `${day}_${start}_${safeName}_${safePeriod}`
}

/** Schedule string stored on every record for filtering: "red_regular" */
export function scheduleStr(day: ScheduleDay, start: StartType): string {
  return `${day}_${start}`
}

// ─── Write helpers ────────────────────────────────────────────────────────────

interface ScanOutParams {
  day: ScheduleDay; start: StartType
  name: string; period: string
  outTime: number; date: string
}

export async function writeStudentOut({ day, start, name, period, outTime, date }: ScanOutParams) {
  const key = studentKey(day, start, name, period)
  const sched = scheduleStr(day, start)
  await set(ref(db, `students/${key}`), {
    name, period, schedule: sched, status: 'out',
    timestamp: serverTimestamp(), outTimestamp: serverTimestamp(),
  })
  await push(ref(db, 'logs'), {
    studentName: name, period, schedule: sched, action: 'out',
    timestamp: serverTimestamp(), date,
    outTime, inTime: null, duration: null,
  })
}

interface ScanInParams {
  day: ScheduleDay; start: StartType
  name: string; period: string
  outStart: number; inTime: number; date: string
}

export async function writeStudentIn({ day, start, name, period, outStart, inTime, date }: ScanInParams) {
  const key = studentKey(day, start, name, period)
  const sched = scheduleStr(day, start)
  await set(ref(db, `students/${key}`), {
    name, period, schedule: sched, status: 'in',
    timestamp: serverTimestamp(), outTimestamp: null,
  })
  await push(ref(db, 'logs'), {
    studentName: name, period, schedule: sched, action: 'in',
    timestamp: serverTimestamp(), date,
    outTime: outStart, inTime, duration: inTime - outStart,
  })
}

interface ManualParams {
  day: ScheduleDay; start: StartType
  name: string; period: string
  action: 'manual-in' | 'manual-out'
  outStart: number | null; inTime: number | null
  now: number; date: string
}

export async function writeManualAction({ day, start, name, period, action, outStart, inTime, now, date }: ManualParams) {
  const key = studentKey(day, start, name, period)
  const sched = scheduleStr(day, start)
  const goingOut = action === 'manual-out'
  await set(ref(db, `students/${key}`), {
    name, period, schedule: sched,
    status: goingOut ? 'out' : 'in',
    timestamp: serverTimestamp(),
    outTimestamp: goingOut ? serverTimestamp() : null,
  })
  await push(ref(db, 'logs'), {
    studentName: name, period, schedule: sched, action,
    timestamp: serverTimestamp(), date,
    outTime: goingOut ? now : (outStart ?? now),
    inTime: goingOut ? null : (inTime ?? now),
    duration: goingOut ? null : (inTime ?? now) - (outStart ?? now),
  })
}

interface AutoResetParams {
  name: string; period: string; schedule: string
  studentKey: string
  outStart: number; resetTime: number; date: string
}

export async function writeAutoReset({ name, period, schedule, studentKey: key, outStart, resetTime, date }: AutoResetParams) {
  await set(ref(db, `students/${key}`), {
    name, period, schedule, status: 'in',
    timestamp: serverTimestamp(), outTimestamp: null,
  })
  await push(ref(db, 'logs'), {
    studentName: name, period, schedule, action: 'auto-reset',
    timestamp: serverTimestamp(), date,
    outTime: outStart, inTime: resetTime, duration: resetTime - outStart,
  })
}
