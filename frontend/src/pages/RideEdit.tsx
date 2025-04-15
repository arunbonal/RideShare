import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/api";
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

interface RideFormData {
  _id: string;
  driver: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
  };
  from: string;
  to: string;
  date: string;
  direction: "toCollege" | "fromCollege";
  toCollegeTime?: string;
  fromCollegeTime?: string;
  availableSeats: number;
  status: string;
  pricePerKm?: number;
}

const RideEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const [rideForm, setRideForm] = useState<RideFormData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });

  // Get min and max dates (today to 1 week from now)
  const { today, maxDateString } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateString = maxDate.toISOString().split("T")[0];
    return { today, maxDateString };
  }, []);

  // Fetch the ride data
  useEffect(() => {
    const fetchRide = async () => {
      try {
        setIsFetching(true);
        // First check if the ride is in allRides
        const existingRide = allRides.find(ride => ride._id === id);
        
        if (existingRide) {
          // Format the date to YYYY-MM-DD for the date input
          const formattedDate = new Date(existingRide.date).toISOString().split('T')[0];
          
          setRideForm({
            _id: existingRide._id,
            driver: {
              _id: existingRide.driver._id,
              name: existingRide.driver.name,
              email: existingRide.driver.email,
              phone: existingRide.driver.phone,
              gender: existingRide.driver.gender,
            },
            from: existingRide.from,
            to: existingRide.to,
            date: formattedDate,
            direction: existingRide.direction,
            toCollegeTime: existingRide.toCollegeTime,
            fromCollegeTime: existingRide.fromCollegeTime,
            availableSeats: existingRide.availableSeats,
            status: existingRide.status,
            pricePerKm: existingRide.pricePerKm,
          });
        } else {
          // If not found in allRides, fetch from API
          const response = await api.get(`/api/rides/${id}`);
          const ride = response.data.ride;
          
          // Format the date to YYYY-MM-DD for the date input
          const formattedDate = new Date(ride.date).toISOString().split('T')[0];
          
          setRideForm({
            _id: ride._id,
            driver: {
              _id: ride.driver._id,
              name: ride.driver.name,
              email: ride.driver.email,
              phone: ride.driver.phone,
              gender: ride.driver.gender,
            },
            from: ride.from,
            to: ride.to,
            date: formattedDate,
            direction: ride.direction,
            toCollegeTime: ride.toCollegeTime,
            fromCollegeTime: ride.fromCollegeTime,
            availableSeats: ride.availableSeats,
            status: ride.status,
            pricePerKm: ride.pricePerKm,
          });
        }
      } catch (error) {
        console.error("Error fetching ride:", error);
        setNotification({
          show: true,
          message: "Failed to fetch ride details. Please try again.",
          type: "error",
        });
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      fetchRide();
    }
  }, [id, allRides]);

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

  // Handle form submission to update the ride
  const handleUpdateRide = useCallback(async (): Promise<void> => {
    if (!rideForm) return;
    
    setIsLoading(true);
    
    // Collect all validation errors
    const errors: ValidationErrors = {};
    
    // Validate available seats
    const seatsError = validateAvailableSeats(rideForm.availableSeats);
    if (seatsError) errors.availableSeats = seatsError;

    if (!rideForm.date) {
      errors.date = "Please select a date";
    }

    const selectedDate = new Date(rideForm.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate < todayDate) {
      errors.date = "Cannot schedule rides for past dates";
    }

    // Check time validity for today's rides
    if (selectedDate.toDateString() === todayDate.toDateString()) {
      const timeToCheck =
        rideForm.direction === "toCollege"
          ? rideForm.toCollegeTime
          : rideForm.fromCollegeTime;

      if (!timeToCheck || !isTimeValid(rideForm.date, timeToCheck)) {
        errors.time = "Cannot schedule rides for past times. Please select a future time.";
      }
    }

    if (rideForm.pricePerKm === undefined) {
      errors.pricePerKm = "Please enter a price per kilometer";
    }

    if (rideForm.pricePerKm !== undefined && (rideForm.pricePerKm < 1 || rideForm.pricePerKm > 10)) {
      errors.pricePerKm = "Price per kilometer must be between ₹1 and ₹10";
    }

    // Set validation errors and return if there are any
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    try {
      // Format the ride data to match the backend schema
      const rideData = {
        from: rideForm.from,
        to: rideForm.to,
        date: new Date(rideForm.date).toISOString(),
        direction: rideForm.direction,
        toCollegeTime: rideForm.toCollegeTime, // Keep as HH:MM
        fromCollegeTime: rideForm.fromCollegeTime, // Keep as HH:MM
        availableSeats: Number(rideForm.availableSeats),
        pricePerKm: Number(rideForm.pricePerKm),
        // Add a combined datetime field to help with proper sorting
        datetime: (() => {
          const dt = new Date(rideForm.date);
          const time = rideForm.direction === "toCollege" ? rideForm.toCollegeTime : rideForm.fromCollegeTime;
          if (time) {
            const [hours, minutes] = time.split(":").map(Number);
            dt.setHours(hours, minutes, 0, 0);
          }
          return dt.toISOString();
        })()
      };

      await api.put(`/api/rides/${id}`, rideData);
      
      // Show success notification
      setNotification({
        show: true,
        message: "Ride updated successfully!",
        type: "success",
      });
      
      // Refresh rides data
      await fetchAllRides();
      
      // Navigate back to ride management after a short delay
      setTimeout(() => {
        navigate("/rides/manage");
      }, 1500);
    } catch (error) {
      console.error("Error updating ride:", error);
      setNotification({
        show: true,
        message: "Failed to update ride. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [rideForm, validateAvailableSeats, isTimeValid, id, navigate, fetchAllRides]);

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (isFetching) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </>
    );
  }

  if (!rideForm) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <p>Ride not found or you don't have permission to edit this ride.</p>
            <button
              onClick={() => navigate("/rides/manage")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Back to Ride Management
            </button>
          </div>
        </div>
      </>
    );
  }

  // Check if user is the owner of this ride
  if (currentUser?.id !== rideForm.driver._id) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 text-red-700 p-4 rounded-md">
            <p>You don't have permission to edit this ride.</p>
            <button
              onClick={() => navigate("/driver/dashboard")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300 z-50`}
          >
            <span>{notification.message}</span>
          </div>
        )}
      
        <button
          onClick={() => navigate("/rides/manage")}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ride Management
        </button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit Ride</h1>
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
                value={rideForm.availableSeats}
                onChange={(e) => {
                  const seats = e.target.value ? parseInt(e.target.value) : undefined;
                  setRideForm({
                    ...rideForm,
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
                  const error = validateAvailableSeats(rideForm.availableSeats);
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
                value={rideForm.date}
                onChange={(e) => {
                  setRideForm({
                    ...rideForm,
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
                !rideForm.date && (
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
                value={rideForm.direction}
                onChange={(e) => {
                  const newDirection = e.target.value as "toCollege" | "fromCollege";
                  setRideForm({
                    ...rideForm,
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

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline-block w-4 h-4 mr-2" />
                {rideForm.direction === "toCollege"
                  ? "Departure time to college"
                  : "Departure time from college"}
              </label>
              {isIOS ? (
                // iOS version - single input with native time picker
                <input
                  type="time"
                  value={rideForm.direction === "toCollege" ? rideForm.toCollegeTime || "08:00" : rideForm.fromCollegeTime || "17:00"}
                  onChange={(e) => {
                    setRideForm({
                      ...rideForm,
                      [rideForm.direction === "toCollege" ? "toCollegeTime" : "fromCollegeTime"]: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              ) :
                // Non-iOS version - separate time input and AM/PM dropdown
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={
                      formatTimeForDisplay(
                        rideForm.direction === "toCollege"
                          ? rideForm.toCollegeTime || "08:00"
                          : rideForm.fromCollegeTime || "17:00"
                      ).time
                    }
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":");
                      const hour = parseInt(hours);
                      const currentPeriod = formatTimeForDisplay(
                        rideForm.direction === "toCollege"
                          ? rideForm.toCollegeTime || "08:00"
                          : rideForm.fromCollegeTime || "17:00"
                      ).period;
  
                      let hour24 = hour;
                      if (currentPeriod === "PM" && hour !== 12) hour24 += 12;
                      if (currentPeriod === "AM" && hour === 12) hour24 = 0;
  
                      const newTime = `${hour24
                        .toString()
                        .padStart(2, "0")}:${minutes}`;
  
                      setRideForm({
                        ...rideForm,
                        [rideForm.direction === "toCollege"
                          ? "toCollegeTime"
                          : "fromCollegeTime"]: newTime,
                      });
                    }}
                    className="flex px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={
                      formatTimeForDisplay(
                        rideForm.direction === "toCollege"
                          ? rideForm.toCollegeTime || "08:00"
                          : rideForm.fromCollegeTime || "17:00"
                      ).period
                    }
                    onChange={(e) => {
                      const { time } = formatTimeForDisplay(
                        rideForm.direction === "toCollege"
                          ? rideForm.toCollegeTime || "08:00"
                          : rideForm.fromCollegeTime || "17:00"
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
  
                      setRideForm({
                        ...rideForm,
                        [rideForm.direction === "toCollege"
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
              }
            </div>

            {/* From Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="inline-block w-4 h-4 mr-2" />
                From
              </label>
              <input
                type="text"
                value={rideForm.from}
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
                value={rideForm.to}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {/* Price Per Kilometer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Per Kilometer (₹)<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={rideForm.pricePerKm}
                onChange={(e) => {
                  const price = e.target.value ? parseFloat(e.target.value) : undefined;
                  setRideForm({
                    ...rideForm,
                    pricePerKm: price,
                  });
                  // Clear price validation error
                  if (validationErrors.pricePerKm) {
                    setValidationErrors({
                      ...validationErrors,
                      pricePerKm: undefined
                    });
                  }
                }}
                className={`w-full px-3 py-2 border ${validationErrors.pricePerKm ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} rounded-md focus:outline-none`}
                required
              />
              {validationErrors.pricePerKm ? (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.pricePerKm}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  {rideForm.pricePerKm !== undefined && rideForm.availableSeats > 0 && (
                    <>
                      At full capacity ({rideForm.availableSeats} seats), you'll earn
                      up to ₹{(rideForm.pricePerKm * rideForm.availableSeats).toFixed(0)}
                      /km
                    </>
                  )}
                  {(rideForm.pricePerKm === undefined || rideForm.availableSeats <= 0) && (
                    <>Price must be between ₹1 and ₹10 per kilometer</>
                  )}
                </p>
              )}
            </div>

            <LoadingButton
              onClick={handleUpdateRide}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              loadingText="Updating Ride..."
              disabled={Object.keys(validationErrors).some(key => validationErrors[key as keyof ValidationErrors]) || isLoading}
            >
              Update Ride
            </LoadingButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default RideEdit; 