import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collections, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { getDocs, query, where, doc, getDoc } from "firebase/firestore";

function Dashboard() {
  const { user } = useAuth();
  const [createdEvents, setCreatedEvents] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const adminEmails = useMemo(
    () =>
      (import.meta.env.VITE_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    []
  );
  const isAdmin = adminEmails.includes((user?.email || "").toLowerCase());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Events created by current user
      const createdSnap = await getDocs(
        query(collections.events(), where("createdByUserId", "==", user.uid))
      );
      setCreatedEvents(createdSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Events where the user is a participant (match by uid or email)
      const participantSnap = await getDocs(
        query(collections.participants(), where("userId", "==", user.uid))
      );
      const emailSnap = await getDocs(
        query(collections.participants(), where("email", "==", user.email))
      );
      const eventIds = [
        ...new Set([
          ...participantSnap.docs.map((d) => d.data().eventId),
          ...emailSnap.docs.map((d) => d.data().eventId),
        ]),
      ];
      const eventDocs = await Promise.all(
        eventIds.map((eventId) => getDoc(doc(db, 'events', eventId)))
      )
      setJoinedEvents(
        eventDocs
          .filter((d) => d.exists())
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
      )
      setLoading(false);
    };
    load();
  }, [user.uid]);

  if (loading) return <div className="card">Loading dashboard...</div>;

  return (
    <div className="grid">
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h2>Your events</h2>
            <Link className="btn" to="/organizer/events/new">
              Create new
            </Link>
          </div>
          {createdEvents.length === 0 && <p>No events yet.</p>}
          <ul className="list">
            {createdEvents.map((evt) => (
              <li key={evt.id} className="list-item">
                <div>
                  <p className="list-title">{evt.title}</p>
                  <p className="muted">{evt.description}</p>
                </div>
                <Link
                  className="btn small"
                  to={`/organizer/events/${evt.id}/manage`}
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card">
        <h2>Events you are in</h2>
        {joinedEvents.length === 0 && <p>Join an event to see it here.</p>}
        <ul className="list">
          {joinedEvents.map((evt) => (
            <li key={evt.id} className="list-item">
              <div>
                <p className="list-title">{evt.title}</p>
                <p className="muted">{evt.description}</p>
              </div>
              <Link className="btn small ghost" to={`/events/${evt.id}`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Dashboard
