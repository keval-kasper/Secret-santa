import { useMemo, useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { collections, db } from '../firebase'
import { doc, getDoc, getDocs, query, where } from 'firebase/firestore'

// Hidden route; requires ?key=VITE_DEBUG_KEY to display matches.
function DebugAssignments() {
  const { eventId } = useParams()
  const [params] = useSearchParams()
  const [event, setEvent] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)

  const allowed = useMemo(() => {
    const key = params.get('key')
    return key && key === import.meta.env.VITE_DEBUG_KEY
  }, [params])

  useEffect(() => {
    if (!allowed) return
    const load = async () => {
      const evtDoc = await getDoc(doc(db, 'events', eventId))
      if (!evtDoc.exists()) {
        setError('Event not found')
        return
      }
      setEvent({ id: evtDoc.id, ...evtDoc.data() })
      const partSnap = await getDocs(
        query(collections.participants(), where('eventId', '==', eventId))
      )
      setParticipants(partSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      const assignSnap = await getDocs(
        query(collections.assignments(), where('eventId', '==', eventId))
      )
      setAssignments(assignSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }
    load()
  }, [allowed, eventId])

  if (!allowed) return <div className="card">Not authorized.</div>
  if (error) return <div className="card error">{error}</div>

  return (
    <div className="card">
      <h2>Debug assignments for {event?.title}</h2>
      <ul className="list">
        {assignments.map((a) => (
          <li key={a.id} className="list-item">
            <span className="list-title">
              {labelFor(a.giverUserId, participants)} → {labelFor(a.receiverUserId, participants)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function labelFor(id, participants) {
  const found = participants.find((p) => p.userId === id || p.email === id)
  return found ? found.displayName : id
}

export default DebugAssignments
