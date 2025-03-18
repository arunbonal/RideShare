import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";

declare global {
  interface Window {
    google: any;
  }
}

const HitcherProfileSetup: React.FC = () => {
  const { updateHitcherProfileComplete, currentUser } = useAuth();
  const navigate = useNavigate();

  // If user already has personal details, complete profile and redirect
  useEffect(() => {
    const completeHitcherProfile = async () => {
      if (currentUser?.phone && currentUser?.gender && currentUser?.homeAddress) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/profile/hitcher`,
            {
              phone: currentUser.phone,
              gender: currentUser.gender,
              homeAddress: currentUser.homeAddress,
              distanceToCollege: currentUser.distanceToCollege,
              hitcherProfileComplete: true,
              activeRoles: {
                driver: currentUser.activeRoles?.driver || false,
                hitcher: true,
              },
            },
            { withCredentials: true }
          );
          await updateHitcherProfileComplete(true);
          navigate("/hitcher/dashboard");
        } catch (error) {
          console.error("Error auto-completing hitcher profile:", error);
        }
      }
    };

    completeHitcherProfile();
  }, [currentUser, navigate, updateHitcherProfileComplete]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    homeAddress: "",
    gender: "",
    distanceToCollege: 0,
  });

  // Add phone verification states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const addressInputRef = useRef<HTMLInputElement>(null);

  // Add these state variables to store map and marker references
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;
    
    const initAutocomplete = () => {
      if (!addressInputRef.current || !window.google?.maps?.places) {
        return;
      }

      try {
        // Create the autocomplete instance
        autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          componentRestrictions: { country: "IN" },
          fields: ["formatted_address", "geometry", "name", "types"],
          types: ["geocode", "establishment"]
        });
    
        // Initialize the map if mapRef is available
        if (mapRef.current && !map) {
          const newMap = new google.maps.Map(mapRef.current, {
            center: { lat: 12.861203781214266, lng: 77.66466548226559 }, // PES University EC Campus
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
              const collegeLocation = { lat: 12.861203781214266, lng: 77.66466548226559 };
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
                    
                    setFormData(prev => ({
                      ...prev,
                      homeAddress: address,
                      distanceToCollege: distanceInKm
                    }));
                  } else {
                    console.error('Error calculating distance:', status);
                  }
                }
              );
            }
          });
        }
      } catch (error) {
        console.error('Error initializing Places Autocomplete:', error);
      }
    };

    // Try to initialize immediately if Google is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      // If not loaded, wait for the script to load
      const checkGoogleExists = setInterval(() => {
        if (window.google?.maps?.places) {
          initAutocomplete();
          clearInterval(checkGoogleExists);
        }
      }, 100);

      // Clear interval after 10 seconds if Google doesn't load
      setTimeout(() => clearInterval(checkGoogleExists), 10000);
    }

    // Cleanup
    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [map]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const sendVerificationCode = async () => {
    try {
      if (!phoneNumber) {
        setError("Please enter your phone number");
        return;
      }

      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number pattern (10 digits, starting with 6, 7, 8, or 9)
      if (!phoneRegex.test(phoneNumber)) {
        setError("Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)");
        return;
      }

      const formattedPhoneNumber = `+91${phoneNumber}`; // Assuming Indian numbers
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/verify/send`,
        { phoneNumber: formattedPhoneNumber },
        { withCredentials: true }
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
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/verify/verify`,
        { 
          phoneNumber: formattedPhoneNumber,
          code: verificationCode 
        },
        { withCredentials: true }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!isPhoneVerified) {
      setError("Please verify your phone number");
      return;
    }
    if (!formData.gender || formData.gender === "") {
      setError("Please select your gender");
      return;
    }
    if (!formData.homeAddress) {
      setError("Please enter your home address");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/profile/hitcher`,
        {
          ...formData,
          phone: `+91${phoneNumber}`,
          hitcherProfileComplete: true,
          activeRoles: {
            driver: currentUser?.activeRoles?.driver || false,
            hitcher: true,
          },
        },
        { withCredentials: true }
      );

      await updateHitcherProfileComplete(true);
      navigate("/hitcher/dashboard");
    } catch (error) {
      console.error("Error saving hitcher profile:", error);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (!isPhoneVerified) {
      setError("Please verify your phone number");
      return;
    }
    if (!formData.gender || formData.gender === "") {
      setError("Please select your gender");
      return;
    }
    
    // Clear any existing error
    setError(null);
    setCurrentStep((prev) => prev + 1);
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

  // If user already has personal details, show loading state
  if (currentUser?.phone && currentUser?.gender && currentUser?.homeAddress) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Setting up your hitcher profile...
            </h1>
            <p className="text-gray-600 mt-2">
              Please wait while we complete your profile setup
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Hitcher Profile Setup
          </h1>
          <p className="text-gray-600">
            Complete your profile to start searching for rides
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ErrorMessage />
          <SuccessMessage />
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-2 rounded-full">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold ml-2">
                    Personal Information
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
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
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Send Verification Code
                    </button>
                  )}

                  {isVerifying && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    <div className="rounded-md bg-green-50 p-4">
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
                </div>
              </div>
              
              <div>
                <label
                  htmlFor="gender"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>


              {/* Location */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-2 rounded-full">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-semibold ml-2">Your Location</h2>
                </div>

                <div>
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
                    value={formData.homeAddress}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter your home address"
                  />
                </div>

                {/* Replace the map placeholder with actual map */}
                <div 
                  ref={mapRef}
                  className="border border-gray-300 rounded-md h-48 bg-gray-100 mt-4"
                  style={{ width: '100%' }}
                >
                  {/* Map will be rendered here */}
                </div>
              </div>

              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    isSubmitting
                      ? "bg-blue-400"
                      : "bg-blue-600 hover:bg-blue-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {isSubmitting ? "Saving..." : "Complete Profile"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default HitcherProfileSetup;
