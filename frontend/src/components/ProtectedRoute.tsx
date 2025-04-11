import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // If not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Get the current path for more readable conditions
  const currentPath = location.pathname;

  // Check if we're on a path that should be exempt from redirects
  const isExemptPath =
    currentPath === "/role-selection" ||
    currentPath === "/driver/setup" ||
    currentPath === "/hitcher/setup" ||
    currentPath.includes("/profile");

  // If user hasn't selected a role yet, redirect to role selection
  if (
    !currentUser.activeRoles?.driver &&
    !currentUser.activeRoles?.hitcher &&
    currentPath !== "/role-selection"
  ) {
    return <Navigate to="/role-selection" replace />;
  }

  // If user is on a driver-specific page but is not an active driver
  if (
    currentPath.startsWith("/driver") &&
    !currentUser.activeRoles?.driver &&
    !isExemptPath
  ) {
    return <Navigate to="/role-selection" replace />;
  }

  // If user is on a hitcher-specific page but is not an active hitcher
  if (
    currentPath.startsWith("/hitcher") &&
    !currentUser.activeRoles?.hitcher &&
    !isExemptPath
  ) {
    return <Navigate to="/role-selection" replace />;
  }

  // If user is a driver but hasn't completed profile and trying to access driver dashboard
  if (
    currentUser.activeRoles?.driver &&
    !currentUser.driverProfileComplete &&
    currentPath === "/driver/dashboard"
  ) {
    return <Navigate to="/driver/setup" replace />;
  }

  // If user is a hitcher but hasn't completed profile and trying to access hitcher dashboard
  if (
    currentUser.activeRoles?.hitcher &&
    !currentUser.hitcherProfileComplete &&
    currentPath === "/hitcher/dashboard"
  ) {
    return <Navigate to="/hitcher/setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
