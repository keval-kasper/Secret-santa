import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collections, db, markEventMatched, setAssignments } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { generateAssignments } from '../utils/matching'

function EventView() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [participantRecord, setParticipantRecord] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [status, setStatus] = useState(null)

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
      setLoading(false)
    }
    load()
  }, [eventId, user.uid, user.email])

  const handleDraw = async () => {
    setDrawing(true)
    setStatus(null)
    try {
      // If we already have an assignment, just show it.
      if (assignment) {
        setStatus({ type: 'success', message: 'You already drew a name.' })
        setDrawing(false)
        return
      }

      // If any assignments already exist, do not regenerate to avoid changing others.
      const existingAssignments = await getDocs(
        query(collections.assignments(), where('eventId', '==', eventId))
      )
      if (!existingAssignments.empty) {
        const mine = existingAssignments.docs
          .map((d) => d.data())
          .find((a) => a.giverUserId === user.uid || a.giverUserId === user.email)
        if (mine) {
          setAssignment(mine)
          setStatus({ type: 'success', message: 'Name drawn!' })
        } else {
          setStatus({
            type: 'error',
            message: 'Names already drawn. Ask the admin to reset so you can join.',
          })
        }
        setDrawing(false)
        return
      }

      const allParticipantsSnap = await getDocs(
        query(collections.participants(), where('eventId', '==', eventId))
      )
      const participantList = allParticipantsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setParticipants(participantList)

      const exclSnap = await getDocs(query(collections.exclusions(), where('eventId', '==', eventId)))
      const exclusions = exclSnap.docs.map((d) => d.data())

      const ids = participantList.map((p) => p.userId || p.email)
      if (ids.some((id) => !id)) {
        setStatus({
          type: 'error',
          message: 'Each participant must have an account/email before drawing.',
        })
        setDrawing(false)
        return
      }
      const { success, assignments, error } = generateAssignments(ids, exclusions)
      if (!success) {
        setStatus({ type: 'error', message: error })
        setDrawing(false)
        return
      }
      await setAssignments(
        eventId,
        assignments.map((a) => ({
          giverUserId: a.giverUserId,
          receiverUserId: a.receiverUserId,
        }))
      )
      await markEventMatched(eventId)
      setEvent((prev) => (prev ? { ...prev, isMatchingGenerated: true } : prev))

      const mine = assignments.find(
        (a) => a.giverUserId === user.uid || a.giverUserId === user.email
      )
      setAssignment(mine || null)
      setStatus({ type: 'success', message: 'Name drawn! Locked in.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setDrawing(false)
    }
  }

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
      {status && <p className={status.type === 'error' ? 'error' : 'success'}>{status.message}</p>}
      <div className="callout">
        {assignment ? (
          <p>
            You are buying a gift for: <strong>{receiverName || assignment.receiverUserId}</strong>
          </p>
        ) : (
          <p className="muted">Click draw to get your recipient. This cannot be changed.</p>
        )}
        {!assignment && (
          <button className="btn" onClick={handleDraw} disabled={drawing}>
            {drawing ? 'Drawing...' : 'Draw my name'}
          </button>
        )}
      </div>
    </div>
  )
}

export default EventView
