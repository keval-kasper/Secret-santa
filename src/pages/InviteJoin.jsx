import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { addParticipant, collections, db } from '../firebase'
import { doc, getDoc, getDocs, query, where } from 'firebase/firestore'

function InviteJoin() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const join = async () => {
      if (!user) return
      setLoading(true)
      const evtDoc = await getDoc(doc(db, 'events', eventId))
      if (!evtDoc.exists()) {
        setEvent({ missing: true })
        setLoading(false)
        return
      }
      const data = { id: evtDoc.id, ...evtDoc.data() }
      setEvent(data)

      const existing = await getDocs(
        query(
          collections.participants(),
          where('eventId', '==', eventId),
          where('userId', '==', user.uid)
        )
      )
      if (existing.empty) {
        await addParticipant({
          eventId,
          userId: user.uid,
          displayName: user.displayName || user.email,
          email: user.email,
          status: 'joined',
        })
        setStatus({ type: 'success', message: 'Joined! You can now draw a name.' })
      } else {
        setStatus({ type: 'success', message: 'Already joined.' })
      }
      setLoading(false)
    }
    join()
  }, [eventId, user])

  if (!user) {
    return (
      <div className="card">
        <h2>Join event</h2>
        <p className="muted">Log in first, then revisit this link to join.</p>
      </div>
    )
  }

  if (loading) return <div className="card">Preparing your invite...</div>
  if (event?.missing) return <div className="card">Event not found.</div>

  return (
    <div className="card">
      <h2>Invited to: {event.title}</h2>
      <p className="muted">{event.description}</p>
      {status && <p className={status.type === 'error' ? 'error' : 'success'}>{status.message}</p>}
      <button className="btn" onClick={() => navigate(`/events/${eventId}`)}>
        Go to event
      </button>
    </div>
  )
}

export default InviteJoin
