import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEvent } from "../firebase";
import { useAuth } from "../context/AuthContext";

function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    exchangeDate: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const adminEmails = useMemo(
    () =>
      (import.meta.env.VITE_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    []
  );
  const isAdmin = adminEmails.includes((user?.email || "").toLowerCase());

  if (!isAdmin) {
    return (
      <div className="card">
        Only organizers can create events. Ask an organizer to add your email to
        VITE_ADMIN_EMAILS.
      </div>
    );
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const doc = await createEvent({ ...form, createdByUserId: user.uid });
      navigate(`/organizer/events/${doc.id}/manage`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Create a new event</h2>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="3"
          />
        </label>
        <label>
          Budget
          <input name="budget" value={form.budget} onChange={handleChange} />
        </label>
        <label>
          Exchange date
          <input
            type="date"
            name="exchangeDate"
            value={form.exchangeDate}
            onChange={handleChange}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create event"}
        </button>
      </form>
    </div>
  );
}

export default CreateEvent;
