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
  const { updateDriverProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    phone: "",
    licenseImage: "",
    gender: "",
    vehicle: {
      model: "",
      color: "",
      registrationNumber: "",
      seats: 4,
    },
    homeAddress: "",
    distanceToCollege: 0,
    pricePerKm: undefined,
  });

  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Only initialize when we're on the location step
    if (currentStep !== 3) {
      return;
    }

    let autocomplete: google.maps.places.Autocomplete | null = null;

    const initAutocomplete = () => {
      if (!addressInputRef.current || !window.google?.maps?.places) {
        console.log('Missing dependencies:', {
          hasRef: !!addressInputRef.current,
          hasGoogleMaps: !!window.google?.maps,
          hasPlaces: !!window.google?.maps?.places
        });
        return;
      }

    //   ESTABLISHMENT autocomplete code 
      try {
        // Create the autocomplete instance
        autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
            componentRestrictions: { country: "IN" },
            fields: ["formatted_address", "geometry", "name", "types"], // Added "types" to check for establishments
            types: ["geocode", "establishment"]
        });
    
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
      
                  // Calculate distance to college
                  const collegeLocation = { lat: 12.861203781214266, lng: 77.66466548226559 }; // PES University EC Campus coordinates
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

                        // Log the calculated distance
                        console.log('Distance to college:', distanceInKm, 'km');
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
      console.log('Google Maps loaded, initializing immediately');
      initAutocomplete();
    } else {
      console.log('Google Maps not loaded, waiting...');
      // If not loaded, wait for the script to load
      const checkGoogleExists = setInterval(() => {
        if (window.google?.maps?.places) {
          console.log('Google Maps loaded in interval');
          initAutocomplete();
          clearInterval(checkGoogleExists);
        }
      }, 100);

      // Clear interval after 10 seconds if Google doesn't load
      setTimeout(() => {
        clearInterval(checkGoogleExists);
        console.log('Timeout reached waiting for Google Maps');
      }, 10000);
    }

    // Cleanup
    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [currentStep]); // Add currentStep to dependencies

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
      if (!formData.phone) {
        setError("Please enter your phone number");
        return;
      }
      if (!formData.gender || formData.gender === "") {
        setError("Please select your gender");
        return;
      }
      if (!formData.licenseImage) {
        setError("Please enter your license image URL");
        return;
      }
    }

    // Vehicle Information validation
    if (currentStep === 2) {
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

    // Final validation before submission
    if (!formData.phone) {
      setError("Please enter your phone number");
      return;
    }
    if (!formData.gender || formData.gender === "") {
      setError("Please select your gender");
      return;
    }
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
        phone: formData.phone,
        homeAddress: formData.homeAddress,
        distanceToCollege: formData.distanceToCollege,
        gender: formData.gender,
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
          rating: 0,
          ratingCount: 0,
        },
        driverProfileComplete: true,
        activeRoles: {
          driver: true,
          hitcher: false,
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

  // Add error message display
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  };

  // Modify the submit button to show loading state
  const SubmitButton = () => (
    <button
      type="submit"
      disabled={isSubmitting}
      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
        isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
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

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
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
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
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
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone Number
                  </label>
                  <input  
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your phone number"
                  />
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
                    onChange={handleInputChange}
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
                  <textarea
                    ref={addressInputRef}
                    id="homeAddress"
                    name="homeAddress"
                    value={formData.homeAddress}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start typing your address..."
                  ></textarea>
                </div>

                {/* Map placeholder - in a real app, this would be a Google Map for address selection */}
                <div className="border border-gray-300 rounded-md h-48 bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">
                    Map would be displayed here for address selection
                  </p>
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

                <div className="mt-6">
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
