import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateEvent from './pages/CreateEvent'
import ManageEvent from './pages/ManageEvent'
import EventView from './pages/EventView'
import InviteJoin from './pages/InviteJoin'
import DebugAssignments from './pages/DebugAssignments'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/new"
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:eventId/manage"
            element={
              <ProtectedRoute>
                <ManageEvent />
              </ProtectedRoute>
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
          <Route
            path="/debug/:eventId"
            element={
              <ProtectedRoute>
                <DebugAssignments />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
