import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Clock, Filter, X, Navigation, Calendar, Car } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import MapPreview from "../components/MapPreview";
import { format } from "date-fns";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Define interface for Driver that includes college
interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  srn?: string;
  driverProfile?: {
    vehicle?: {
      model: string;
      color: string;
      registrationNumber?: string;
    };
    reliabilityRate?: number;
  }
}

// Use this as a type reference but we'll work with AuthContext's Ride type
interface RideWithCollegeInfo {
  _id: string;
  driver: Driver & { college?: string }; // Make college optional since it might come from backend
  from: string;
  to: string;
  date: string;
  direction: "toCollege" | "fromCollege";
  toCollegeTime?: string;
  fromCollegeTime?: string;
  status: string;
  availableSeats: number;
  note?: string;
  hitchers?: any[];
  pricePerKm?: number;
  vehicleModel?: string;
  vehicleColor?: string;
}

const RideSearch: React.FC = () => {
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [direction, setDirection] = useState<"toCollege" | "fromCollege" | "">("");
  const [driverGender, setDriverGender] = useState<"" | "male" | "female">("");
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [minTime, setMinTime] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRideDetails, setSelectedRideDetails] = useState<RideWithCollegeInfo | null>(null);
  const rideListRef = useRef<HTMLDivElement>(null);
  const previewSidebarRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [filteredRides, setFilteredRides] = useState<RideWithCollegeInfo[]>([]);

  // Add these date calculations near the top of the component
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateString = maxDate.toISOString().split("T")[0];

  // Fetch all rides when component mounts
  useEffect(() => {
    fetchAllRides();
  }, [fetchAllRides]);

  // Filter rides when component mounts or when allRides or filters change
  useEffect(() => {
    if (currentUser) {
      const filtered = allRides.filter((ride) => {
        // Skip rides that have invalid data
        if (!ride || !ride.driver) {
          return false;
        }
        
        // Exclude cancelled rides and rides where user is already a hitcher
        if (
          ride.status === "cancelled" ||
          ride.hitchers?.some((h) => h.user?._id === currentUser.id)
        ) {
          return false;
        }

        // Exclude rides where the current user is the driver
        if (ride.driver._id === currentUser?.id) {
          return false;
        }

        // Ensure driver is from the same campus as the hitcher
        // Access the driver's college property safely
        const driverCollege = (ride.driver as any).college;
        if (driverCollege && currentUser.college && driverCollege !== currentUser.college) {
          return false;
        }

        // Filter by driver gender
        if (driverGender && ride.driver.gender !== driverGender) {
          return false;
        }

        // Filter by search query (location)
        if (
          searchQuery &&
          !ride.from.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !ride.to.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Filter by direction
        if (direction && ride.direction !== direction) {
          return false;
        }

        // Filter by date
        if (selectedDate) {
          const rideDate = new Date(ride.date).toISOString().split("T")[0];
          if (rideDate !== selectedDate) {
            return false;
          }
        }

        // Filter by time range
        if (minTime) {
          const rideTime =
            ride.direction === "toCollege"
              ? ride.toCollegeTime
              : ride.fromCollegeTime;
          if (rideTime && rideTime < minTime) {
            return false;
          }
        }

        if (maxTime) {
          const rideTime =
            ride.direction === "toCollege"
              ? ride.toCollegeTime
              : ride.fromCollegeTime;
          if (rideTime && rideTime > maxTime) {
            return false;
          }
        }

        // Only show scheduled rides with available seats
        return ride.status === "scheduled" && ride.availableSeats > 0;
      });

      // Cast the filtered rides to RideWithCollegeInfo[] for type safety
      setFilteredRides(filtered as unknown as RideWithCollegeInfo[]);
    }
  }, [allRides, currentUser, searchQuery, direction, selectedDate, minTime, maxTime, driverGender]);

  // Deselect ride when any search parameter changes
  useEffect(() => {
    setSelectedRideId(null);
    setSelectedRideDetails(null);
  }, [searchQuery, selectedDate, direction, minTime, maxTime]);

  // Update the click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        selectedRideId && // Only check if there's a selected ride
        !rideListRef.current?.contains(target) &&
        !previewSidebarRef.current?.contains(target) &&
        !searchBarRef.current?.contains(target) &&
        !target.closest("input") && // Prevent deselection when clicking any input
        !target.closest("select") && // Prevent deselection when clicking any select
        !target.closest("button") // Prevent deselection when clicking any button
      ) {
        setSelectedRideId(null);
        setSelectedRideDetails(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRideId]);

  // Add useEffect for notification auto-dismiss
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleRequestRide = async (rideId: string) => {
    try {
      const selectedRide = allRides.find((ride) => ride._id === rideId);
      if (!selectedRide) return;

      // Check if the hitcher is already in the ride
      const existingRequest = selectedRide?.hitchers?.find(
        (h) => h.user?._id === currentUser?.id
      );

      if (existingRequest) {
        setNotification({
          show: true,
          message: "You have already requested this ride",
          type: "error",
        });
        return;
      }

      // Before requesting, ensure the driver is from the same campus
      const driverCollege = (selectedRide.driver as any).college;
      if (driverCollege && currentUser?.college && driverCollege !== currentUser.college) {
        setNotification({
          show: true,
          message: "You can only request rides from drivers at your campus",
          type: "error",
        });
        return;
      }

      // Calculate estimated fare based on price per km and actual distance
      const fare = selectedRide.pricePerKm && currentUser?.distanceToCollege
    ? Math.round(selectedRide.pricePerKm * currentUser.distanceToCollege)
    : 0;


      const hitcherData = {
        rideId,
        user: currentUser?.id,
        status: "pending",
        pickupLocation:
          selectedRide.direction === "toCollege"
            ? currentUser?.homeAddress
            : currentUser?.college,
        dropoffLocation:
          selectedRide.direction === "toCollege"
            ? currentUser?.college
            : currentUser?.homeAddress,
        fare: fare,
        gender: currentUser?.gender
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/request`,
        hitcherData,
        { withCredentials: true }
      );

      setNotification({
        show: true,
        message: "Ride request sent successfully!",
        type: "success",
      });

      // Refresh the rides list
      fetchAllRides();
      navigate("/hitcher/dashboard");
    } catch (error) {
      console.error("Error requesting ride:", error);
      setNotification({
        show: true,
        message: "Error requesting ride",
        type: "error",
      });
    }
  };

  const formatTime = (time24: string | undefined) => {
    if (!time24) return "Time not specified";
    
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300 z-50 flex items-center`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-3 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Find Available Rides
          </h1>
          <p className="text-gray-600">
            Search for rides to and from {currentUser?.college}
          </p>
        </div>

        {/* Search and filter bar */}
        <div
          ref={searchBarRef}
          className="bg-white rounded-lg shadow-md p-4 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Directions</option>
                <option value="toCollege">To College</option>
                <option value="fromCollege">From College</option>
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={today}
                max={maxDateString}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {showFilters ? (
                  <X className="h-4 w-4 mr-1" />
                ) : (
                  <Filter className="h-4 w-4 mr-1" />
                )}
                {showFilters ? "Hide Filters" : "Filters"}
              </button>
            </div>
          </div>

          {/* Time filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="driverGender"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Driver Gender
                </label>
                <select
                  id="driverGender"
                  value={driverGender}
                  onChange={(e) => setDriverGender(e.target.value as "" | "male" | "female")}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="minTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Earliest Time
                </label>
                <input
                  type="time"
                  id="minTime"
                  value={minTime}
                  onChange={(e) => setMinTime(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="maxTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Latest Time
                </label>
                <input
                  type="time"
                  id="maxTime"
                  value={maxTime}
                  onChange={(e) => setMaxTime(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ride listings */}
          <div
            className={`${
              filteredRides.length > 0 ? "lg:col-span-2" : "lg:col-span-3"
            }`}
            ref={rideListRef}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {filteredRides.length}{" "}
              {filteredRides.length === 1 ? "Ride" : "Rides"} Available
            </h2>

            {filteredRides.length > 0 ? (
              <div className="space-y-6">
                {filteredRides.map((ride) => (
                  <div
                    key={ride._id}
                    className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all ${
                      selectedRideId === ride._id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => {
                      setSelectedRideId(ride._id);
                      setSelectedRideDetails(ride as RideWithCollegeInfo);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {ride.direction === "toCollege"
                            ? "To College"
                            : "From College"}
                        </h3>
                        <p className="text-gray-500">
                          {format(new Date(ride.date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                        {ride.availableSeats} seats left
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2" />
                        {ride.direction === "toCollege"
                          ? formatTime(ride.toCollegeTime)
                          : formatTime(ride.fromCollegeTime)}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-5 w-5 mr-2" />
                        From: {ride.from}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-5 w-5 mr-2" />
                        To: {ride.to}
                      </div>
                    </div>

                    {ride.note && (
                      <p className="mt-4 text-sm text-gray-500 italic">
                        Note: {ride.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No rides found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search filters or check back later
                </p>
              </div>
            )}
          </div>

          {/* Selected ride details - Only show if there are rides available */}
          {filteredRides.length > 0 && (
            <div ref={previewSidebarRef}>
              {selectedRideDetails ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-4">
                  {/* Map Preview */}
                  <div className="h-48 bg-gray-100 relative">
                    <MapPreview
                      startLocation={selectedRideDetails.from}
                      endLocation={selectedRideDetails.to}
                      userLocation={currentUser?.homeAddress ? `${currentUser.homeAddress} (Your Address)` : currentUser?.homeAddress}
                      direction={selectedRideDetails.direction}
                    />
                  </div>

                  <div className="p-6">
                    {/* Route Information */}
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Route Details
                      </h3>
                      <div className="space-y-4">
                        {/* Start Location */}
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Start
                            </p>
                            <p className="text-sm text-gray-500 break-words">
                              {selectedRideDetails.from}
                            </p>
                          </div>
                        </div>
                        
                        {/* Vertical Line */}
                        <div className="ml-1 h-8 border-l-2 border-dashed border-gray-200"></div>

                        {/* Time and Date */}
                        <div className="mt-4 bg-gray-50 rounded-md p-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              {selectedRideDetails.direction === "toCollege"
                                ? formatTime(selectedRideDetails.toCollegeTime)
                                : formatTime(selectedRideDetails.fromCollegeTime)}
                            </span>
                          </div>
                          {selectedRideDetails.direction === "toCollege" && <div className="text-xs text-red-500 mb-2">
                          (This is the time that the driver will leave from their home, you can contact them and coordinate the pickup time once your ride is accepted)
                          </div>}
                          <div className="flex items-center text-sm text-gray-600 mt-2">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>
                              {format(new Date(selectedRideDetails.date), "EEEE, MMMM d, yyyy")}
                            </span>
                          </div>
                        </div>

                        {/* Distance and Fare Information */}
                        <div className="mt-4 bg-blue-50 rounded-md p-3">
                          <div className="text-sm text-gray-800">
                            <div className="flex justify-between items-center mb-2">
                              <span>Distance: {currentUser?.distanceToCollege} km</span>
          
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Fare: ₹{selectedRideDetails.pricePerKm && currentUser?.distanceToCollege
                                  ? Math.round(selectedRideDetails.pricePerKm * currentUser.distanceToCollege)
                                  : "0.00"}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Fare calculated based on ₹{selectedRideDetails.pricePerKm}/km
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clear divider */}
                    <div className="border-t border-gray-200 my-6"></div>

                    {/* Driver Information */}
                    <div className="pt-2">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Driver Information
                      </h3>
                      <div className="flex items-center mb-6">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <Car className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {selectedRideDetails.driver.driverProfile?.vehicle?.model && 
                             selectedRideDetails.driver.driverProfile?.vehicle?.color ? 
                              `Vehicle: ${selectedRideDetails.driver.driverProfile.vehicle.model} (${selectedRideDetails.driver.driverProfile.vehicle.color})` : 
                              'Vehicle details not available'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Gender: {selectedRideDetails.driver.gender ? selectedRideDetails.driver.gender.charAt(0).toUpperCase() + selectedRideDetails.driver.gender.slice(1) : 'Not specified'}
                          </p>
                          {selectedRideDetails.driver.srn && (
                            <p className="text-sm text-gray-600">
                              SRN: {selectedRideDetails.driver.srn.slice(0, -3) + 'XXX'}
                            </p>
                          )}
                          {selectedRideDetails.driver.driverProfile?.reliabilityRate !== undefined && (
                            <p className="text-sm text-gray-600">
                              Reliability: <span className={`font-medium ${
                                selectedRideDetails.driver.driverProfile.reliabilityRate > 80 ? 'text-green-600' : 
                                selectedRideDetails.driver.driverProfile.reliabilityRate > 60 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {selectedRideDetails.driver.driverProfile.reliabilityRate.toFixed(1)}%
                              </span>
                            </p>
                          )}
                          <p className="text-sm text-gray-500 italic mt-2">
                            Driver's name, phone number and vehicle's registration number will be visible once your ride request is accepted
                          </p>
                          <p className="text-sm text-gray-500 italic mt-2">
                            Note: Your name and phone number will not be shown to the driver until they accept your ride request.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRequestRide(selectedRideDetails._id)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Request This Ride
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Select a ride
                  </h3>
                  <p className="text-gray-500">
                    Click on a ride to view route and driver details
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RideSearch;
