import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoadingSpinner from "./components/LoadingSpinner";
import React, { ReactNode } from "react";

// AdminRoute component to protect admin routes
interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { loading, isAuthenticated, currentUser } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated || !currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Root route handler to determine where to redirect based on auth state
const RootRouteHandler = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }
  
  if (!currentUser) {
    return <Login />;
  }
  
  // Admin users should be redirected to admin dashboard
  if (currentUser.isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  if (currentUser.activeRoles?.driver && currentUser.driverProfileComplete) {
    return <Navigate to="/driver/dashboard" replace />;
  }
  
  if (currentUser.activeRoles?.hitcher && currentUser.hitcherProfileComplete) {
    return <Navigate to="/hitcher/dashboard" replace />;
  }
  
  if (!currentUser.activeRoles?.driver && !currentUser.activeRoles?.hitcher) {
    return <Navigate to="/role-selection" replace />;
  }
  
  if (currentUser.activeRoles?.driver && !currentUser.driverProfileComplete) {
    return <Navigate to="/driver/setup" replace />;
  }
  
  if (currentUser.activeRoles?.hitcher && !currentUser.hitcherProfileComplete) {
    return <Navigate to="/hitcher/setup" replace />;
  }
  
  // Default fallback
  return <Navigate to="/role-selection" replace />;
};

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
import AdminDashboard from "./pages/AdminDashboard";
import AdminUserDetails from "./pages/AdminUserDetails";
import AdminRideDetails from './pages/AdminRideDetails';
import Report from "./pages/Report";
import AuthCallback from "./pages/AuthCallback";

// Route change handler component
const RouteChangeHandler = ({ children }: { children: ReactNode }) => {
  const { loading } = useAuth();

  return (
    <>
      {loading && <LoadingSpinner fullScreen />}
      {!loading && children}
    </>
  );
};

function App() {
  return (
    <Router>
      <LoadingProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <Routes>
              {/* Root route with smart redirection */}
              <Route path="/" element={<RootRouteHandler />} />
              <Route path="/login" element={<Navigate to="/" replace />} />

              {/* Auth Callback Route */}
              <Route path="/auth/google/callback" element={<AuthCallback />} />
              
              {/* Protected routes */}
              <Route
                path="/role-selection"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <RoleSelection />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/setup"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <DriverProfileSetup />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hitcher/setup"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <HitcherProfileSetup />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver/dashboard"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <DriverDashboard />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hitcher/dashboard"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <HitcherDashboard />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rides/search"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <RideSearch />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rides/manage"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <RideManagement />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rides/create"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <RideCreation />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <UserProfile />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/settings"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <ProfileSettings />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/role-details"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <RoleDetails />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              {/* Admin route */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <RouteChangeHandler>
                      <AdminDashboard />
                    </RouteChangeHandler>
                  </AdminRoute>
                } 
              />
              <Route 
                path="/admin/users/:id" 
                element={
                  <AdminRoute>
                    <RouteChangeHandler>
                      <AdminUserDetails />
                    </RouteChangeHandler>
                  </AdminRoute>
                } 
              />
              <Route 
                path="/admin/rides/:id" 
                element={
                  <AdminRoute>
                    <RouteChangeHandler>
                      <AdminRideDetails />
                    </RouteChangeHandler>
                  </AdminRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <RouteChangeHandler>
                      <Report />
                    </RouteChangeHandler>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={
                <RouteChangeHandler>
                  <NotFound />
                </RouteChangeHandler>
              } />
            </Routes>
          </div>
        </AuthProvider>
      </LoadingProvider>
    </Router>
  );
}

export default App;
