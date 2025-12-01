import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collections, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { doc, getDoc, getDocs, query, where } from 'firebase/firestore'

function EventView() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [participantRecord, setParticipantRecord] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (!eventDoc.exists()) {
        setEvent({ missing: true })
        setLoading(false)
        return
      }
      const data = { id: eventDoc.id, ...eventDoc.data() }
      setEvent(data)

      const participantSnap = await getDocs(
        query(
          collections.participants(),
          where('eventId', '==', eventId),
          where('userId', 'in', [user.uid, user.email].filter(Boolean))
        )
      ).catch(async (err) => {
        // Firestore in queries do not accept mixed values; fallback to client filter.
        const fallbackSnap = await getDocs(query(collections.participants(), where('eventId', '==', eventId)))
        return {
          docs: fallbackSnap.docs.filter((d) => {
            const dataInner = d.data()
            return dataInner.userId === user.uid || dataInner.email === user.email
          }),
        }
      })

      const memberRecord = participantSnap.docs[0]?.data()
      setParticipantRecord(memberRecord)

      const allParticipantsSnap = await getDocs(
        query(collections.participants(), where('eventId', '==', eventId))
      )
      const participantList = allParticipantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setParticipants(participantList)

      if (data.isMatchingGenerated) {
        const assignmentSnap = await getDocs(
          query(
            collections.assignments(),
            where('eventId', '==', eventId),
            where('giverUserId', 'in', [user.uid, user.email].filter(Boolean))
          )
        ).catch(async () => {
          // Fallback for older Firestore limits: load all and filter client-side.
          const allSnap = await getDocs(query(collections.assignments(), where('eventId', '==', eventId)))
          return {
            docs: allSnap.docs.filter((d) => {
              const dataInner = d.data()
              return dataInner.giverUserId === user.uid || dataInner.giverUserId === user.email
            }),
          }
        })
        const first = assignmentSnap.docs[0]?.data()
        setAssignment(first || null)
      }
      setLoading(false)
    }
    load()
  }, [eventId, user.uid, user.email])

  if (loading) return <div className="card">Loading event...</div>
  if (event?.missing) return <div className="card">Event not found.</div>
  if (!participantRecord) return <div className="card">You are not a participant in this event.</div>

  const receiverName = participants.find(
    (p) => p.userId === assignment?.receiverUserId || p.email === assignment?.receiverUserId
  )?.displayName

  return (
    <div className="card">
      <h2>{event.title}</h2>
      <p className="muted">{event.description}</p>
      <p>Budget: {event.budget || 'TBD'}</p>
      <p>Exchange date: {event.exchangeDate || 'TBD'}</p>

      {!event.isMatchingGenerated && (
        <p className="muted">Waiting for admin to generate matches.</p>
      )}

      {event.isMatchingGenerated && (
        <div className="callout">
          {assignment ? (
            <p>
              You are buying a gift for: <strong>{receiverName || assignment.receiverUserId}</strong>
            </p>
          ) : (
            <p className="error">No assignment found yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default EventView
