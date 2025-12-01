import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  addExclusion,
  addParticipant,
  collections,
  db,
  resetAssignments,
  removeParticipant,
  updateParticipantAccessCode,
} from "../firebase";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, getDocs, query, where } from "firebase/firestore";

function ManageEvent() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [participantForm, setParticipantForm] = useState({
    displayName: "",
    email: "",
  });
  const [exclusionForm, setExclusionForm] = useState({
    fromUserId: "",
    toUserId: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (!eventDoc.exists()) {
        setEvent({ missing: true });
        setLoading(false);
        return;
      }
      const data = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(data);

      const partSnap = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      setParticipants(partSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const exclSnap = await getDocs(
        query(collections.exclusions(), where("eventId", "==", eventId))
      );
      setExclusions(exclSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, [eventId]);

  const isOwner = useMemo(
    () => event?.createdByUserId === user?.uid,
    [event, user]
  );

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      // Generate a unique 6-digit access code
      const accessCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // Try to match email to an existing user to capture userId for assignments.
      const existingUserSnap = await getDocs(
        query(collections.users(), where("email", "==", participantForm.email))
      );
      const linkedUserId = existingUserSnap.empty
        ? null
        : existingUserSnap.docs[0].id;
      await addParticipant({
        eventId,
        displayName: participantForm.displayName,
        email: participantForm.email,
        userId: linkedUserId,
        status: linkedUserId ? "joined" : "invited",
        accessCode,
      });
      setParticipantForm({ displayName: "", email: "" });
      const refreshed = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      setParticipants(refreshed.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStatus({
        type: "success",
        message: `Participant added. Access code: ${accessCode}`,
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const handleAddExclusion = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await addExclusion({ eventId, ...exclusionForm });
      setExclusionForm({ fromUserId: "", toUserId: "" });
      const exclSnap = await getDocs(
        query(collections.exclusions(), where("eventId", "==", eventId))
      );
      setExclusions(exclSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStatus({ type: "success", message: "Exclusion saved." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const handleReset = async () => {
    setStatus(null);
    await resetAssignments(eventId);
    setEvent((prev) => (prev ? { ...prev, isMatchingGenerated: false } : prev));
    setStatus({
      type: "success",
      message: "Assignments cleared. Participants can draw again.",
    });
  };

  const handleDeleteParticipant = async (participantId) => {
    if (!confirm("Are you sure you want to delete this participant?")) return;
    setStatus(null);
    try {
      await removeParticipant(participantId);
      const refreshed = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      setParticipants(refreshed.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStatus({ type: "success", message: "Participant deleted." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const handleRegenerateAllCodes = async () => {
    if (
      !confirm(
        "Regenerate access codes for all participants? Old codes will stop working."
      )
    )
      return;
    setStatus(null);
    try {
      const updates = participants.map(async (p) => {
        const newCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        await updateParticipantAccessCode(p.id, newCode);
        return { ...p, accessCode: newCode };
      });
      await Promise.all(updates);
      const refreshed = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      setParticipants(refreshed.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStatus({ type: "success", message: "All access codes regenerated!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  if (loading) return <div className="card">Loading event...</div>;
  if (event?.missing) return <div className="card">Event not found.</div>;
  if (!isOwner)
    return (
      <div className="card">
        You do not have permission to manage this event.
      </div>
    );

  return (
    <div className="grid">
      <div className="card">
        <h2>{event.title}</h2>
        <p className="muted">{event.description}</p>
        <p>Budget: {event.budget || "TBD"}</p>
        <p>Exchange date: {event.exchangeDate || "TBD"}</p>
        <p>Matching generated: {event.isMatchingGenerated ? "Yes" : "No"}</p>
        {status && (
          <p className={status.type === "error" ? "error" : "success"}>
            {status.message}
          </p>
        )}
        <div className="callout">
          <p>
            <strong>Share this link with participants:</strong>
          </p>
          <code>{`${window.location.origin}${window.location.pathname}#/events/${eventId}`}</code>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Each participant will need their unique access code (shown below)
          </p>
        </div>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Participants</h3>
          <button className="btn small" onClick={handleRegenerateAllCodes}>
            Regenerate All Codes
          </button>
        </div>
        <form className="form inline" onSubmit={handleAddParticipant}>
          <input
            placeholder="Name"
            value={participantForm.displayName}
            onChange={(e) =>
              setParticipantForm((f) => ({ ...f, displayName: e.target.value }))
            }
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={participantForm.email}
            onChange={(e) =>
              setParticipantForm((f) => ({ ...f, email: e.target.value }))
            }
            required
          />
          <button className="btn small" type="submit">
            Add
          </button>
        </form>
        <ul className="list">
          {participants.map((p) => (
            <li key={p.id} className="list-item">
              <div>
                <p className="list-title">{p.displayName}</p>
                <p className="muted">{p.email}</p>
                {p.accessCode && (
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Access code: <strong>{p.accessCode}</strong>
                  </p>
                )}
              </div>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                <span className="pill">{p.status || "invited"}</span>
                <button
                  className="btn small"
                  onClick={() => handleDeleteParticipant(p.id)}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Exclusions</h3>
        <form className="form inline" onSubmit={handleAddExclusion}>
          <select
            value={exclusionForm.fromUserId}
            onChange={(e) =>
              setExclusionForm((f) => ({ ...f, fromUserId: e.target.value }))
            }
            required
          >
            <option value="">From (giver)</option>
            {participants.map((p) => (
              <option key={p.id} value={p.userId || p.email}>
                {p.displayName}
              </option>
            ))}
          </select>
          <select
            value={exclusionForm.toUserId}
            onChange={(e) =>
              setExclusionForm((f) => ({ ...f, toUserId: e.target.value }))
            }
            required
          >
            <option value="">To (receiver)</option>
            {participants.map((p) => (
              <option key={p.id} value={p.userId || p.email}>
                {p.displayName}
              </option>
            ))}
          </select>
          <button className="btn small" type="submit">
            Add exclusion
          </button>
        </form>
        <ul className="list">
          {exclusions.map((excl) => (
            <li key={excl.id} className="list-item">
              <div>
                <p className="list-title">
                  {displayFor(excl.fromUserId, participants)} →{" "}
                  {displayFor(excl.toUserId, participants)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>Reset matches</h3>
        <p className="muted">
          Clears all assignments so everyone can draw again.
        </p>
        <button className="btn" onClick={handleReset}>
          Reset assignments
        </button>
      </div>
    </div>
  );
}

function displayFor(id, participants) {
  const found = participants.find((p) => (p.userId || p.email) === id);
  return found ? found.displayName : id;
}

export default ManageEvent;
