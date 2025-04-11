import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, MessageSquare, Users, Car, CreditCard, ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api"; // Import API utility
import { formatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';
import LoadingButton from '../components/LoadingButton';

// Add detection for iOS devices
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

// Add validation interface
interface ValidationErrors {
  availableSeats?: string;
  date?: string;
  time?: string;
  pricePerKm?: string;
}

interface RideSchedule {
  driver: string;
  passengers?: Array<{
    user: string;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    pickupLocation?: string;
    dropoffLocation?: string;
    fare?: number;
    review?: string;
  }>;
  from: string;
  to: string;
  date: string;
  toCollegeTime?: string;
  fromCollegeTime?: string;
  availableSeats: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  route?: string;
  direction: "toCollege" | "fromCollege";
  pricePerKm: number;
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const RideCreation: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { currentUser, ride, setRide, resetRide } = useAuth();
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (currentUser) {
      setRide((prev) => ({
        ...prev,
        driver: {
          _id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          gender: currentUser.gender,
        },
        from: currentUser.homeAddress || "",
        availableSeats: currentUser.driverProfile?.vehicle.seats || 4,
        pricePerKm: currentUser.driverProfile?.pricePerKm || 0,
      }));
    }
  }, [currentUser, setRide]);

  // Get min and max dates (today to 1 week from now)
  const { today, maxDateString } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateString = maxDate.toISOString().split("T")[0];
    return { today, maxDateString };
  }, []);

  // Memoize the time validation function
  const isTimeValid = useCallback((date: string, time24: string): boolean => {
    const now = new Date();
    const [hours, minutes] = time24.split(":").map(Number);
    const scheduleDateTime = new Date(date);
    scheduleDateTime.setHours(hours, minutes, 0, 0);

    // If it's a future date, any time is valid
    if (scheduleDateTime.toDateString() !== now.toDateString()) {
      return scheduleDateTime > now;
    }

    // For today, check if the time has not passed
    return scheduleDateTime > now;
  }, []);

  // Memoize the time formatting function
  const formatTimeForDisplay = useCallback(
    (time24: string): { time: string; period: "AM" | "PM" } => {
      const [hours, minutes] = time24.split(":");
      const hour = parseInt(hours);
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return {
        time: `${hour12.toString().padStart(2, "0")}:${minutes}`,
        period,
      };
    },
    []
  );

  // Validate available seats
  const validateAvailableSeats = useCallback((seats: number): string | undefined => {
    if (seats === undefined || seats === null || isNaN(seats)) {
      return "Available seats is required";
    }
    if (!Number.isInteger(seats)) {
      return "Available seats must be a whole number";
    }
    if (seats < 1) {
      return "At least 1 seat must be available";
    }
    if (seats > 6) {
      return "Maximum 6 seats are allowed";
    }
    return undefined;
  }, []);

  // Memoize the create schedule handler
  const handleCreateSchedule = useCallback(async (): Promise<void> => {
    // Collect all validation errors
    const errors: ValidationErrors = {};
    
    // Validate available seats
    const seatsError = validateAvailableSeats(ride.availableSeats);
    if (seatsError) errors.availableSeats = seatsError;

    if (!ride.date) {
      errors.date = "Please select a date";
    }

    const selectedDate = new Date(ride.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate < todayDate) {
      errors.date = "Cannot schedule rides for past dates";
    }

    // Check time validity for today's rides
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      const timeToCheck =
        ride.direction === "toCollege"
          ? ride.toCollegeTime
          : ride.fromCollegeTime;

      if (!timeToCheck || !isTimeValid(ride.date, timeToCheck)) {
        errors.time = "Cannot schedule rides for past times. Please select a future time.";
      }
    }

    if (ride.pricePerKm === undefined) {
      errors.pricePerKm = "Please enter a price per kilometer";
    }

    if (ride.pricePerKm !== undefined && (ride.pricePerKm < 1 || ride.pricePerKm > 10)) {
      errors.pricePerKm = "Price per kilometer must be between ₹1 and ₹10";
    }

    // Set validation errors and return if there are any
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    // Format the ride data to match the backend schema
    const rideData = {
      driver: currentUser?.id || "", // Send only the driver ID
      from: ride.from,
      to: ride.to,
      date: new Date(ride.date).toISOString(),
      direction: ride.direction,
      toCollegeTime: ride.toCollegeTime, // Keep as HH:MM
      fromCollegeTime: ride.fromCollegeTime, // Keep as HH:MM
      availableSeats: Number(ride.availableSeats),
      status: "scheduled" as const,
      passengers: [],
      pricePerKm: Number(ride.pricePerKm),
      // Add a combined datetime field to help with proper sorting
      datetime: (() => {
        const dt = new Date(ride.date);
        const time = ride.direction === "toCollege" ? ride.toCollegeTime : ride.fromCollegeTime;
        if (time) {
          const [hours, minutes] = time.split(":").map(Number);
          dt.setHours(hours, minutes, 0, 0);
        }
        return dt.toISOString();
      })()
    };

    await api.post("/api/rides/create", rideData);
    resetRide();
    navigate("/driver/dashboard");
  }, [ride, currentUser, isTimeValid, resetRide, navigate, validateAvailableSeats]);

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create New Ride</h1>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="space-y-4">
            {/* Available Seats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="inline-block w-4 h-4 mr-2" />
                Available Seats<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="6"
                required
                value={ride.availableSeats}
                onChange={(e) => {
                  const seats = e.target.value ? parseInt(e.target.value) : undefined;
                  setRide({
                    ...ride,
                    availableSeats: seats as number,
                  });
                  // Clear validation error when field is modified
                  if (validationErrors.availableSeats) {
                    setValidationErrors({
                      ...validationErrors,
                      availableSeats: undefined
                    });
                  }
                }}
                className={`w-full px-3 py-2 border ${validationErrors.availableSeats ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md focus:outline-none`}
                onBlur={() => {
                  const error = validateAvailableSeats(ride.availableSeats);
                  if (error) {
                    setValidationErrors({
                      ...validationErrors,
                      availableSeats: error
                    });
                  }
                }}
              />
              {validationErrors.availableSeats && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.availableSeats}
                </p>
              )}
              {!validationErrors.availableSeats && (
                <p className="mt-1 text-sm text-gray-500">
                  You can offer between 1 and 6 seats
                </p>
              )}
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline-block w-4 h-4 mr-2" />
                Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                max={maxDateString}
                value={ride.date}
                onChange={(e) => {
                  setRide({
                    ...ride,
                    date: e.target.value,
                  });
                  // Clear date validation error
                  if (validationErrors.date) {
                    setValidationErrors({
                      ...validationErrors,
                      date: undefined
                    });
                  }
                }}
                className={`w-full px-3 py-2 border ${validationErrors.date ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md focus:outline-none`}
                required
              />
              {validationErrors.date ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.date}
                </p>
              ) : (
                !ride.date && (
                  <p className="mt-1 text-sm text-gray-500">
                    Please select a date
                  </p>
                )
              )}
            </div>

            {/* Direction Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline-block w-4 h-4 mr-2" />
                Direction
              </label>
              <select
                value={ride.direction}
                onChange={(e) => {
                  const newDirection = e.target
                    .value as RideSchedule["direction"];
                  setRide({
                    ...ride,
                    direction: newDirection,
                    // Set from/to based on direction
                    from:
                      newDirection === "toCollege"
                        ? currentUser?.homeAddress || ""
                        : currentUser?.college || "",
                    to:
                      newDirection === "toCollege"
                        ? currentUser?.college || ""
                        : currentUser?.homeAddress || "",
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="toCollege">To College</option>
                <option value="fromCollege">From College</option>
              </select>
            </div>

            {/* Map Preview */}
            {/* <MapPreview direction={currentSchedule.direction} /> */}

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline-block w-4 h-4 mr-2" />
                {ride.direction === "toCollege"
                  ? "Departure time to college"
                  : "Departure time from college"}
              </label>
              {isIOS ? (
                // iOS version - single input with native time picker
                <input
                  type="time"
                  value={ride.direction === "toCollege" ? ride.toCollegeTime || "08:00" : ride.fromCollegeTime || "17:00"}
                  onChange={(e) => {
                    setRide({
                      ...ride,
                      [ride.direction === "toCollege" ? "toCollegeTime" : "fromCollegeTime"]: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                // Non-iOS version - separate time input and AM/PM dropdown
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={
                      formatTimeForDisplay(
                        ride.direction === "toCollege"
                          ? ride.toCollegeTime || "08:00"
                          : ride.fromCollegeTime || "17:00"
                      ).time
                    }
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":");
                      const hour = parseInt(hours);
                      const currentPeriod = formatTimeForDisplay(
                        ride.direction === "toCollege"
                          ? ride.toCollegeTime || "08:00"
                          : ride.fromCollegeTime || "17:00"
                      ).period;
  
                      let hour24 = hour;
                      if (currentPeriod === "PM" && hour !== 12) hour24 += 12;
                      if (currentPeriod === "AM" && hour === 12) hour24 = 0;
  
                      const newTime = `${hour24
                        .toString()
                        .padStart(2, "0")}:${minutes}`;
  
                      setRide({
                        ...ride,
                        [ride.direction === "toCollege"
                          ? "toCollegeTime"
                          : "fromCollegeTime"]: newTime,
                      });
                    }}
                    className="flex px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={
                      formatTimeForDisplay(
                        ride.direction === "toCollege"
                          ? ride.toCollegeTime || "08:00"
                          : ride.fromCollegeTime || "17:00"
                      ).period
                    }
                    onChange={(e) => {
                      const { time } = formatTimeForDisplay(
                        ride.direction === "toCollege"
                          ? ride.toCollegeTime || "08:00"
                          : ride.fromCollegeTime || "17:00"
                      );
                      const [hours, minutes] = time.split(":");
                      const hour = parseInt(hours);
                      const newPeriod = e.target.value as "AM" | "PM";
  
                      let hour24 = hour;
                      if (newPeriod === "PM" && hour !== 12) hour24 += 12;
                      if (newPeriod === "AM" && hour === 12) hour24 = 0;
  
                      const newTime = `${hour24
                        .toString()
                        .padStart(2, "0")}:${minutes}`;
  
                      setRide({
                        ...ride,
                        [ride.direction === "toCollege"
                          ? "toCollegeTime"
                          : "fromCollegeTime"]: newTime,
                      });
                    }}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              )}
            </div>

            {/* From Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline-block w-4 h-4 mr-2" />
                From
              </label>
              <input
                type="text"
                value={ride.from}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* To Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline-block w-4 h-4 mr-2" />
                To
              </label>
              <input
                type="text"
                value={ride.to}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* Price Per Kilometer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="inline-block w-4 h-4 mr-2">₹</span>
                Price Per Kilometer<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  step="0.5"
                  value={ride.pricePerKm === undefined ? "" : ride.pricePerKm}
                  onChange={(e) => {
                    setRide({
                      ...ride,
                      pricePerKm:
                        e.target.value === ""
                          ? undefined
                          : parseFloat(e.target.value),
                    });
                    // Clear price validation error
                    if (validationErrors.pricePerKm) {
                      setValidationErrors({
                        ...validationErrors,
                        pricePerKm: undefined
                      });
                    }
                  }}
                  className={`w-full pl-7 pr-3 py-2 border ${validationErrors.pricePerKm ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md focus:outline-none`}
                  placeholder={`${currentUser?.driverProfile?.pricePerKm || 0}`}
                />
              </div>
              {validationErrors.pricePerKm ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.pricePerKm}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {ride.pricePerKm !== undefined && ride.availableSeats > 0 && (
                    <>
                      At full capacity ({ride.availableSeats} seats), you'll earn
                      up to ₹{(ride.pricePerKm * ride.availableSeats).toFixed(0)}
                      /km
                    </>
                  )}
                  {(ride.pricePerKm === undefined || ride.availableSeats <= 0) && (
                    <>Price must be between ₹1 and ₹10 per kilometer</>
                  )}
                </p>
              )}
            </div>

            <p className=" text-sm text-gray-500">
              Relevant details will be shared once you accept a request.
              </p>
            <LoadingButton
              onClick={handleCreateSchedule}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              loadingText="Creating Ride..."
              disabled={Object.keys(validationErrors).some(key => validationErrors[key as keyof ValidationErrors])}
            >
              Create Ride
            </LoadingButton>
          </div>
        </div>
      </div>
    </>
  );
});

export default RideCreation;
