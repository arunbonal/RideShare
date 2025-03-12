import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import RoleSelection from "./pages/RoleSelection";
import DriverDashboard from "./pages/DriverDashboard";
import HitcherDashboard from "./pages/HitcherDashboard";
import DriverProfileSetup from "./pages/DriverProfileSetup";
import HitcherProfileSetup from "./pages/HitcherProfileSetup";
import RideSearch from "./pages/RideSearch";
import RideManagement from "./pages/RideManagement";
import RideCreation from "./pages/RideCreation";
import UserProfile from "./pages/UserProfile";
import ProfileSettings from "./pages/ProfileSettings";
import RoleDetails from "./pages/RoleDetails";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Protected routes */}
            <Route
              path="/role-selection"
              element={
                <ProtectedRoute>
                  <RoleSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/setup"
              element={
                <ProtectedRoute>
                  <DriverProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hitcher/setup"
              element={
                <ProtectedRoute>
                  <HitcherProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver/dashboard"
              element={
                <ProtectedRoute>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hitcher/dashboard"
              element={
                <ProtectedRoute>
                  <HitcherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rides/search"
              element={
                <ProtectedRoute>
                  <RideSearch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rides/manage"
              element={
                <ProtectedRoute>
                  <RideManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rides/create"
              element={
                <ProtectedRoute>
                  <RideCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/settings"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/role-details"
              element={
                <ProtectedRoute>
                  <RoleDetails />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
