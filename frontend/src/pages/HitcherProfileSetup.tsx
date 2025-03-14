import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import axios from "axios";

declare global {
  interface Window {
    google: any;
  }
}

const HitcherProfileSetup: React.FC = () => {
  const { updateHitcherProfileComplete } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    phone: "",
    homeAddress: "",
    gender: "",
  });

  const addressInputRef = useRef<HTMLTextAreaElement>(null);

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
            fields: ["formatted_address", "geometry", "name", "types"], // Added "types" to check for establishments
            types: ["geocode", "establishment"]
        });
    
        // Add the place changed event listener
        if (autocomplete) {
          autocomplete.addListener("place_changed", () => {
              const place = autocomplete?.getPlace();
              let address = "";
      
              if (place) {
                  if (place.formatted_address) {
                      // Use place name + formatted address for establishments
                      address = place.name 
                          ? `${place.name}, ${place.formatted_address}` 
                          : place.formatted_address;
                  }
      
                  setFormData(prev => ({
                      ...prev,
                      homeAddress: address
                  }));
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
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!formData.phone) {
      setError("Please enter your phone number");
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
        formData,
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
    if (!formData.phone) {
      setError("Please enter your phone number");
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
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter your phone number"
                    />
                  </div>
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
                  <textarea
                    ref={addressInputRef}
                    id="homeAddress"
                    name="homeAddress"
                    value={formData.homeAddress}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Start typing your address..."
                  ></textarea>
                </div>

                {/* Map placeholder */}
                <div className="border border-gray-300 rounded-md h-48 bg-gray-100 flex items-center justify-center mt-4">
                  <p className="text-gray-500 text-sm">
                    Map would be displayed here for address selection
                  </p>
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
