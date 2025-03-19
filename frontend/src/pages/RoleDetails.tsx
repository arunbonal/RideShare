import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, MapPin, Edit, Save } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";

const RoleDetails: React.FC = () => {
  const { currentUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    vehicleModel: "",
    vehicleColor: "",
    registrationNumber: "",
    seats: "",
    pricePerKm: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Format vehicle registration with proper formatting (KA-01-AB-1234)
  const formatVehicleRegistration = (input: string): string => {
    // Remove any non-alphanumeric characters
    const cleaned = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length <= 2) {
      // First two characters (state code)
      return cleaned;
    } else if (cleaned.length <= 4) {
      // State code + district code
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
    } else if (cleaned.length <= 6) {
      // State + district + series
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4)}`;
    } else {
      // Complete format
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 10)}`;
    }
  };

  // Initialize edit form data when edit mode is activated
  const handleEditClick = () => {
    if (currentUser?.driverProfile) {
      setEditedData({
        vehicleModel: currentUser.driverProfile.vehicle.model,
        vehicleColor: currentUser.driverProfile.vehicle.color,
        registrationNumber: currentUser.driverProfile.vehicle.registrationNumber,
        seats: currentUser.driverProfile.vehicle.seats.toString(),
        pricePerKm: currentUser.driverProfile.pricePerKm.toString()
      });
      setIsEditing(true);
    }
  };

  // Handle input changes in edit form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Clear validation error when field is edited
    setValidationErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[name];
      return newErrors;
    });

    if (name === 'registrationNumber') {
      // Apply formatting for vehicle registration
      const formattedValue = formatVehicleRegistration(value);
      setEditedData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else if (name === 'seats') {
      // Validate seats (must be a number between 1 and 6)
      const numValue = value === '' ? '' : parseInt(value);
      if (numValue !== '' && numValue > 6) {
        setValidationErrors(prev => ({
          ...prev,
          seats: 'Maximum 6 seats allowed'
        }));
      }
      setEditedData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setEditedData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!editedData.vehicleModel.trim()) {
      errors.vehicleModel = 'Vehicle model is required';
    }
    
    if (!editedData.vehicleColor.trim()) {
      errors.vehicleColor = 'Vehicle color is required';
    }
    
    if (!editedData.registrationNumber.trim()) {
      errors.registrationNumber = 'Registration number is required';
    }
    
    if (editedData.seats === '') {
      errors.seats = 'Number of seats is required';
    } else {
      const numSeats = parseInt(editedData.seats);
      if (isNaN(numSeats) || numSeats < 1) {
        errors.seats = 'Number of seats must be at least 1';
      } else if (numSeats > 6) {
        errors.seats = 'Maximum 6 seats allowed';
      }
    }
    
    if (editedData.pricePerKm === '') {
      errors.pricePerKm = 'Price per km is required';
    } else {
      const price = parseFloat(editedData.pricePerKm);
      if (isNaN(price) || price <= 0) {
        errors.pricePerKm = 'Price must be greater than 0';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save updated driver profile
  const handleSaveClick = async () => {
    if (!validateForm()) {
      setNotification({
        show: true,
        message: "Please fix the errors in the form",
        type: "error"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/profile/driver/update`,
        {
          vehicle: {
            model: editedData.vehicleModel,
            color: editedData.vehicleColor,
            registrationNumber: editedData.registrationNumber,
            seats: parseInt(editedData.seats)
          },
          pricePerKm: parseFloat(editedData.pricePerKm)
        },
        { withCredentials: true }
      );

      // Refresh user data to get updated profile
      await refreshUserData();
      
      setNotification({
        show: true,
        message: "Driver profile updated successfully",
        type: "success"
      });
      
      // Exit edit mode
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating driver profile:", error);
      setNotification({
        show: true,
        message: "Failed to update driver profile",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-dismiss notification after 3 seconds
  React.useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
        <div className="flex items-center mb-4 justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold ml-2">Driver Details</h2>
          </div>
          
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Details
            </button>
          ) : (
            <button
              onClick={handleSaveClick}
              disabled={isSubmitting}
              className={`flex items-center ${
                isSubmitting 
                  ? "text-gray-400" 
                  : "text-green-600 hover:text-green-800"
              }`}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>

        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300`}
          >
            <span>{notification.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Vehicle Information
              </h3>
              {!isEditing ? (
                <>
                  <p className="mt-1">Model: {driverProfile.vehicle.model}</p>
                  <p>Color: {driverProfile.vehicle.color}</p>
                  <p>Registration: {driverProfile.vehicle.registrationNumber}</p>
                  <p>Available Seats: {driverProfile.vehicle.seats}</p>
                </>
              ) : (
                <div className="mt-2 space-y-3">
                  <div>
                    <label htmlFor="vehicleModel" className="block text-xs text-gray-600">
                      Vehicle Model
                    </label>
                    <input
                      type="text"
                      id="vehicleModel"
                      name="vehicleModel"
                      value={editedData.vehicleModel}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border ${validationErrors.vehicleModel ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="e.g. Honda Civic"
                    />
                    {validationErrors.vehicleModel && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.vehicleModel}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="vehicleColor" className="block text-xs text-gray-600">
                      Vehicle Color
                    </label>
                    <input
                      type="text"
                      id="vehicleColor"
                      name="vehicleColor"
                      value={editedData.vehicleColor}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border ${validationErrors.vehicleColor ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="e.g. Blue"
                    />
                    {validationErrors.vehicleColor && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.vehicleColor}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="registrationNumber" className="block text-xs text-gray-600">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      id="registrationNumber"
                      name="registrationNumber"
                      value={editedData.registrationNumber}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border ${validationErrors.registrationNumber ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="e.g. KA-01-AB-1234"
                    />
                    {validationErrors.registrationNumber && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.registrationNumber}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="seats" className="block text-xs text-gray-600">
                      Available Seats (Max: 6)
                    </label>
                    <input
                      type="number"
                      id="seats"
                      name="seats"
                      min="1"
                      max="6"
                      value={editedData.seats}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full px-3 py-2 border ${validationErrors.seats ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {validationErrors.seats && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.seats}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Pricing</h3>
              {!isEditing ? (
                <p className="mt-1">Price per Km: ₹{driverProfile.pricePerKm}</p>
              ) : (
                <div className="mt-2">
                  <label htmlFor="pricePerKm" className="block text-xs text-gray-600">
                    Price per Km (₹)
                  </label>
                  <input
                    type="number"
                    id="pricePerKm"
                    name="pricePerKm"
                    min="1"
                    step="0.5"
                    value={editedData.pricePerKm}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full px-3 py-2 border ${validationErrors.pricePerKm ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {validationErrors.pricePerKm && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.pricePerKm}</p>
                  )}
                </div>
              )}
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
