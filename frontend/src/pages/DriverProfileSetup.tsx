import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, MapPin, CreditCard, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";

// Add these type declarations at the top of the file
declare global {
  interface Window {
    google: any;
  }
}

// First, define the type for the form data
interface FormData {
  phone: string;
  licenseImage: string;
  gender: string;
  vehicle: {
    model: string;
    color: string;
    registrationNumber: string;
    seats: number;
  };
  homeAddress: string;
  distanceToCollege: number;
  pricePerKm: number | undefined;
}

const DriverProfileSetup: React.FC = () => {
  const { updateDriverProfileComplete, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Start from step 2 if personal details exist
  const [currentStep, setCurrentStep] = useState(
    currentUser?.phone && currentUser?.gender && currentUser?.homeAddress ? 2 : 1
  );

  const [formData, setFormData] = useState<FormData>({
    phone: currentUser?.phone || "",
    licenseImage: "",
    gender: currentUser?.gender || "",
    vehicle: {
      model: "",
      color: "",
      registrationNumber: "",
      seats: 4,
    },
    homeAddress: currentUser?.homeAddress || "",
    distanceToCollege: currentUser?.distanceToCollege || 0,
    pricePerKm: undefined,
  });

  const addressInputRef = useRef<HTMLInputElement>(null);

  // Initialize phone verification states based on existing data
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone?.replace("+91", "") || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(!!currentUser?.phone);

  // Add these state variables to store map and marker references
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;
    
    // Only initialize when on the location step
    if (currentStep === 3) {
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
      if (mapRef.current) {
            const centerCoordinates = currentUser?.college === "PES University Electronic City Campus"
            ? { lat: 12.8614567, lng: 77.6598372, }
            : currentUser?.college === "PES University Ring Road Campus"
            ? { lat: 12.9350592, lng: 77.535673 }
            : { lat: 12.8614567, lng: 77.6598372, };  //default to EC campus

            // Create new map
            const newMap = new google.maps.Map(mapRef.current, {
              center: centerCoordinates,
              zoom: 12,
              mapTypeControl: false,
            });
        
        // Create a marker but don't set position yet
            const newMarker = new google.maps.Marker({
          map: newMap,
              draggable: false,
              visible: false
        });
            
            setMap(newMap);
        setMarker(newMarker);
            
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
                  const position = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                  };
                  
                  newMap.setCenter(position);
                  newMap.setZoom(15);
                  newMarker.setPosition(position);
                  newMarker.setVisible(true);
                  
                  // Calculate distance to college
                  const collegeLocation = currentUser?.college === "PES University Electronic City Campus"
                  ? { lat: 12.8614567, lng: 77.6598372, }
                  : currentUser?.college === "PES University Ring Road Campus"
                  ? { lat: 12.9350592, lng: 77.535673 }
                  : { lat: 12.8614567, lng: 77.6598372, }; // Default to PES University EC Campus
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
    }

    // Cleanup
    return () => {
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [currentStep]); // Only depend on currentStep

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

  const handleVehicleRegistrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatVehicleRegistration(e.target.value);
    
    setFormData((prev) => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        registrationNumber: formattedValue,
      },
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("vehicle.")) {
      const vehicleField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          [vehicleField]: vehicleField === "seats" ? Number(value) : value,
        },
      }));
    } else if (name === "pricePerKm") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? undefined : Number(value),
      }));
    } else {
      setFormData((prev) => {
        return {
        ...prev,
        [name]: value,
        };
      });
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1) {
      if (!isPhoneVerified) {
        setError("Please verify your phone number");
        return;
      }
      if (!formData.gender || formData.gender === "") {
        setError("Please select your gender");
        return;
      }
    }

    // Vehicle Information validation
    if (currentStep === 2) {
      if (!formData.licenseImage) {
        setError("Please enter your license image URL");
        return;
      }
      if (!formData.vehicle.model) {
        setError("Please enter your vehicle model");
        return;
      }
      if (!formData.vehicle.color) {
        setError("Please enter your vehicle color");
        return;
      }
      if (!formData.vehicle.registrationNumber) {
        setError("Please enter your vehicle registration number");
        return;
      }
      if (!formData.vehicle.seats) {
        setError("Please select number of seats");
        return;
      }
    }

    // Location validation
    if (currentStep === 3) {
      if (!formData.homeAddress) {
        setError("Please enter your home address");
        return;
      }
    }

    // Pricing validation
    if (currentStep === 4) {
      if (formData.pricePerKm === undefined || formData.pricePerKm <= 0) {
        setError("Please enter a valid price per kilometer");
        return;
      }
    }
    
    // Clear any existing error
    setError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Skip personal info validation if already exists
    if (!currentUser?.phone) {
      if (!isPhoneVerified) {
        setError("Please verify your phone number");
        return;
      }
      if (!formData.gender || formData.gender === "") {
        setError("Please select your gender");
        return;
      }
    }

    // Always validate vehicle and pricing info
    if (!formData.licenseImage) {
      setError("Please enter your license image URL");
      return;
    }
    if (!formData.vehicle.model) {
      setError("Please enter your vehicle model");
      return;
    }
    if (!formData.vehicle.color) {
      setError("Please enter your vehicle color");
      return;
    }
    if (!formData.vehicle.registrationNumber) {
      setError("Please enter your vehicle registration number");
      return;
    }
    if (!formData.vehicle.seats) {
      setError("Please select number of seats");
      return;
    }
    if (!formData.homeAddress) {
      setError("Please enter your home address");
      return;
    }
    if (formData.pricePerKm === undefined || formData.pricePerKm <= 0) {
      setError("Please enter a valid price per kilometer");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const profileData = {
        phone: currentUser?.phone || `+91${phoneNumber}`,
        homeAddress: currentUser?.homeAddress || formData.homeAddress,
        distanceToCollege: currentUser?.distanceToCollege || formData.distanceToCollege,
        gender: currentUser?.gender || formData.gender,
        driverProfile: {
          isActive: true,
          licenseImage: formData.licenseImage,
          vehicle: {
            model: formData.vehicle.model,
            color: formData.vehicle.color,
            registrationNumber: formData.vehicle.registrationNumber,
            seats: formData.vehicle.seats,
          },
          pricePerKm: formData.pricePerKm,
          completedTripsAsDriver: 0,
        },
        driverProfileComplete: true,
        activeRoles: {
          driver: true,
          hitcher: currentUser?.activeRoles?.hitcher || false,
        },
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/profile/driver`,
        profileData,
        { withCredentials: true }
      );
      await updateDriverProfileComplete(true);
      navigate("/driver/dashboard");
    } catch (error: any) {
      console.error("Error saving driver profile:", error);
      setError(
        error.response?.data?.message ||
          "Failed to save profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
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

  // Update the notification components
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  };

  const SuccessMessage = () => {
    if (!successMessage) return null;
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {successMessage}
      </div>
    );
  };

  // Modify the submit button to show loading state
  const SubmitButton = () => (
    <button
      type="submit"
      disabled={!isPhoneVerified}
      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
        !isPhoneVerified ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
    >
      {isSubmitting ? "Saving..." : "Complete Profile"}
    </button>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Driver Profile Setup
          </h1>
          <p className="text-gray-600">
            Complete your profile to start offering rides
          </p>
        </div>

        {/* Progress Steps - Hide personal info step if already exists */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {!currentUser?.phone && (
              <>
            <div
              className={`flex flex-col items-center ${
                currentStep >= 1 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= 1
                    ? "border-blue-600 bg-blue-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="text-xs mt-1">Personal</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
              }`}
            ></div>
              </>
            )}
            
            <div
              className={`flex flex-col items-center ${
                currentStep >= 2 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= 2
                    ? "border-blue-600 bg-blue-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="text-xs mt-1">Vehicle</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 3 ? "bg-blue-600" : "bg-gray-200"
              }`}
            ></div>
            <div
              className={`flex flex-col items-center ${
                currentStep >= 3 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= 3
                    ? "border-blue-600 bg-blue-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="text-xs mt-1">Location</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 4 ? "bg-blue-600" : "bg-gray-200"
              }`}
            ></div>
            <div
              className={`flex flex-col items-center ${
                currentStep >= 4 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= 4
                    ? "border-blue-600 bg-blue-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">4</span>
              </div>
              <span className="text-xs mt-1">Pricing</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <ErrorMessage />
          <SuccessMessage />
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Information - Only show if not already collected */}
            {currentStep === 1 && !currentUser?.phone && (
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold ml-2">
                    Personal Information
                  </h2>
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

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Vehicle Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold ml-2">
                    Vehicle Information
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="licenseImage"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Driving License Image
                  </label>
                  <input
                    type="text"
                    id="licenseImage"
                    name="licenseImage"
                    value={formData.licenseImage}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your license image URL"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vehicleModel"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicle.model"
                    value={formData.vehicle.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Honda City, Maruti Swift"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vehicleColor"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vehicle Color
                  </label>
                  <input
                    type="text"
                    id="vehicleColor"
                    name="vehicle.color"
                    value={formData.vehicle.color}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., White, Black, Silver"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vehicleRegistration"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vehicle Registration Number
                  </label>
                  <input
                    type="text"
                    id="vehicleRegistration"
                    name="vehicle.registrationNumber"
                    value={formData.vehicle.registrationNumber}
                    onChange={handleVehicleRegistrationChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., KA-01-AB-1234"
                  />
                </div>

                <div>
                  <label
                    htmlFor="seats"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Available Seats
                  </label>
                  <select
                    id="seats"
                    name="vehicle.seats"
                    value={formData.vehicle.seats}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-between">
                  {!currentUser?.hitcherProfileComplete && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={nextStep}
                    className={`bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      !currentUser?.hitcherProfileComplete ? "" : "ml-auto"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <MapPin className="h-6 w-6 text-blue-600" />
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
                    ref={addressInputRef}
                    type="text"
                    id="homeAddress"
                    name="homeAddress"
                    value={formData.homeAddress}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start typing your address..."
                  />
                </div>

                {/* Replace the map placeholder with actual map */}
                <div 
                  ref={mapRef}
                  className="border border-gray-300 rounded-md bg-gray-100 mt-4"
                  style={{ width: '100%', height: '300px' }}
                >
                  {/* Map will be rendered here */}
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold ml-2">Pricing</h2>
                </div>

                <div>
                  <label
                    htmlFor="pricePerKm"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Price per Km (₹)
                  </label>
                  <input
                    type="number"
                    id="pricePerKm"
                    name="pricePerKm"
                    value={
                      formData.pricePerKm === undefined
                        ? ""
                        : formData.pricePerKm
                    }
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter price per Km"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This is the price each passenger will pay per Km of travel.
                    You can adjust this price later.
                    <br />
                    (Ideally, it should be between{" "}
                    <span className="font-bold text-green-500">₹4</span> to{" "}
                    <span className="font-bold text-red-500">₹6</span>)
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800">
                        Ready to go!
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Your profile is almost complete. Review your information
                        and submit to start offering rides.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-600 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <SubmitButton />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default DriverProfileSetup;
