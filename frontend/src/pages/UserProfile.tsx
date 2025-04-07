import React, { useState, useRef, useEffect } from "react";
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
  Edit2,
  X,
  CheckCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import axios from "axios";
import api from "../utils/api"; // Import API utility

declare global {
  interface Window {
    google: any;
  }
}

const UserProfile: React.FC = () => {
  const { currentUser, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [distanceToCollege, setDistanceToCollege] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map references
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      // Initialize address and phone number from current user
      setNewAddress(currentUser.homeAddress || "");
      setPhoneNumber(currentUser.phone?.replace("+91", "") || "");
    }
  }, [currentUser]);

  // Google Maps Integration
  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;
    
    if (isEditingAddress && addressInputRef.current && window.google?.maps?.places) {
      try {
        // Create the autocomplete instance
        autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          componentRestrictions: { country: "IN" },
          fields: ["formatted_address", "geometry", "name", "types"],
          types: ["geocode", "establishment"]
        });
    
        // Initialize the map if mapRef is available
        if (mapRef.current && !map) {
          const centerCoordinates = currentUser?.college === "PES University Electronic City Campus"
            ? { lat: 12.8614567, lng: 77.6598372 }
            : currentUser?.college === "PES University Ring Road Campus"
            ? { lat: 12.9350592, lng: 77.535673 }
            : { lat: 12.8614567, lng: 77.6598372 };  // default to EC campus

          const newMap = new google.maps.Map(mapRef.current, {
            center: centerCoordinates,
            zoom: 12,
            mapTypeControl: false,
          });
          setMap(newMap);
          
          // Create a marker but don't set position yet
          const newMarker = new google.maps.Marker({
            map: newMap,
            draggable: false,
          });
          setMarker(newMarker);

          // If user already has an address, show it on the map
          if (currentUser?.homeAddress) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: currentUser.homeAddress }, (results, status) => {
              if (status === "OK" && results && results[0].geometry) {
                const position = {
                  lat: results[0].geometry.location.lat(),
                  lng: results[0].geometry.location.lng()
                };
                newMap.setCenter(position);
                newMap.setZoom(15);
                newMarker.setPosition(position);
                newMarker.setVisible(true);
                
                // Initialize the distanceToCollege from current user if available
                if (currentUser?.distanceToCollege > 0) {
                  setDistanceToCollege(currentUser.distanceToCollege);
                } else {
                  // Calculate distance if not available
                  const collegeLocation = currentUser?.college === "PES University Electronic City Campus"
                    ? { lat: 12.8614567, lng: 77.6598372 }
                    : currentUser?.college === "PES University Ring Road Campus"
                    ? { lat: 12.9350592, lng: 77.535673 }
                    : { lat: 12.8614567, lng: 77.6598372 };
                  
                  const directionsService = new google.maps.DirectionsService();
                  directionsService.route(
                    {
                      origin: position,
                      destination: collegeLocation,
                      travelMode: google.maps.TravelMode.DRIVING,
                    },
                    (result, status) => {
                      if (status === google.maps.DirectionsStatus.OK && result) {
                        const distanceInKm = Math.round((result.routes[0].legs[0].distance?.value || 0) / 100) / 10;
                        setDistanceToCollege(distanceInKm);
                      }
                    }
                  );
                }
              }
            });
          }
        }
        
        // Add the place changed event listener
        if (autocomplete) {
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete?.getPlace();
            let address = "";
    
            if (place && place.geometry && place.geometry.location) {
              if (place.formatted_address) {
                // Use place name + formatted address for establishments
                address = place.name 
                  ? `${place.name}, ${place.formatted_address}` 
                  : place.formatted_address;
              }
    
              // Update map and marker position
              if (map && marker) {
                const position = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                };
                
                map.setCenter(position);
                map.setZoom(15);
                marker.setPosition(position);
                marker.setVisible(true);
              }
              
              // Calculate distance to college
              const collegeLocation = currentUser?.college === "PES University Electronic City Campus"
                ? { lat: 12.8614567, lng: 77.6598372 }
                : currentUser?.college === "PES University Ring Road Campus"
                ? { lat: 12.9350592, lng: 77.535673 }
                : { lat: 12.8614567, lng: 77.6598372 }; // Default to PES University EC Campus
              const origin = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              
              const directionsService = new google.maps.DirectionsService();
              directionsService.route(
                {
                  origin: origin,
                  destination: collegeLocation,
                  travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                  if (status === google.maps.DirectionsStatus.OK && result) {
                    // Get distance in kilometers (rounded to 1 decimal place)
                    const distanceInKm = Math.round((result.routes[0].legs[0].distance?.value || 0) / 100) / 10;
                    setNewAddress(address);
                    setDistanceToCollege(distanceInKm);
                  } else {
                    console.error('Error calculating distance:', status);
                    setDistanceToCollege(0); // Reset distance on error
                  }
                }
              );
            }
          });
        }
      } catch (error) {
        console.error('Error initializing Places Autocomplete:', error);
      }
    }

    // Cleanup
    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [isEditingAddress, currentUser, map]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleCloseModal = () => {
    setIsEditingAddress(false);
    setIsEditingPhone(false);
    setError(null);
    setSuccessMessage(null);
    setIsVerifying(false);
    setIsPhoneVerified(false);
    setVerificationCode("");
    
    // Reset address and distance states
    if (currentUser) {
      setNewAddress(currentUser.homeAddress || "");
      setDistanceToCollege(currentUser.distanceToCollege || 0);
    }
  };

  const sendVerificationCode = async () => {
    try {
      if (!phoneNumber) {
        setError("Please enter your phone number");
        return;
      }

      // Check if the phone number has changed
      if (phoneNumber === currentUser?.phone?.replace("+91", "")) {
        setError("This is your current phone number. Please enter a different number to change.");
        return;
      }

      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number pattern (10 digits, starting with 6, 7, 8, or 9)
      if (!phoneRegex.test(phoneNumber)) {
        setError("Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)");
        return;
      }

      const formattedPhoneNumber = `+91${phoneNumber}`; // Assuming Indian numbers
      const response = await api.post(
        "/api/verify/send",
        { phoneNumber: formattedPhoneNumber }
      );
      
      if (response.data.success) {
        setIsVerifying(true);
        setError(null);
        setSuccessMessage("Verification code sent successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error("Error sending code:", error);
      let errorMessage = "Error sending verification code. Please try again.";
      
      // Check for specific Twilio error messages
      if (error.response?.data?.message?.includes("unverified")) {
        errorMessage = "This phone number is not verified in our system. For development, please use one of these test numbers: +14155552671, +14155552672, +14155552673, +14155552674, or +14155552675";
      }
      
      setError(errorMessage);
      setSuccessMessage(null);
    }
  };

  const verifyCode = async () => {
    try {
      if (!verificationCode) {
        setError("Please enter the verification code");
        return;
      }

      const formattedPhoneNumber = `+91${phoneNumber}`;
      const response = await api.post(
        "/api/verify/verify",
        { 
          phoneNumber: formattedPhoneNumber,
          code: verificationCode 
        }
      );
      
      if (response.data.success) {
        setIsPhoneVerified(true);
        setIsVerifying(false);
        setError(null);
        setSuccessMessage("Phone number verified successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      const errorMessage = error.response?.data?.message || "Invalid verification code. Please try again.";
      setError(errorMessage);
      setSuccessMessage(null);
    }
  };

  const updateAddress = async () => {
    // Check if address has changed
    if (newAddress === currentUser?.homeAddress) {
      setError("This is your current address. Please enter a different address to change.");
      return;
    }

    if (!newAddress) {
      setError("Please enter a valid address");
      return;
    }

    // Ensure distance to college is calculated
    if (distanceToCollege <= 0) {
      setError("Unable to calculate distance to college. Please select a valid address that can be routed to your college.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(
        "/api/profile/update",
        {
          homeAddress: newAddress,
          distanceToCollege: distanceToCollege
        }
      );
      await refreshUserData();
      setSuccessMessage("Address updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        handleCloseModal();
      }, 2000);
    } catch (error: any) {
      console.error("Error updating address:", error);
      
      // Special handling for active rides error
      if (error.response?.status === 403 && error.response?.data?.hasActiveRides) {
        let message = "Unable to update your address while you have active rides. ";
        
        if (error.response.data.driverRides > 0 && error.response.data.hitcherRides > 0) {
          message += "You currently have rides scheduled as both a driver and a hitcher.";
        } else if (error.response.data.driverRides > 0) {
          message += "You currently have rides scheduled as a driver.";
        } else if (error.response.data.hitcherRides > 0) {
          message += "You currently have rides scheduled as a hitcher.";
        }
        
        message += " Please complete or cancel these rides before changing your address.";
        setError(message);
      } else {
        setError("Failed to update address. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePhone = async () => {
    if (!isPhoneVerified) {
      setError("Please verify your phone number first");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(
        "/api/profile/update",
        {
          phone: `+91${phoneNumber}`
        }
      );
      await refreshUserData();
      setSuccessMessage("Phone number updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        handleCloseModal();
      }, 2000);
    } catch (error) {
      console.error("Error updating phone number:", error);
      setError("Failed to update phone number. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Error message component
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  };

  // Success message component
  const SuccessMessage = () => {
    if (!successMessage) return null;
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {successMessage}
      </div>
    );
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
                    {currentUser.college}
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
                      <button
                        onClick={() => setIsEditingPhone(true)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        title="Edit phone number"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentUser.phone ? currentUser.phone.replace(/^(\+91)(\d+)$/, '$1 $2') : ""}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" /> Your Address
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        title="Edit address"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
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

      {/* Address Edit Modal */}
      {isEditingAddress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Update Home Address</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <ErrorMessage />
              <SuccessMessage />
              
              <div className="mb-4">
                <label
                  htmlFor="homeAddress"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Home Address
                </label>
                <input
                  type="text"
                  id="homeAddress"
                  name="homeAddress"
                  ref={addressInputRef}
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your home address"
                />
              </div>
              
              <div
                ref={mapRef}
                className="border border-gray-300 rounded-md h-64 bg-gray-100 mb-4"
                style={{ width: '100%' }}
              >
                {/* Map will be rendered here */}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updateAddress}
                  disabled={isSubmitting || distanceToCollege === 0}
                  className={`px-4 py-2 text-white rounded-md ${
                    isSubmitting || distanceToCollege === 0 ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Update Address"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Edit Modal */}
      {isEditingPhone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Update Phone Number</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <ErrorMessage />
              <SuccessMessage />
              
              <div className="mb-4">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone Number
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your phone number"
                    disabled={isPhoneVerified}
                  />
                </div>
              </div>

              {!isPhoneVerified && !isVerifying && (
                <button
                  type="button"
                  onClick={sendVerificationCode}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4"
                >
                  Send Verification Code
                </button>
              )}

              {isVerifying && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter verification code"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={verifyCode}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Verify Code
                  </button>
                </div>
              )}

              {isPhoneVerified && (
                <div className="rounded-md bg-green-50 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Phone number verified successfully
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={updatePhone}
                  disabled={!isPhoneVerified || isSubmitting}
                  className={`px-4 py-2 text-white rounded-md ${
                    !isPhoneVerified || isSubmitting
                      ? "bg-blue-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Update Phone"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserProfile;
