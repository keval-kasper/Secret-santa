import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import ManageEvent from "./pages/ManageEvent";
import EventView from "./pages/EventView";
import InviteJoin from "./pages/InviteJoin";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import OrganizerRoute from "./components/OrganizerRoute";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/organizer/dashboard"
            element={
              <OrganizerRoute>
                <Dashboard />
              </OrganizerRoute>
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <OrganizerRoute>
                <CreateEvent />
              </OrganizerRoute>
            }
          />
          <Route
            path="/organizer/events/:eventId/manage"
            element={
              <OrganizerRoute>
                <ManageEvent />
              </OrganizerRoute>
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <ProtectedRoute>
                <EventView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invite/:eventId"
            element={
              <ProtectedRoute>
                <InviteJoin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
