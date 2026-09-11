import { useEffect, useState } from 'react'
import { watchRoster } from '../firebase/roster'
import type { RosterData } from '../firebase/roster'

/**
 * Real-time listener for the roster/ node in Firebase.
 * Returns the full roster data, updating instantly when the editor makes changes.
 */
export function useRoster(): { roster: RosterData; loading: boolean } {
  const [roster, setRoster] = useState<RosterData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = watchRoster(data => {
      setRoster(data)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { roster, loading }
}
