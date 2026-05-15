import { useEffect, useState } from 'react'
import { ref, query, orderByChild, equalTo, get, onValue } from 'firebase/database'
import { db } from '../firebase/config'
import type { LogEntry, NormalizedLog, ScheduleDay, StartType } from '../types'
import { todayStr, extractPeriodNumber } from '../utils/schedule'

export function useTodayLogs(): LogEntry[] {
  const [logs, setLogs] = useState<LogEntry[]>([])
  useEffect(() => {
    const q = query(ref(db, 'logs'), orderByChild('date'), equalTo(todayStr()))
    const unsubscribe = onValue(q, snap => {
      const raw = snap.val() as Record<string, LogEntry> | null
      setLogs(raw ? Object.values(raw) : [])
    })
    return () => unsubscribe()
  }, [])
  return logs
}

export function useAllLogs(): { logs: NormalizedLog[]; loading: boolean } {
  const [logs, setLogs] = useState<NormalizedLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use get() for a one-time fetch of all logs
    get(ref(db, 'logs')).then(snap => {
      const raw = snap.val() as Record<string, LogEntry> | null
      if (!raw) { setLogs([]); setLoading(false); return }
      const normalized: NormalizedLog[] = Object.entries(raw).map(([logId, log]) => {
        const parts = (log.schedule ?? '').split('_')
        return {
          logId,
          date: log.date ?? '',
          period: extractPeriodNumber(log.period ?? ''),
          periodName: log.period ?? '',
          schedule: log.schedule ?? '',
          scheduleDay: (parts[0] ?? 'red') as ScheduleDay,
          startType: (parts[1] ?? 'regular') as StartType,
          studentName: log.studentName ?? '',
          action: log.action,
          timestamp: typeof log.timestamp === 'number' ? log.timestamp : Date.now(),
          duration: log.duration ?? 0,
          outTime: log.outTime ?? null,
          inTime: log.inTime ?? null,
        }
      })
      setLogs(normalized)
      setLoading(false)
    }).catch(() => {
      setLogs([])
      setLoading(false)
    })
  }, [])

  return { logs, loading }
}
