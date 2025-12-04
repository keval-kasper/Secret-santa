import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function OrganizerRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin =
    user && adminEmails.includes((user.email || "").toLowerCase());

  if (loading) return <div className="card">Loading...</div>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isAdmin) {
    return (
      <div className="card">
        <h2>Organizer access only</h2>
        <p className="muted">
          Your email is not in VITE_ADMIN_EMAILS. Ask an organizer to add it or
          use your invited participant link instead.
        </p>
      </div>
    );
  }

  return children;
}

export default OrganizerRoute;
