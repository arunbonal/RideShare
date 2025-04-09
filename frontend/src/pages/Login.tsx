import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "react-router-dom";

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

  const handleGoogleLogin = () => {
    try {
      setErrorMessage("");
      // Redirect to Google auth with frontend callback URL
      window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`;
    } catch (err) {
      setErrorMessage("Failed to sign in with Google. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Car className="h-16 w-16 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            PES University Carpooling
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
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.522 0-10 4.478-10 10s4.478 10 10 10c8.396 0 10.249-7.85 9.426-11.748l-9.426 0.082z"
                  fill="#4285F4"
                />
              </svg>
              Login in with Google
            </button>
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
