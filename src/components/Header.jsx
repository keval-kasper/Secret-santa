import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Hide organizer link on participant event view pages
  const isParticipantPage = location.pathname.startsWith("/events/");

  return (
    <header className="app-header">
      {isParticipantPage ? (
        <div className="brand">Secret Santa</div>
      ) : (
        <Link to="/" className="brand">
          Secret Santa
        </Link>
      )}
      <nav className="nav-links">
        {user ? (
          <>
            {!isParticipantPage && (
              <Link to="/organizer/dashboard">Organizers</Link>
            )}
            <button className="link-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
