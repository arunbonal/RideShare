import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

// Custom loading overlay component with text
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex flex-col items-center justify-center">
    <p className="text-lg font-medium text-gray-700 mb-4">Switching roles for you</p>
    <LoadingSpinner />
  </div>
);

const RoleSwitcher: React.FC = () => {
  const { currentUser, updateActiveRoles, getCurrentRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRole = getCurrentRole();

  // Check if the user has completed profiles for both roles
  const hasDriverProfile = currentUser?.driverProfileComplete || false;
  const hasHitcherProfile = currentUser?.hitcherProfileComplete || false;

  const handleRoleSwitch = async (role: "driver" | "hitcher") => {
    // If trying to switch to current role, do nothing
    if (role === currentRole) return;

    setLoading(true);
    setError(null);

    try {
      // Update active roles to switch to the selected role
      await updateActiveRoles({
        driver: role === "driver",
        hitcher: role === "hitcher",
      });

      // Check if the profile for the selected role is complete
      if (role === "driver" && !hasDriverProfile) {
        navigate("/driver/setup");
      } else if (role === "hitcher" && !hasHitcherProfile) {
        navigate("/hitcher/setup");
      } else {
        // Navigate to the appropriate dashboard
        navigate(
          role === "driver" ? "/driver/dashboard" : "/hitcher/dashboard"
        );
      }
    } catch (error) {
      console.error("Error switching role:", error);
      setError("Failed to switch role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay />}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Switch Role</h3>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleRoleSwitch("driver")}
            disabled={loading || currentRole === "driver"}
            className={`relative w-full flex items-center p-3 border rounded-lg ${
              currentRole === "driver"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div
              className={`${
                currentRole === "driver" ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-blue-100"
              } p-2 rounded-full`}
            >
              <Car
                className={`h-5 w-5 ${
                  currentRole === "driver" ? "text-white" : "text-blue-600"
                }`}
              />
            </div>
            <div className="ml-3">
              <span className="font-medium">Driver</span>
              {!hasDriverProfile && (
                <span className="ml-2 text-xs text-gray-500">
                  (Profile not set up)
                </span>
              )}
              {currentRole === "driver" && (
                <span className="ml-2 text-xs text-blue-600">(Current role)</span>
              )}
            </div>
          </button>

          <button
            onClick={() => handleRoleSwitch("hitcher")}
            disabled={loading || currentRole === "hitcher"}
            className={`relative w-full flex items-center p-3 border rounded-lg ${
              currentRole === "hitcher"
                ? "border-green-500 bg-green-50"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div
              className={`${
                currentRole === "hitcher" ? "bg-green-500" : "bg-green-100"
              } p-2 rounded-full`}
            >
              <Users
                className={`h-5 w-5 ${
                  currentRole === "hitcher" ? "text-white" : "text-green-600"
                }`}
              />
            </div>
            <div className="ml-3">
              <span className="font-medium">Hitcher</span>
              {!hasHitcherProfile && (
                <span className="ml-2 text-xs text-gray-500">
                  (Profile not set up)
                </span>
              )}
              {currentRole === "hitcher" && (
                <span className="ml-2 text-xs text-green-600">
                  (Current role)
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {currentRole && (
            <p>
              You are currently using the app as a{" "}
              <span className="font-medium">
                {currentRole === "driver" ? "driver" : "hitcher"}
              </span>
              .
            </p>
          )}
          <p className="mt-1">
            {!hasDriverProfile || !hasHitcherProfile
              ? " If you switch to a role without a complete profile, you'll need to set it up first."
              : ""}
          </p>
        </div>
      </div>
    </>
  );
};

export default RoleSwitcher;
