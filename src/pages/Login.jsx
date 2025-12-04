import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { collections } from "../firebase";
import { getDocs, query, where } from "firebase/firestore";

function Login() {
  const {
    loginGoogle,
    authError,
    setAuthError,
    logout,
  } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const userAllowed = async (emailToCheck) => {
    if (adminEmails.includes(emailToCheck.toLowerCase())) return true;
    const invited = await getDocs(
      query(collections.participants(), where("email", "==", emailToCheck))
    );
    return !invited.empty;
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const u = await loginGoogle();
      const allowed = await userAllowed(u.email || "");
      if (!allowed) {
        setAuthError("You are not invited to any event. Ask the admin to add your email.");
        await logout();
        return;
      }
      navigate(redirectTo);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Log in</h2>
      <p className="muted">Sign in with Google using the email the admin invited.</p>
      <div className="actions">
        <button className="btn" onClick={handleGoogle} disabled={googleLoading}>
          {googleLoading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
      {authError && <p className="error">{authError}</p>}
    </div>
  );
}

export default Login;
