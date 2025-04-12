import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";
import LoadingButton from "../components/LoadingButton";

const Login: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const location = useLocation();
  const { loading, isAuthenticated, currentUser, getCurrentRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for error parameters in the URL
    const params = new URLSearchParams(location.search);
    const error = params.get("error");

    if (error === "invalid-email") {
      setErrorMessage(
        "Please sign in with your PESU Gmail ID (<srn>@pesu.pes.edu)"
      );
    }

    // Optionally clear the URL parameter after reading it
    if (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      // Check if user is an admin
      if (currentUser.isAdmin) {
        navigate("/admin");
        return;
      }

      // Check if user has any active roles
      const hasActiveRoles =
        currentUser.activeRoles?.driver || currentUser.activeRoles?.hitcher;

      // If no active roles, redirect to role selection
      if (!hasActiveRoles) {
        navigate("/role-selection");
        return;
      }

      // Get the current active role
      const currentRole = getCurrentRole();

      // Redirect based on active role and profile completion status
      if (currentRole === "driver") {
        if (currentUser.driverProfileComplete) {
          navigate("/driver/dashboard");
        } else {
          navigate("/driver/setup");
        }
      } else if (currentRole === "hitcher") {
        if (currentUser.hitcherProfileComplete) {
          navigate("/hitcher/dashboard");
        } else {
          navigate("/hitcher/setup");
        }
      } else {
        // Fallback if no role is active
        navigate("/role-selection");
      }
    }
  }, [isAuthenticated, currentUser, navigate, getCurrentRole]);

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage("");
      // Redirect to Google auth with frontend callback URL
      window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
      // Return a Promise that doesn't resolve since we're redirecting
      return new Promise<void>(() => {});
    } catch (err) {
      setErrorMessage("Failed to sign in with Google. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Main content */}
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-xl relative z-10">
        <div className="text-center">
          <div className="flex justify-center">
            <Car className="h-16 w-16 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            RideShare
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Share rides with fellow students at PES University
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        <div className="mt-6">
          <div className="mt-6">
            <LoadingButton
              onClick={handleGoogleLogin}
              disabled={loading}
              className="h-10 w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100"
              loadingText="Logging in with Google..."
              preserveHeight={true}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Login with Google
            </LoadingButton>
          </div>
        </div>

        <p className="mt-2 text-center text-sm text-gray-600">
          Note: Only PES University email addresses (@pesu.pes.edu) are allowed
          to register
        </p>
      </div>
    </div>
  );
};

export default Login;
