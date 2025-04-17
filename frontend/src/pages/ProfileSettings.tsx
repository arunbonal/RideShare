import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  ArrowLeft,
  LogOut,
  Settings as SettingsIcon,
  FileText,
  Shield,
  Mail,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

const ProfileSettings: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const navigateToProfile = () => {
    navigate("/profile");
  };

  const navigateToRoleDetails = () => {
    navigate("/profile/role-details");
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p>Please log in to view your profile settings.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Profile Settings
            </h1>
          </div>

          <div className="p-6">
            <div className="flex items-start mb-6">
              <div className="flex-shrink-0">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <p className="text-gray-600">{currentUser.email}</p>
                <p className="text-gray-600">SRN: {currentUser.srn}</p>
                {currentUser.activeRoles.driver && currentUser.driverProfile && (
                  <p className="text-sm mt-2 font-medium">
                    <span className="text-gray-600">Driver Reliability: </span>
                    <span className={`${
                      currentUser.driverProfile.reliabilityRate > 80 ? 'text-green-600' : 
                      currentUser.driverProfile.reliabilityRate > 60 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {currentUser.driverProfile.reliabilityRate.toFixed(1)}%
                    </span>
                  </p>
                )}
                {currentUser.activeRoles.hitcher && currentUser.hitcherProfile && (
                  <p className="text-sm mt-2 font-medium">
                    <span className="text-gray-600">Hitcher Reliability: </span>
                    <span className={`${
                      currentUser.hitcherProfile.reliabilityRate > 80 ? 'text-green-600' : 
                      currentUser.hitcherProfile.reliabilityRate > 60 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {currentUser.hitcherProfile.reliabilityRate.toFixed(1)}%
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Account Settings</h3>

              <div className="space-y-3">
                <div
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer border-gray-300 hover:bg-gray-50"
                  onClick={navigateToProfile}
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium">Manage Roles</h4>
                      <p className="text-sm text-gray-600">
                        Switch between driver and hitcher roles
                      </p>
                    </div>
                  </div>
                  <div>
                    <ArrowLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer border-gray-300 hover:bg-gray-50"
                  onClick={navigateToRoleDetails}
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-gray-100">
                      <SettingsIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium">
                        Your Role Details (
                        {currentUser.activeRoles.driver ? "Driver" : "Hitcher"})
                      </h4>
                      <p className="text-sm text-gray-600">
                        Manage your details
                      </p>
                    </div>
                  </div>
                  <div>
                    <ArrowLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 border rounded-lg cursor-pointer border-gray-300 hover:bg-gray-50"
                  onClick={() => navigate("/faq")}
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-blue-100">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium">Frequently Asked Questions</h4>
                      <p className="text-sm text-gray-600">
                        Learn more about features and get help
                      </p>
                    </div>
                  </div>
                  <div>
                    <ArrowLeft className="h-5 w-5 text-gray-400 transform rotate-180" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-3">Account</h3>
              <button
                onClick={handleLogout}
                className="flex items-center text-red-600 hover:text-red-800 font-medium"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span>Logout</span>
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-3">About</h3>
              <div className="space-y-3">
                <Link
                  to="/terms"
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Terms and Conditions</span>
                </Link>
                <Link
                  to="/privacy-policy"
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Privacy Policy</span>
                </Link>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-3">Contact Us</h3>
              <div className="space-y-3">
                <a
                  href="mailto:rideshare.pesu@gmail.com"
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  <span>rideshare.pesu@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSettings;
