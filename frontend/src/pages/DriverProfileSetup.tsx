import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, MapPin, CreditCard, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import api from "../utils/api"; // Import API utility
import LoadingButton from "../components/LoadingButton";

// Add these type declarations at the top of the file
declare global {
  interface Window {
    google: any;
  }
}

// First, define the type for the form data
interface FormData {
  phone: string;
  gender: string;
  vehicle: {
    model: string;
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
  const [errorOpacity, setErrorOpacity] = useState(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registrationFormat, setRegistrationFormat] = useState<'letter' | 'digit' | null>(null);
  const [registrationPlaceholder, setRegistrationPlaceholder] = useState("KA-01-AB-1234");
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1);

  // Start from step 2 if personal details exist
  const [currentStep, setCurrentStep] = useState(
    currentUser?.phone && currentUser?.gender && currentUser?.homeAddress ? 2 : 1
  );

  const [formData, setFormData] = useState<FormData>({
    phone: currentUser?.phone || "",
    gender: currentUser?.gender || "",
    vehicle: {
      model: "",
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
  const [isLoadingVerification, setIsLoadingVerification] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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
          // Note: Using Autocomplete with a notice that it should be updated in the future
          // Google recommends migrating to PlaceAutocompleteElement but that requires DOM changes
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
            // Note: Using Marker with a notice that it should be updated in the future
            // Google recommends migrating to AdvancedMarkerElement but that requires additional setup
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

  // Update the useEffect for alternating placeholder with fade animation
  useEffect(() => {
    // Only activate the effect when on the vehicle information step
    if (currentStep !== 2) return;

    let fadeTimer: number;
    const placeholderInterval = window.setInterval(() => {
      // Start the fade out
      setPlaceholderOpacity(0);
      
      // After fading out, change the text and fade back in
      fadeTimer = window.setTimeout(() => {
        setRegistrationPlaceholder(prev => 
          prev === "KA-01-AB-1234" ? "25-BH-1234-AB" : "KA-01-AB-1234"
        );
        setPlaceholderOpacity(1);
      }, 300); // Half the time for fade out, then change text
      
    }, 2000); // Increase total time to make animation more visible

    // Clean up the intervals when the component unmounts or step changes
    return () => {
      clearInterval(placeholderInterval);
      clearTimeout(fadeTimer);
    };
  }, [currentStep]);

  const formatVehicleRegistration = (input: string): string => {
    // First remove any non-alphanumeric characters
    const cleanedInput = input.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    
    // Then remove any hyphens to prepare for reformatting
    const withoutHyphens = cleanedInput.replace(/-/g, '');
    
    // Limit to max 10 characters (which will become 13 with hyphens)
    const truncated = withoutHyphens.slice(0, 10);
    
    // Empty or very short input just returns as is
    if (truncated.length === 0) {
      setRegistrationFormat(null);
      return '';
    }
    
    // Determine which pattern to use based on first characters
    const firstChar = truncated.charAt(0);
    const isFirstPattern = /[A-Z]/.test(firstChar); // First pattern starts with letters
    
    // Update format state for displaying the right hint
    setRegistrationFormat(isFirstPattern ? 'letter' : 'digit');
    
    // For pattern 1: {letter}{letter}-{digit}{digit}-{letter}{letter}-{digit}{digit}{digit}{digit}
    if (isFirstPattern) {
      let formatted = '';
      for (let i = 0; i < truncated.length; i++) {
        // Add hyphen after positions 2, 4, 6 if they're not the last character
        if ((i === 2 || i === 4 || i === 6) && i < truncated.length) {
          formatted += '-';
        }
        formatted += truncated.charAt(i);
      }
      return formatted;
    } 
    // For pattern 2: {digit}{digit}-{letter}{letter}-{digit}{digit}{digit}{digit}-{letter}{letter}
    else {
      let formatted = '';
      for (let i = 0; i < truncated.length; i++) {
        // Add hyphen after positions 2, 4, 8 if they're not the last character
        if ((i === 2 || i === 4 || i === 8) && i < truncated.length) {
          formatted += '-';
        }
        formatted += truncated.charAt(i);
      }
      return formatted;
    }
  };

  const validateVehicleRegistration = (regNum: string): boolean => {
    // Check if the registration number matches either of our two patterns after formatting
    const pattern1 = /^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{4}$/; // KA-01-AB-1234
    const pattern2 = /^\d{2}-[A-Z]{2}-\d{4}-[A-Z]{2}$/; // 01-KA-1234-AB
    
    // Check exact length (13 characters including hyphens)
    const correctLength = regNum.length === 13;
    
    return (pattern1.test(regNum) || pattern2.test(regNum)) && correctLength;
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

  // Function to show error with auto-fade
  const showError = (message: string) => {
    // Reset opacity to full if it was fading
    setErrorOpacity(1);
    setError(message);
    
    // Start fading out after 3 seconds
    setTimeout(() => {
      setErrorOpacity(0);
      // Remove the error message after the fade completes
      setTimeout(() => {
        setError(null);
        // Reset opacity for next error
        setErrorOpacity(1);
      }, 500); // 500ms for the fade-out transition
    }, 3000); // 3 seconds before starting fade
  };

  // Function to show error with auto-fade (alias for compatibility with existing code)
  const showTemporaryError = showError;

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate phone and gender
      if (!formData.phone || !formData.gender) {
        showError("Please fill all required fields.");
        return;
      }
      if (!isPhoneVerified) {
        showError("Please verify your phone number.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate vehicle information
      if (
        !formData.vehicle.model ||
        !formData.vehicle.registrationNumber ||
        !formData.vehicle.seats
      ) {
        showError("Please fill all required fields.");
        return;
      }

      // Validate vehicle registration format
      if (!validateVehicleRegistration(formData.vehicle.registrationNumber)) {
        showError("Please enter a valid vehicle registration number");
        return;
      }

      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Validate home address
      if (!formData.homeAddress || formData.distanceToCollege === 0) {
        showError("Please enter your home address and ensure distance is calculated.");
        return;
      }
      setCurrentStep(4);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    // Prevent default form submission if event is provided
    if (e) {
      e.preventDefault();
    }
    
    // Validate phone verification
    if (!isPhoneVerified) {
      showError("Please verify your phone number");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validate gender
    if (!formData.gender || formData.gender === "") {
      showError("Please select your gender");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validate vehicle information
    if (!formData.vehicle.model || formData.vehicle.model.trim() === "") {
      showError("Please enter your vehicle model");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (!formData.vehicle.registrationNumber || formData.vehicle.registrationNumber.trim() === "") {
      showError("Please enter your vehicle registration number");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (!validateVehicleRegistration(formData.vehicle.registrationNumber)) {
      showError("Please enter a valid vehicle registration number");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validate home address
    if (!formData.homeAddress || formData.homeAddress.trim() === "") {
      showError("Please enter your home address");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validate price per km exists and is between 1 and 10
    if (formData.pricePerKm === undefined || isNaN(formData.pricePerKm)) {
      showError("Please enter a valid price per kilometer");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Validate price per km is between 1 and 10
    if (formData.pricePerKm < 1 || formData.pricePerKm > 10) {
      showError("Price per kilometer must be between ₹1 and ₹10");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // All validations passed, proceed with submission
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Ensure phone number is properly formatted
      const phoneForSubmit = phoneNumber.startsWith("+91") 
        ? phoneNumber 
        : `+91${phoneNumber}`;
      
      // Format data according to backend API expectations
      const driverProfileData = {
        phone: phoneForSubmit,
        gender: formData.gender,
        homeAddress: formData.homeAddress,
        distanceToCollege: formData.distanceToCollege,
        driverProfile: {
          vehicle: formData.vehicle,
          pricePerKm: formData.pricePerKm
        },
        driverProfileComplete: true,
        activeRoles: {
          driver: true,
          hitcher: currentUser?.activeRoles?.hitcher || false,
        },
      };
      
      // Log the data being sent to help with debugging
      console.log("Submitting driver profile data:", driverProfileData);
      
      const response = await api.post(
        "/api/profile/driver",
        driverProfileData
      );
      
      console.log("Driver profile update successful:", response.data);
      await updateDriverProfileComplete(true);
      navigate("/driver/dashboard");
    } catch (error) {
      console.error("Error saving driver profile:", error);
      showError("Failed to save profile. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a useEffect for the resend timer countdown
  useEffect(() => {
    // Only run the timer if resendTimer is greater than 0
    if (resendTimer <= 0) return;
    
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    
    // Clear the interval when component unmounts or timer reaches 0
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendVerificationCode = async () => {
    try {
      if (!phoneNumber) {
        showError("Please enter your phone number");
        return;
      }

      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number pattern (10 digits, starting with 6, 7, 8, or 9)
      if (!phoneRegex.test(phoneNumber)) {
        showError("Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)");
        return;
      }

      setIsLoadingVerification(true);
      const formattedPhoneNumber = `+91${phoneNumber}`; // Assuming Indian numbers
      const response = await api.post(
        "/api/verify/send",
        { phoneNumber: formattedPhoneNumber }
      );
      
      if (response.data.success) {
        setIsVerifying(true);
        setError(null);
        setSuccessMessage("Verification code sent successfully!");
        // Set the resend timer to 90 seconds
        setResendTimer(90);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error("Error sending code:", error);
      let errorMessage = "Error sending verification code. Please try again.";
      
      // Check for specific Twilio error messages
      if (error.response?.data?.message?.includes("unverified")) {
        errorMessage = "This phone number is not verified in our system. For development, please use one of these test numbers: +14155552671, +14155552672, +14155552673, +14155552674, or +14155552675";
      } else if (error.response?.data?.remainingTime) {
        // If there's a cooldown period remaining
        setResendTimer(error.response.data.remainingTime);
        errorMessage = `Please wait ${error.response.data.remainingTime} seconds before requesting another code`;
      }
      
      showError(errorMessage);
      setSuccessMessage(null);
    } finally {
      setIsLoadingVerification(false);
    }
  };

  const verifyCode = async () => {
    try {
      if (!verificationCode) {
        showError("Please enter the verification code");
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
        // Also update the formData phone field with the verified phone number
        setFormData(prev => ({
          ...prev,
          phone: formattedPhoneNumber
        }));
        setSuccessMessage("Phone number verified successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      const errorMessage = error.response?.data?.message || "Invalid verification code. Please try again.";
      showError(errorMessage);
      setSuccessMessage(null);
    }
  };

  // Update the notification components
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div 
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
        style={{
          transition: 'opacity 0.5s ease-in-out',
          opacity: errorOpacity
        }}
      >
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
                    ? "border-blue-600 bg-gradient-to-r from-blue-100 to-indigo-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">1</span>
              </div>
              <span className="text-xs mt-1">Personal</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 2 ? "bg-gradient-to-r from-blue-600 to-indigo-700" : "bg-gray-200"
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
                    ? "border-blue-600 bg-gradient-to-r from-blue-100 to-indigo-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">2</span>
              </div>
              <span className="text-xs mt-1">Vehicle</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 3 ? "bg-gradient-to-r from-blue-600 to-indigo-700" : "bg-gray-200"
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
                    ? "border-blue-600 bg-gradient-to-r from-blue-100 to-indigo-100"
                    : "border-gray-300"
                }`}
              >
                <span className="text-sm font-medium">3</span>
              </div>
              <span className="text-xs mt-1">Location</span>
            </div>
            <div
              className={`flex-1 h-1 mx-2 ${
                currentStep >= 4 ? "bg-gradient-to-r from-blue-600 to-indigo-700" : "bg-gray-200"
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
                    ? "border-blue-600 bg-gradient-to-r from-blue-100 to-indigo-100"
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
          <form onSubmit={(e) => handleSubmit(e)}>
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
                  <LoadingButton
                    onClick={sendVerificationCode}
                    disabled={resendTimer > 0}
                    loadingText="Sending..."
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {resendTimer > 0 
                      ? `Resend (${resendTimer}s)` 
                      : "Send Verification Code"}
                  </LoadingButton>
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
                    <div className="flex space-x-2">
                      <LoadingButton
                        onClick={verifyCode}
                        loadingText="Verifying..."
                        className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Verify Code
                      </LoadingButton>
                      <LoadingButton
                        onClick={sendVerificationCode}
                        disabled={resendTimer > 0}
                        loadingText="Sending..."
                        className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {resendTimer > 0 
                          ? `Resend (${resendTimer}s)` 
                          : "Resend Code"}
                      </LoadingButton>
                    </div>
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
                    htmlFor="vehicleRegistrationNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vehicle Registration Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="vehicleRegistrationNumber"
                      name="vehicle.registrationNumber"
                      value={formData.vehicle.registrationNumber}
                      onChange={handleVehicleRegistrationChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={registrationPlaceholder}
                      maxLength={13}
                      style={{ 
                        transition: 'opacity 0.3s ease-in-out',
                        opacity: formData.vehicle.registrationNumber ? 1 : placeholderOpacity 
                      }}
                    />
                  </div>
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
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
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
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
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
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (e.target.value === "" || (value >= 1 && value <= 10)) {
                        handleInputChange(e);
                      } else {
                        // If outside range, show error but still update the field
                        handleInputChange(e);
                        showError("Price per kilometer must be between ₹1 and ₹10");
                      }
                    }}
                    required
                    min="1"
                    max="10"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter price per Km"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This is the price each passenger will pay per Km of travel.
                    You can adjust this price later.
                    <br />
                    Ideally, it must be between{" "}
                    <span className="font-bold text-green-500">₹4</span> to{" "}
                    <span className="font-bold text-red-500">₹6</span>
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

                <div className="mt-6 flex justify-between gap-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </button>
                  <LoadingButton
                    onClick={() => handleSubmit()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    disabled={isSubmitting}
                    loadingText="Saving Profile..."
                  >
                    Save Profile
                  </LoadingButton>
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
