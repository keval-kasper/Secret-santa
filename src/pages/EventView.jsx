import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collections, db, addAssignment } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, getDocs, query, where, setDoc } from "firebase/firestore";

function EventView() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [participantRecord, setParticipantRecord] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState(null);

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

        const allParticipantsSnap = await getDocs(
          query(collections.participants(), where("eventId", "==", eventId))
        );
        const participantList = allParticipantsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setParticipants(participantList);

        const memberRecord = participantList.find((p) => {
          const email = (p.email || "").toLowerCase();
          const currentEmail = (user.email || "").toLowerCase();
          return p.userId === user.uid || (email && email === currentEmail);
        });
        setParticipantRecord(memberRecord || null);
        if (memberRecord && !memberRecord.userId) {
          await setDoc(
            doc(db, "eventParticipants", memberRecord.id),
            { userId: user.uid, status: "joined" },
            { merge: true }
          );
        }

        if (memberRecord) {
          const assignmentSnap = await getDocs(
            query(
              collections.assignments(),
              where("eventId", "==", eventId),
              where("giverUserId", "in", [
                user.uid,
                (user.email || "").toLowerCase(),
              ])
            )
          ).catch(async () => {
            const allSnap = await getDocs(
              query(collections.assignments(), where("eventId", "==", eventId))
            );
            return {
              docs: allSnap.docs.filter((d) => {
                const dataInner = d.data();
                const giverId = (dataInner.giverUserId || "").toLowerCase();
                return (
                  giverId === user.uid ||
                  giverId === (user.email || "").toLowerCase()
                );
              }),
            };
          });
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
  }, [eventId, user]);

  const handleDraw = async () => {
    setDrawing(true);
    setStatus(null);
    try {
      console.log("Starting draw process...");

      // Check if I already have an assignment
      const existingAssignments = await getDocs(
        query(collections.assignments(), where("eventId", "==", eventId))
      );

      const myGiverId = user?.uid || (user?.email || "").toLowerCase();
      const myEmail = (user?.email || "").toLowerCase();

      console.log("My giverId:", myGiverId);
      console.log("My email:", myEmail);

      const mine = existingAssignments.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((a) => {
          const giverId = (a.giverUserId || "").toLowerCase();
          return giverId === myGiverId || giverId === myEmail;
        });

      if (mine) {
        setAssignment(mine);
        setStatus({ type: "success", message: "You already drew a name." });
        setDrawing(false);
        return;
      }

      // Get all participants
      const allParticipantsSnap = await getDocs(
        query(collections.participants(), where("eventId", "==", eventId))
      );
      const participantList = allParticipantsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setParticipants(participantList);

      // Get exclusions
      const exclSnap = await getDocs(
        query(collections.exclusions(), where("eventId", "==", eventId))
      );
      const exclusions = exclSnap.docs.map((d) => d.data());

      console.log("All exclusions:", exclusions);

      // Get already assigned receivers (people who have been picked)
      const alreadyAssigned = existingAssignments.docs.map((d) => {
        const data = d.data();
        return (data.receiverUserId || "").toLowerCase();
      });

      // Build list of available receivers (not yet assigned and not myself)
      const myExclusions = exclusions
        .filter((e) => {
          const from = (e.fromUserId || "").toLowerCase();
          const match = from === myGiverId.toLowerCase() || from === myEmail;
          console.log(
            `Exclusion: from=${from}, to=${e.toUserId}, matches me=${match}`
          );
          return match;
        })
        .map((e) => (e.toUserId || "").toLowerCase());

      console.log("My exclusions:", myExclusions);

      const availableReceivers = participantList
        .map((p) => p.userId || (p.email || "").toLowerCase())
        .filter((id) => {
          const normalizedId = (id || "").toLowerCase();
          const isMe =
            normalizedId === myGiverId.toLowerCase() ||
            normalizedId === myEmail;
          const isAssigned = alreadyAssigned.includes(normalizedId);
          const isExcluded = myExclusions.includes(normalizedId);

          console.log(
            `Checking ${normalizedId}: isMe=${isMe}, isAssigned=${isAssigned}, isExcluded=${isExcluded}`
          );

          return !isMe && !isAssigned && !isExcluded;
        });

      console.log("Available receivers:", availableReceivers);

      if (availableReceivers.length === 0) {
        setStatus({
          type: "error",
          message: "No available recipients. Ask admin to reset matches.",
        });
        setDrawing(false);
        return;
      }

      // Pick a random receiver
      const randomIndex = Math.floor(Math.random() * availableReceivers.length);
      const receiverId = availableReceivers[randomIndex];

      // Save my assignment
      const newAssignment = {
        giverUserId: myGiverId,
        receiverUserId: receiverId,
      };

      await addAssignment(eventId, newAssignment);

      setAssignment({ eventId, ...newAssignment });
      setStatus({ type: "success", message: "Name drawn! Locked in." });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setDrawing(false);
    }
  };

  if (loading) return <div className="card">Loading event...</div>;
  if (event?.missing) return <div className="card">Event not found.</div>;

  if (!participantRecord)
    return (
      <div className="card">
        You are not a participant in this event with this email. Ask the admin
        to invite you.
      </div>
    );

  console.log("Assignment:", assignment);
  console.log("Participants:", participants);
  participants.forEach((p) => {
    console.log(
      `Participant: ${p.displayName}, userId: ${p.userId}, email: ${p.email}`
    );
  });
  const receiver = participants.find((p) => {
    const rid = (assignment?.receiverUserId || "").toLowerCase();
    return (
      p.userId === assignment?.receiverUserId ||
      (p.email || "").toLowerCase() === rid
    );
  });
  console.log("Looking for receiverUserId:", assignment?.receiverUserId);
  console.log("Receiver found:", receiver);
  const receiverName = receiver?.displayName || "Unknown";

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
            You are buying a gift for: <strong>{receiverName}</strong>
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p className="muted">
              Click draw to get your recipient. This cannot be changed unless
              admin resets.
            </p>
            <button className="btn" onClick={handleDraw} disabled={drawing}>
              {drawing ? "Drawing..." : "Draw my name"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventView;
