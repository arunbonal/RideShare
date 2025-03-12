import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, MapPin } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

const RoleDetails: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const renderDriverDetails = (currentUser: any) => {
    if (!currentUser.driverProfileComplete) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Complete your driver profile to view this section.
          </p>
          <button
            onClick={() => navigate("/driver/setup")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Complete Profile
          </button>
        </div>
      );
    }
    const driverProfile = currentUser.driverProfile;
    if (!driverProfile) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-full">
            <Car className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold ml-2">Driver Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Vehicle Information
              </h3>
              <p className="mt-1">Model: {driverProfile.vehicle.model}</p>
              <p>Color: {driverProfile.vehicle.color}</p>
              <p>Registration: {driverProfile.vehicle.registrationNumber}</p>
              <p>Available Seats: {driverProfile.vehicle.seats}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Pricing</h3>
              <p className="mt-1">Price per Km: ₹{driverProfile.pricePerKm}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Statistics</h3>
              <p className="mt-1">
                Completed Trips: {driverProfile.completedTripsAsDriver}
              </p>
              <p>
                Rating: {driverProfile.rating.toFixed(1)} (
                {driverProfile.ratingCount} reviews)
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Personal Details
              </h3>
              <img
                src={driverProfile.licenseImage}
                alt="Driver's License"
                className="mt-1 h-32 w-auto object-cover rounded-md"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHitcherDetails = (currentUser: any) => {
    if (!currentUser.hitcherProfileComplete) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Complete your hitcher profile to view this section.
          </p>
          <button
            onClick={() => navigate("/hitcher/setup")}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Complete Profile
          </button>
        </div>
      );
    }
    const hitcherProfile = currentUser.hitcherProfile;
    if (!hitcherProfile) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-2 rounded-full">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold ml-2">Hitcher Details</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Statistics</h3>
            <p className="mt-1">
              Completed Trips: {hitcherProfile.completedTripsAsHitcher}
            </p>
            <p>
              Rating: {hitcherProfile.rating.toFixed(1)} (
              {hitcherProfile.ratingCount} reviews)
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p>Please log in to view your role details.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/profile/settings")}
          className="flex items-center text-gray-600 mb-6 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </button>

        <div className="bg-white shadow-md rounded-lg p-6">
          {currentUser.activeRoles.driver
            ? renderDriverDetails(currentUser)
            : renderHitcherDetails(currentUser)}
        </div>
      </div>
    </>
  );
};

export default RoleDetails;
