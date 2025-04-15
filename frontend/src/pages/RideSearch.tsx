import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Clock, Filter, X, Calendar, XCircle, Loader } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import MapPreview from "../components/MapPreview";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import api from "../utils/api"; // Import our API utility
import LoadingButton from "../components/LoadingButton";

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
  hitchers?: any[];
  pricePerKm?: number;
  vehicleModel?: string;
}

const RideSearch: React.FC = () => {
  const { currentUser, allRides, fetchAllRides, setAllRides } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [direction, setDirection] = useState<"toCollege" | "fromCollege" | "">("");
  const [driverGender, setDriverGender] = useState<"" | "male" | "female">("");
  const [isLoading, setIsLoading] = useState(false);
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
  const [showRideDetailsModal, setShowRideDetailsModal] = useState(false);
  const rideListRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [filteredRides, setFilteredRides] = useState<RideWithCollegeInfo[]>([]);
  const [ridesLoaded, setRidesLoaded] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState("");
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1);

  // Add these date calculations near the top of the component
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateString = maxDate.toISOString().split("T")[0];

  // Define placeholder locations based on college
  const ecCampusLocations = [
    "Bannerghatta", 
    "HSR Layout", 
    "Koramangala", 
    "Electronic City Phase 2", 
    "Jayanagar", 
    "Neeladri"
  ];
  
  const rrCampusLocations = [
    "Bannerghatta", 
    "Jayanagar", 
    "Koramangala",
    "Uttarahalli", 
    "Kanakpura"
  ];

  // Update useEffect for dynamic placeholder with fading animation
  useEffect(() => {
    // Determine which set of locations to use based on user's college
    const locations = currentUser?.college === "PES University Electronic City Campus" 
      ? ecCampusLocations 
      : rrCampusLocations;
    
    let currentIndex = 0;
    
    // Set initial placeholder
    setSearchPlaceholder(locations[currentIndex]);
    setPlaceholderOpacity(1);
    
    // Create interval to rotate through placeholders
    const interval = setInterval(() => {
      // Start fading out
      setPlaceholderOpacity(0);
      
      // After fading out, change the text and fade back in
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % locations.length;
        setSearchPlaceholder(locations[currentIndex]);
        setPlaceholderOpacity(1);
      }, 300); // Half the time for fade out, then change text
    }, 1500);
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [currentUser?.college]);

  // Add useEffect to detect iOS
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  // Modified fetch function to only get rides for a specific date and direction
  const fetchRidesForDate = async (date: string, direction: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/rides?date=${date}${direction ? `&direction=${direction}` : ''}`);
      setAllRides(response.data.rides);
      setRidesLoaded(true);
    } catch (error) {
      console.error("Error fetching rides:", error);
      setNotification({
        show: true,
        message: "Error loading rides. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date selection and fetch rides
  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    if (date) {
      fetchRidesForDate(date, direction);
    } else {
      setRidesLoaded(false);
      setAllRides([]);
    }
  };

  // Handle direction change
  const handleDirectionChange = (newDirection: string) => {
    setDirection(newDirection as "toCollege" | "fromCollege" | "");
    if (selectedDate) {
      fetchRidesForDate(selectedDate, newDirection);
    }
  };

  // Filter rides when allRides or filters change
  useEffect(() => {
    if (currentUser && ridesLoaded) {
      const filtered = allRides.filter((ride) => {
        // Skip rides that have invalid data
        if (!ride || !ride.driver) {
          return false;
        }
        
        // Get hitcher status if user has requested this ride
        const hitcherStatus = ride.hitchers?.find(h => h.user?._id === currentUser.id)?.status;
        
        // Don't show rides that the user has already requested (regardless of status)
        if (hitcherStatus) {
          return false;
        }

        // Exclude cancelled rides
        if (ride.status === "cancelled") {
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

        // Filter by search query (location) - only search in driver's address (home location)
        // and normalize the search to ignore spaces and punctuation
        if (searchQuery) {
          const normalizedSearch = searchQuery.toLowerCase().replace(/[^\w]/g, '');
          // Check the correct field based on direction: 
          // For "toCollege" rides, the driver's home is in the "from" field
          // For "fromCollege" rides, the driver's home is in the "to" field
          const driverHomeLocation = ride.direction === "toCollege" ? ride.from : ride.to;
          const normalizedAddress = driverHomeLocation.toLowerCase().replace(/[^\w]/g, '');
          if (!normalizedAddress.includes(normalizedSearch)) {
            return false;
          }
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
  }, [allRides, currentUser, searchQuery, direction, selectedDate, minTime, maxTime, driverGender, ridesLoaded]);

  // Deselect ride when any search parameter changes
  useEffect(() => {
    setSelectedRideId(null);
    setSelectedRideDetails(null);
  }, [searchQuery, selectedDate, direction, minTime, maxTime]);

  // Update the click outside handler to work with modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        !rideListRef.current?.contains(target) &&
        showRideDetailsModal
      ) {
        closeRideDetailsModal();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRideDetailsModal]);

  // Close modal function
  const closeRideDetailsModal = () => {
    setShowRideDetailsModal(false);
    setSelectedRideId(null);
    setSelectedRideDetails(null);
  };

  // Update the function to open the modal when a ride is selected
  const handleRideSelection = (ride: RideWithCollegeInfo) => {
    setSelectedRideId(ride._id);
    setSelectedRideDetails(ride);
    setShowRideDetailsModal(true);
  };

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
    if (isLoading) return; // Prevent multiple clicks
    
    setIsLoading(true);
    try {
      const selectedRide = allRides.find((ride) => ride._id === rideId);
      if (!selectedRide) {
        setIsLoading(false);
        return;
      }

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
        setIsLoading(false);
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
        setIsLoading(false);
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

      await api.post("/api/rides/request", hitcherData);

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
    } finally {
      setIsLoading(false);
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

  // Add a style tag in the component to define the CSS for placeholder opacity
  useEffect(() => {
    // Add a style tag to the document head for custom placeholder styling
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      #locationSearch::placeholder {
        transition: opacity 0.3s ease-in-out;
        opacity: var(--placeholder-opacity, 1);
      }
    `;
    document.head.appendChild(styleTag);
    
    // Clean up the style tag when component unmounts
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

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
            } transition-all duration-300 z-50`}
          >
            <span>{notification.message}</span>
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

        {/* Date Selection Panel - Always visible */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select a Date and Direction to View Available Rides</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto">
              <select
                value={direction}
                onChange={(e) => handleDirectionChange(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-4 sm:mb-0 sm:mr-4"
                disabled={isLoading}
                required
              >
                <option value="">Select Direction</option>
                <option value="toCollege">To College</option>
                <option value="fromCollege">From College</option>
              </select>
            </div>
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelection(e.target.value)}
                min={today}
                max={maxDateString}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading || !direction}
                required
              />
              {isIOS && (
                <p className="text-gray-500 text-sm mt-1">
                  Select a date
                </p>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {isLoading ? (
                <span className="flex items-center">
                  <Loader className="animate-spin h-4 w-4 mr-1" />
                  Loading rides...
                </span>
              ) : !direction ? "Please select a direction first" : !selectedDate ? "Please select a date to continue" : "Showing rides for selected date and direction"}
            </p>
          </div>
        </div>

        {/* Show search filters and ride listings if a date is selected and rides are loaded */}
        {selectedDate && ridesLoaded && (
          <>
            {/* Search and filter bar */}
            <div
              ref={searchBarRef}
              className="bg-white rounded-lg shadow-md p-4 mb-6"
            >
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <label
                    htmlFor="locationSearch"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Search by Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="locationSearch"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      style={{ 
                        "--placeholder-opacity": placeholderOpacity
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="driverGender"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Driver Gender
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      id="driverGender"
                      value={driverGender}
                      onChange={(e) => setDriverGender(e.target.value as "" | "male" | "female")}
                      className="block w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Any Gender</option>
                      <option value="male">Male Drivers</option>
                      <option value="female">Female Drivers</option>
                    </select>

                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 h-[42px]"
                    >
                      {showFilters ? (
                        <X className="h-4 w-4 mr-1" />
                      ) : (
                        <Filter className="h-4 w-4 mr-1" />
                      )}
                      {showFilters ? "Hide Filters" : "Time Filters"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Time filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
                  <div className="flex-1">
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

                  <div className="flex-1">
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

            {filteredRides.length > 0 ? (
              <div className="space-y-6" ref={rideListRef}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {filteredRides.length}{" "}
                  {filteredRides.length === 1 ? "Ride" : "Rides"} Available
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRides.map((ride) => (
                    <div
                      key={ride._id}
                      className="bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg border border-gray-200 hover:border-blue-300"
                      onClick={() => handleRideSelection(ride)}
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
                        <div className="flex flex-col items-end">
                          <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                            {ride.availableSeats} seats left
                          </span>
                        </div>
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
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No rides found
                </h3>
                <p className="text-gray-500">
                  No rides available for {new Date(selectedDate).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
                </p>
                <p className="text-gray-500 mt-2">
                  Try selecting a different date or check back later
                </p>
              </div>
            )}
          </>
        )}

        {/* Show prompt when no date is selected */}
        {!selectedDate && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Select a Date First
            </h3>
            <p className="text-gray-500">
              Please select a date to see available rides for that day
            </p>
          </div>
        )}

        {/* Ride Details Modal */}
        {showRideDetailsModal && selectedRideDetails && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div 
              ref={modalRef}
              className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Close button */}
              <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold">Ride Details</h3>
                <button 
                  onClick={closeRideDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              {selectedRideDetails.direction === "toCollege" ? (
                <div className="mx-6 mt-2 text-red-500 text-sm">Your ride is likely to be accepted if your pickup point is on the way for the driver</div>
              ) : (
                <div className="mx-6 mt-2 text-red-500 text-sm">Your ride is likely to be accepted if your dropoff point is on the way for the driver</div>
              )}
              <div className="p-4">
                {/* Map Preview - Properly contained with enough space */}
                <div className="relative mb-8">
                  <MapPreview
                    startLocation={selectedRideDetails.from}
                    endLocation={selectedRideDetails.to}
                    userLocation={currentUser?.homeAddress || ""}
                    direction={selectedRideDetails.direction}
                    className="shadow-sm rounded-lg overflow-hidden"
                    showAddressLabels={true}
                  />
                </div>

                {/* Time and Date section */}
                <div className="bg-gray-50 rounded-md p-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      {selectedRideDetails.direction === "toCollege"
                        ? formatTime(selectedRideDetails.toCollegeTime)
                        : formatTime(selectedRideDetails.fromCollegeTime)}
                    </span>
                  </div>
                  {selectedRideDetails.direction === "toCollege" && (
                    <div className="text-xs text-red-500 mt-1">
                      (This is the time that the driver will leave from their home)
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {format(new Date(selectedRideDetails.date), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    {/* Distance and Fare Information */}
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Fare Details
                    </h3>
                    <div className="bg-blue-50 rounded-md p-4">
                      <div className="text-sm text-gray-800 space-y-2">
                        <div>
                          <span>Distance: </span>
                          <span className="font-medium">{currentUser?.distanceToCollege} km</span>
                        </div>
                        <div>
                          <span>Rate: </span>
                          <span className="font-medium">₹{selectedRideDetails.pricePerKm}/km</span>
                        </div>
                        <div className="pt-2 border-t border-blue-100">
                          <span className="font-medium">Fare: </span>
                          <span className="font-bold text-lg">
                            ₹{selectedRideDetails.pricePerKm && currentUser?.distanceToCollege
                                ? Math.round(selectedRideDetails.pricePerKm * currentUser.distanceToCollege)
                                : "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Driver Information */}
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Driver Information
                    </h3>
                    <div className="bg-gray-50 rounded-md p-4">
                      <div className="space-y-2">
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
                      </div>

                      <p className="text-xs text-gray-500 italic mt-3">
                        Driver's name, phone and registration number will be visible after request is accepted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Get hitcher status if user has requested this ride */}
                {(() => {
                  const hitcherStatus = selectedRideDetails.hitchers?.find(h => h.user?._id === currentUser?.id)?.status;
                  
                  if (hitcherStatus) {
                    return (
                      <button
                        disabled
                        className={`w-full px-4 py-3 rounded-md font-medium ${
                          hitcherStatus === "accepted"
                            ? "bg-green-600 text-white"
                            : hitcherStatus === "pending"
                            ? "bg-yellow-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {hitcherStatus === "accepted"
                          ? "Ride Accepted"
                          : hitcherStatus === "pending"
                          ? "Request Pending"
                          : "Request Declined"}
                      </button>
                    );
                  }
                  
                  return (
                    <LoadingButton
                      onClick={() => handleRequestRide(selectedRideDetails._id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      disabled={isLoading}
                      loadingText="Sending Request..."
                    >
                      Request Ride
                    </LoadingButton>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RideSearch;
