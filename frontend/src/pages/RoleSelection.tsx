import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Car, Users } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LoadingButton from "../components/LoadingButton";

const RoleSelection: React.FC = () => {
  const { updateActiveRoles, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect admin users to the admin dashboard
  if (currentUser?.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Track selected role
  const [selectedRole, setSelectedRole] = useState<"driver" | "hitcher" | null>(
    null
  );

  const handleRoleSelection = (role: "driver" | "hitcher") => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    // A role must be selected
    if (!selectedRole) {
      alert("Please select a role");
      return;
    }

    try {
      setIsSubmitting(true);
      // Update active roles in the backend
      await updateActiveRoles({
        driver: selectedRole === "driver",
        hitcher: selectedRole === "hitcher",
      });

      // Determine where to navigate based on selected role and profile completion
      if (selectedRole === "driver" && !currentUser?.driverProfileComplete) {
        navigate("/driver/setup");
      } else if (
        selectedRole === "hitcher" &&
        !currentUser?.hitcherProfileComplete
      ) {
        navigate("/hitcher/setup");
      } else if (selectedRole === "driver") {
        navigate("/driver/dashboard");
      } else {
        navigate("/hitcher/dashboard");
      }
    } catch (error) {
      console.error("Error updating roles:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Choose Your Role
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Select how you want to use the PES University Carpooling platform
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => handleRoleSelection("driver")}
            className={`relative w-full flex items-center justify-between p-4 border ${
              selectedRole === "driver"
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-300"
            } rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none`}
          >
            <div className="flex items-center">
              <div
                className={`${
                  selectedRole === "driver" 
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                    : "bg-blue-100"
                } p-3 rounded-full`}
              >
                <Car
                  className={`h-6 w-6 ${
                    selectedRole === "driver" ? "text-white" : "text-blue-600"
                  }`}
                />
              </div>
              <div className="ml-4 text-left">
                <h3 className="text-lg font-medium text-gray-900">Driver</h3>
                <p className="text-sm text-gray-500">
                  I own a vehicle and want to offer rides
                </p>
              </div>
            </div>
            <svg
              className={`h-5 w-5 ${
                selectedRole === "driver" ? "text-blue-500" : "text-gray-400"
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={() => handleRoleSelection("hitcher")}
            className={`relative w-full flex items-center justify-between p-4 border ${
              selectedRole === "hitcher"
                ? "border-green-500 ring-2 ring-green-500"
                : "border-gray-300"
            } rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none`}
          >
            <div className="flex items-center">
              <div
                className={`${
                  selectedRole === "hitcher" ? "bg-green-500" : "bg-green-100"
                } p-3 rounded-full`}
              >
                <Users
                  className={`h-6 w-6 ${
                    selectedRole === "hitcher" ? "text-white" : "text-green-600"
                  }`}
                />
              </div>
              <div className="ml-4 text-left">
                <h3 className="text-lg font-medium text-gray-900">Hitcher</h3>
                <p className="text-sm text-gray-500">
                  I need rides to and from campus
                </p>
              </div>
            </div>
            <svg
              className={`h-5 w-5 ${
                selectedRole === "hitcher" ? "text-green-500" : "text-gray-400"
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <LoadingButton
            onClick={handleContinue}
            disabled={!selectedRole || isSubmitting}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !selectedRole
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
            loadingText="Setting up your profile..."
          >
            Continue
          </LoadingButton>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            You can add the other role later in your profile settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
