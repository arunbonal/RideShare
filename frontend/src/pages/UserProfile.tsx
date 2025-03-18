import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import RoleSwitcher from "../components/RoleSwitcher";
import {
  User,
  Mail,
  Key,
  LogOut,
  Car,
  Users,
  ArrowLeft,
  Phone,
  MapPin,
} from "lucide-react";
import Navbar from "../components/Navbar";

const UserProfile: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/profile/settings")}
            className="flex items-center text-gray-600 mb-6 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-sm text-gray-600">
              Manage your account and role preferences
            </p>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    {currentUser.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    PES University Electronic City Campus
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-1" /> Email
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentUser.email}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Key className="h-4 w-4 mr-1" /> SRN
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentUser.srn}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <Phone className="h-4 w-4 mr-1" /> Phone Number
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentUser.phone.replace(/^(\+91)(\d+)$/, '$1 $2') || ""}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> Your Address
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentUser.homeAddress}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Role Management
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You can switch between driver and hitcher roles anytime.
                </p>
                <RoleSwitcher />
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Profile Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium">Driver Profile</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      currentUser.driverProfileComplete
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {currentUser.driverProfileComplete
                      ? "Complete"
                      : "Incomplete"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium">Hitcher Profile</span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      currentUser.hitcherProfileComplete
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {currentUser.hitcherProfileComplete
                      ? "Complete"
                      : "Incomplete"}
                  </span>
                </div>
              </div>

              {(!currentUser.driverProfileComplete ||
                !currentUser.hitcherProfileComplete) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-700">
                  <p>
                    <strong>Tip:</strong> Complete both profiles to easily
                    switch between roles anytime.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center text-red-600 hover:text-red-800"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;
