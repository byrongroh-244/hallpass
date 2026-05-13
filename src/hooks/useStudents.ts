import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../firebase/config'
import type { StudentRecord } from '../types'

export function useStudents(): Record<string, StudentRecord> {
  const [students, setStudents] = useState<Record<string, StudentRecord>>({})
  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'students'), snap => {
      setStudents((snap.val() as Record<string, StudentRecord>) ?? {})
    })
    return () => unsubscribe()
  }, [])
  return students
}
