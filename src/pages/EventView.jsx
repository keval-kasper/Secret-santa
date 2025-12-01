import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { collections, db, markEventMatched, setAssignments } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { generateAssignments } from "../utils/matching";

function EventView() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get("code");
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [participantRecord, setParticipantRecord] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (!eventDoc.exists()) {
          setEvent({ missing: true });
          setLoading(false);
          return;
        }
        const data = { id: eventDoc.id, ...eventDoc.data() };
        setEvent(data);

        // Check if access code authentication is needed
        if (!user && !accessCode) {
          setLoading(false);
          return;
        }

        let participantQuery;
        if (user) {
          // Traditional user-based auth (for event owners)
          participantQuery = await getDocs(
            query(
              collections.participants(),
              where("eventId", "==", eventId),
              where("userId", "in", [user.uid, user.email].filter(Boolean))
            )
          ).catch(async () => {
            const fallbackSnap = await getDocs(
              query(collections.participants(), where("eventId", "==", eventId))
            );
            return {
              docs: fallbackSnap.docs.filter((d) => {
                const dataInner = d.data();
                return (
                  dataInner.userId === user.uid ||
                  dataInner.email === user.email
                );
              }),
            };
          });
        } else if (accessCode) {
          // Access code based auth (for participants)
          participantQuery = await getDocs(
            query(
              collections.participants(),
              where("eventId", "==", eventId),
              where("accessCode", "==", accessCode)
            )
          );
        }

        const memberRecord = participantQuery?.docs[0]?.data();
        if (memberRecord) {
          setParticipantRecord(memberRecord);
          setAuthenticated(true);
        }

        const allParticipantsSnap = await getDocs(
          query(collections.participants(), where("eventId", "==", eventId))
        );
        const participantList = allParticipantsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setParticipants(participantList);

        if (memberRecord) {
          const assignmentSnap = await getDocs(
            query(
              collections.assignments(),
              where("eventId", "==", eventId),
              where("giverId", "==", memberRecord.id || memberRecord.email)
            )
          );
          const first = assignmentSnap.docs[0]?.data();
          setAssignment(first || null);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error loading event:", error);
        setStatus({ type: "error", message: error.message });
        setLoading(false);
      }
    };
    load();
  }, [eventId, user, accessCode]);

  const handleDraw = async () => {
    setDrawing(true);
    setStatus(null);
    try {
      console.log("Starting draw process...");
      // If we already have an assignment, just show it.
      if (assignment) {
        setStatus({ type: "success", message: "You already drew a name." });
        setDrawing(false);
        return;
      }

      console.log("Checking for existing assignments...");
      // If any assignments already exist, do not regenerate to avoid changing others.
      const existingAssignments = await getDocs(
        query(collections.assignments(), where("eventId", "==", eventId))
      );
      if (!existingAssignments.empty) {
        const mine = existingAssignments.docs
          .map((d) => d.data())
          .find(
            (a) => a.giverUserId === user?.uid || a.giverUserId === user?.email || a.giverUserId === participantRecord?.email
          );
        if (mine) {
          setAssignment(mine);
          setStatus({ type: "success", message: "Name drawn!" });
        } else {
          setStatus({
            type: "error",
            message:
              "Names already drawn. Ask the admin to reset so you can join.",
          });
        }
        setDrawing(false);
        return;
      }

      console.log("Getting participants...");
      const allParticipantsSnap = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      const participantList = allParticipantsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setParticipants(participantList);

      console.log("Getting exclusions...");
      const exclSnap = await getDocs(
        query(collections.exclusions(), where("eventId", "==", eventId))
      );
      const exclusions = exclSnap.docs.map((d) => d.data());

      const ids = participantList.map((p) => p.userId || p.email);
      if (ids.some((id) => !id)) {
        setStatus({
          type: "error",
          message:
            "Each participant must have an account/email before drawing.",
        });
        setDrawing(false);
        return;
      }
      console.log("Generating assignments for:", ids);
      const { success, assignments, error } = generateAssignments(
        ids,
        exclusions
      );
      if (!success) {
        setStatus({ type: "error", message: error });
        setDrawing(false);
        return;
      }
      console.log("Saving assignments...", assignments);
      await setAssignments(
        eventId,
        assignments.map((a) => ({
          giverUserId: a.giverUserId,
          receiverUserId: a.receiverUserId,
        }))
      );
      await markEventMatched(eventId);
      setEvent((prev) =>
        prev ? { ...prev, isMatchingGenerated: true } : prev
      );

      const mine = assignments.find(
        (a) => a.giverUserId === user.uid || a.giverUserId === user.email
      );
      setAssignment(mine || null);
      setStatus({ type: "success", message: "Name drawn! Locked in." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setDrawing(false);
    }
  };

  if (loading) return <div className="card">Loading event...</div>;
  if (event?.missing) return <div className="card">Event not found.</div>;

  // Show access code input if not authenticated
  if (!authenticated && !user) {
    return (
      <div className="card">
        <h2>{event?.title || "Secret Santa Event"}</h2>
        <p>Enter your access code to view your assignment:</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = `#/events/${eventId}?code=${codeInput}`;
            window.location.reload();
          }}
        >
          <label>
            Access Code
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Enter your 6-digit code"
              required
            />
          </label>
          <button className="btn" type="submit">
            Access Event
          </button>
        </form>
        <p className="muted">Don't have a code? Ask the event organizer.</p>
      </div>
    );
  }

  if (!participantRecord)
    return (
      <div className="card">
        Invalid access code or you are not a participant in this event.
      </div>
    );

  const receiverName = participants.find(
    (p) =>
      p.userId === assignment?.receiverUserId ||
      p.email === assignment?.receiverUserId
  )?.displayName;

  return (
    <div className="card">
      <h2>{event.title}</h2>
      <p className="muted">{event.description}</p>
      <p>Budget: {event.budget || "TBD"}</p>
      <p>Exchange date: {event.exchangeDate || "TBD"}</p>
      {status && (
        <p className={status.type === "error" ? "error" : "success"}>
          {status.message}
        </p>
      )}
      <div className="callout">
        {assignment ? (
          <p>
            You are buying a gift for:{" "}
            <strong>{receiverName || assignment.receiverUserId}</strong>
          </p>
        ) : (
          <p className="muted">
            Click draw to get your recipient. This cannot be changed.
          </p>
        )}
        {!assignment && (
          <button className="btn" onClick={handleDraw} disabled={drawing}>
            {drawing ? "Drawing..." : "Draw my name"}
          </button>
        )}
      </div>
    </div>
  );
}

export default EventView;
