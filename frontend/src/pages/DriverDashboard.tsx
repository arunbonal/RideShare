import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, Plus, Calendar, Clock, Users, MapPin, List, X, ChevronDown, AlertTriangle, Bug, XCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { Ride } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import MapPreview from "../components/MapPreview";
import LoadingButton from "../components/LoadingButton";
import { format } from "date-fns";
import api from "../utils/api"; // Import API utility

// Define the User interface for hitchers
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  srn?: string;
  hitcherProfile?: {
    reliabilityRate: number;
  };
}

// Extend the Ride interface to include totalFare as a number
interface ExtendedRide extends Ride {
  totalFare: number;
  hitchers?: {
    user: User;
    status: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    fare?: number;
    requestTime: string;
  }[];
}

const DriverDashboard: React.FC = () => {
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [driverRides, setDriverRides] = useState<ExtendedRide[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<ExtendedRide[]>([]);
  const [pastRides, setPastRides] = useState<ExtendedRide[]>([]);
  const [expandedRides, setExpandedRides] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });
  const [requestModal, setRequestModal] = useState<{
    show: boolean;
    rideId: string;
  }>(
    {
      show: false,
      rideId: ""
    }
  );
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const navigate = useNavigate();
  
  // Helper function to count accepted hitchers in a ride
  const countAcceptedHitchers = (ride: ExtendedRide): number => {
    if (!ride.hitchers || ride.hitchers.length === 0) {
      return 0;
    }
    
    // Look for hitchers with accepted status or any status indicating they were accepted before cancellation
    return ride.hitchers.filter(h => 
      h.status === "accepted" || 
      h.status === "accepted-then-cancelled" || 
      h.status === "cancelled-by-driver"
    ).length;
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showReportDropdown && !target.closest(".report-dropdown-container")) {
        setShowReportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReportDropdown]);
  
  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Fetch all rides when component mounts
  useEffect(() => {
    if (currentUser?.driverProfileComplete) {
      fetchAllRides();
    }
  }, [currentUser, fetchAllRides]);

  // Check for unread notifications
  useEffect(() => {
    if (currentUser) {
      // Get already seen notification IDs from localStorage
      const seenNotifications = JSON.parse(localStorage.getItem('seenDriverNotifications') || '[]');
      
      // Check for unread notifications in all rides
      const unreadNotifications = allRides
        .filter(ride => ride.driver._id === currentUser.id)
        .flatMap(ride => 
          (ride.notifications || [])
            .filter(n => !n.read && n.userId === currentUser.id && !seenNotifications.includes(n._id))
            .map(n => {
              // Determine notification type
              let notificationType: "success" | "error" | "info" = "info";
              if (n.message.includes('accepted')) {
                notificationType = "success";
              } else if (n.message.includes('cancelled') || n.message.includes('rejected')) {
                notificationType = "error";
              } else if (n.message.includes('requested')) {
                notificationType = "info";
              }
              
              return { 
                _id: n._id,
                message: n.message,
                rideId: ride._id,
                type: notificationType
              };
            })
        );
      
      // Show the first unread notification if any
      if (unreadNotifications.length > 0) {
        setNotification({
          show: true,
          message: unreadNotifications[0].message,
          type: unreadNotifications[0].type
        });
        
        // Mark this notification as seen locally
        localStorage.setItem(
          'seenDriverNotifications', 
          JSON.stringify([...seenNotifications, unreadNotifications[0]._id])
        );
        
        // Mark notification as read in the backend
        markNotificationAsRead(unreadNotifications[0].rideId, unreadNotifications[0]._id);
      }
    }
  }, [allRides, currentUser]);

  const markNotificationAsRead = async (rideId: string, notificationId: string) => {
    try {
      await api.post(
        "/api/rides/notifications/read",
        {
          rideId,
          notificationId
        }
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Filter rides for the current driver and separate into upcoming and past
  useEffect(() => {
    if (currentUser) {
      // Filter rides for current driver
      const currentDriverRides = allRides.filter(
        (ride) => ride.driver._id === currentUser.id
      ).map(ride => ({
        ...ride,
        totalFare: ride.totalFare || 0
      })) as ExtendedRide[];
      
      setDriverRides(currentDriverRides);

      const { upcomingRides, pastRides } = filterRides(currentDriverRides);

      setUpcomingRides(upcomingRides);
      setPastRides(pastRides);
    }
  }, [allRides, currentUser]);

  // When filtering rides into past and upcoming categories
  const filterRides = (rides: ExtendedRide[]): { upcomingRides: ExtendedRide[], pastRides: ExtendedRide[] } => {
    const now = new Date();
    
    // Check for rides that need status updates
    rides.forEach(ride => {
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
        
        // Set ride to "in-progress" if time has passed but within 2 hours
        const twoHoursAfterRide = new Date(rideDate);
        twoHoursAfterRide.setHours(twoHoursAfterRide.getHours() + 2);
        
        if (now >= rideDate && now < twoHoursAfterRide && ride.status === "scheduled") {
          // Update ride status to in-progress
          updateRideStatus(ride._id, "in-progress");
          ride.status = "in-progress"; // Update local state immediately
        } 
        // Set ride to "completed" if more than 2 hours have passed
        else if (now >= twoHoursAfterRide && (ride.status === "scheduled" || ride.status === "in-progress")) {
          // Update ride status to completed
          updateRideStatus(ride._id, "completed");
          ride.status = "completed"; // Update local state immediately
        }
      }
    });
    
    const upcomingRides = rides.filter((ride: ExtendedRide) => {
      // Create a datetime by combining the date with the appropriate time
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
      }
      
      // Consider in-progress rides as upcoming
      return (rideDate >= now || ride.status === "in-progress") && ride.status !== "cancelled" && ride.status !== "completed";
    });
    
    const pastRides = rides.filter((ride: ExtendedRide) => {
      // Create a datetime by combining the date with the appropriate time
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
        
        // If more than 2 hours have passed since ride time, consider it past
        const twoHoursAfterRide = new Date(rideDate);
        twoHoursAfterRide.setHours(twoHoursAfterRide.getHours() + 2);
        
        return now >= twoHoursAfterRide || ride.status === "cancelled" || ride.status === "completed";
      }
      
      // For rides without time, compare just the date
      return rideDate < now || ride.status === "cancelled" || ride.status === "completed";
    });
    
    return { upcomingRides, pastRides };
  };

  // Function to update ride status on the backend
  const updateRideStatus = async (rideId: string, status: "scheduled" | "in-progress" | "completed" | "cancelled") => {
    try {
      await api.post(
        "/api/rides/update-status",
        {
          rideId,
          status
        }
      );
      // No need to fetch all rides here as it would cause UI flicker
      // Status is already updated in local state
    } catch (error) {
      console.error(`Error updating ride status to ${status}:`, error);
    }
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  // Get pending requests from upcoming rides
  const pendingRequests = upcomingRides.flatMap((ride) =>
    (ride.hitchers || [])
      .filter((hitcher) => hitcher.status === "pending" && hitcher.user)
      .map((hitcher) => ({
        hitcherId: hitcher.user._id,
        rideId: ride._id,
        hitcherName: hitcher.user.name,
        hitcherPhone: hitcher.user.phone,
        hitcherGender: hitcher.user.gender || "Not specified",
        hitcherSRN: hitcher.user.srn ? `${hitcher.user.srn.slice(0, -3)}XXX` : undefined,
        hitcherReliability: hitcher.user.hitcherProfile?.reliabilityRate || 100,
        rideDirection: ride.direction,
        pickupLocation: hitcher.pickupLocation || "Not specified",
        dropoffLocation: hitcher.dropoffLocation || "Not specified",
        requestTime: hitcher.requestTime || new Date().toISOString(),
        fare: hitcher.fare || 0,
        driverLocation: ride.from,
        from: ride.from,
        to: ride.to,
        // Include all accepted hitchers' locations for this ride
        acceptedHitchersLocations: ride.hitchers
          ?.filter(h => h.status === "accepted")
          .map(h => ride.direction === "toCollege" ? h.pickupLocation : h.dropoffLocation)
          .filter(Boolean) || []
      }))
  );

  // Add function to get requests for a specific ride
  const getRequestsForRide = (rideId: string) => {
    return pendingRequests.filter(request => request.rideId === rideId);
  };

  // Add closeModal function
  const closeRequestModal = () => {
    setRequestModal({
      show: false,
      rideId: ""
    });
    setCurrentRequestIndex(0);
  };

  // Add function to handle next and previous navigation in modal
  const handleRequestNavigation = (direction: "next" | "prev") => {
    const requests = getRequestsForRide(requestModal.rideId);
    
    if (direction === "next") {
      setCurrentRequestIndex(prev => 
        prev === requests.length - 1 ? 0 : prev + 1
      );
    } else {
      setCurrentRequestIndex(prev => 
        prev === 0 ? requests.length - 1 : prev - 1
      );
    }
  };

  // Add effect to ensure currentRequestIndex is valid
  useEffect(() => {
    if (requestModal.show) {
      const requests = getRequestsForRide(requestModal.rideId);
      // If current index is out of bounds, reset to 0 or close modal if empty
      if (currentRequestIndex >= requests.length) {
        if (requests.length > 0) {
          setCurrentRequestIndex(0);
        } else {
          closeRequestModal();
        }
      }
    }
  }, [pendingRequests, requestModal, currentRequestIndex]);

  const handleAcceptRequest = async (rideId: string, hitcherId: string) => {
    try {
      // First check if the ride is still active
      const rideCheckResponse = await api.get(
        `/api/rides/${rideId}/status`
      );
      
      // If ride is already cancelled or completed
      if (rideCheckResponse.data.rideStatus !== "scheduled") {
        setNotification({
          show: true,
          message: `Cannot accept request. This ride is ${rideCheckResponse.data.rideStatus}.`,
          type: "error"
        });
        await fetchAllRides(); // Refresh to get updated status
        return;
      }

      // Then check if the hitcher request is still pending
      const hitcherCheckResponse = await api.get(
        `/api/rides/${rideId}/hitcher/${hitcherId}/status`
      );
      
      // If request is already cancelled by hitcher
      if (hitcherCheckResponse.data.hitcherStatus === "cancelled") {
        setNotification({
          show: true,
          message: "This ride request has already been cancelled by the hitcher.",
          type: "error"
        });
        await fetchAllRides(); // Refresh to get updated status
        return;
      }
      
      // If request is already accepted or rejected
      if (hitcherCheckResponse.data.hitcherStatus === "accepted") {
        setNotification({
          show: true,
          message: "This ride request has already been accepted.",
          type: "error"
        });
        await fetchAllRides();
        return;
      }
      
      if (hitcherCheckResponse.data.hitcherStatus === "rejected") {
        setNotification({
          show: true,
          message: "This ride request has already been rejected.",
          type: "error"
        });
        await fetchAllRides();
        return;
      }

      const response = await api.post(
        "/api/rides/accept",
        {
          rideId,
          hitcherId
        }
      );
      
      // Fetch fresh data to update the UI
      await fetchAllRides();
      
      // Show success notification
      setNotification({
        show: true,
        message: "Request accepted successfully",
        type: "success"
      });
      
      // Check if this was the last request for this ride
      const remainingRequests = getRequestsForRide(rideId).filter(req => req.hitcherId !== hitcherId);
      if (remainingRequests.length === 0) {
        closeRequestModal();
      }
    } catch (error: any) {
      console.error("Error accepting request:", error);
      
      // Handle specific error cases
      if (error.response?.data?.alreadyCancelled) {
        setNotification({
          show: true,
          message: "This ride request has already been cancelled by the hitcher.",
          type: "error"
        });
      } else if (error.response?.data?.noSeatsAvailable) {
        setNotification({
          show: true,
          message: "No seats available for this ride.",
          type: "error"
        });
      } else {
        setNotification({
          show: true,
          message: error.response?.data?.message || "Failed to accept request. Please try again.",
          type: "error"
        });
      }
      
      // Refresh rides to get the updated status
      await fetchAllRides();
    }
  };

  const handleRejectRequest = async (rideId: string, hitcherId: string) => {
    try {
      // First check if the ride is still active
      const rideCheckResponse = await api.get(
        `/api/rides/${rideId}/status`
      );
      
      // If ride is already cancelled or completed
      if (rideCheckResponse.data.rideStatus !== "scheduled") {
        setNotification({
          show: true,
          message: `Cannot reject request. This ride is ${rideCheckResponse.data.rideStatus}.`,
          type: "error"
        });
        await fetchAllRides(); // Refresh to get updated status
        return;
      }

      // Then check if the hitcher request is still pending
      const hitcherCheckResponse = await api.get(
        `/api/rides/${rideId}/hitcher/${hitcherId}/status`
      );
      
      // If request is already cancelled by hitcher
      if (hitcherCheckResponse.data.hitcherStatus === "cancelled") {
        setNotification({
          show: true,
          message: "This ride request has already been cancelled by the hitcher.",
          type: "error"
        });
        await fetchAllRides(); // Refresh to get updated status
        return;
      }
      
      // If request is already accepted or rejected
      if (hitcherCheckResponse.data.hitcherStatus === "accepted") {
        setNotification({
          show: true,
          message: "This ride request has already been accepted.",
          type: "error"
        });
        await fetchAllRides();
        return;
      }
      
      if (hitcherCheckResponse.data.hitcherStatus === "rejected") {
        setNotification({
          show: true,
          message: "This ride request has already been rejected.",
          type: "error"
        });
        await fetchAllRides();
        return;
      }

      await api.post(
        "/api/rides/reject",
        {
          rideId,
          hitcherId
        }
      );
      
      // Fetch fresh data to update the UI
      await fetchAllRides();
      
      // Show success notification
      setNotification({
        show: true,
        message: "Request declined successfully",
        type: "success"
      });
      
      // Check if this was the last request for this ride
      const remainingRequests = getRequestsForRide(rideId).filter(req => req.hitcherId !== hitcherId);
      if (remainingRequests.length === 0) {
        closeRequestModal();
      }
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      setNotification({
        show: true,
        message: error.response?.data?.message || "Failed to reject request. Please try again.",
        type: "error"
      });
      await fetchAllRides();
    }
  };

  // Add toggle function for expanding/collapsing rides
  const toggleRideExpand = (rideId: string) => {
    setExpandedRides(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rideId)) {
        newSet.delete(rideId);
      } else {
        newSet.add(rideId);
      }
      return newSet;
    });
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
                : notification.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            } transition-all duration-300 z-50`}
          >
            <span>{notification.message}</span>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Driver Dashboard
                </h1>
                <p className="text-gray-600">
                  Manage your rides and hitcher requests
                </p>
              </div>
              {(activeTab === "upcoming" ? upcomingRides.length > 0 : pastRides.length > 0) && (
                <div className="relative report-dropdown-container">
                  <button
                    onClick={() => setShowReportDropdown(!showReportDropdown)}
                    className="ml-4 mr-4 inline-flex items-center px-4 py-2 border border-red-300 text-red-700 bg-white rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Report an Issue
                    <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showReportDropdown ? 'transform rotate-180' : ''}`} />
                  </button>
                  
                  {showReportDropdown && (
                    <div className="absolute right-4 mt-2 w-60 bg-white rounded-md shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          navigate("/report", { state: { type: "ride" } });
                          setShowReportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 flex items-center"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                        Report Ride Issue
                      </button>
                      <button
                        onClick={() => {
                          navigate("/report", { state: { type: "bug" } });
                          setShowReportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 flex items-center"
                      >
                        <Bug className="h-4 w-4 mr-2 text-red-600" />
                        Report Bugs/Request Features
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 md:mt-0 space-x-4 flex items-center">
            <Link
              to="/rides/manage"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <List className="h-5 w-5 mr-1" />
              Manage Rides
            </Link>
            <Link
              to="/rides/create"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5 mr-1" />
              Create New Ride
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Main content */}
          <div>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`py-4 px-6 font-medium text-sm border-b-2 ${
                    activeTab === "upcoming"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Upcoming Rides ({upcomingRides.length})
                </button>
                <button
                  onClick={() => setActiveTab("past")}
                  className={`py-4 px-6 font-medium text-sm border-b-2 ${
                    activeTab === "past"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Past Rides ({pastRides.length})
                </button>
              </nav>
            </div>

            {/* Ride listings */}
            <div className="space-y-6">
              {activeTab === "upcoming" ? (
                upcomingRides.length > 0 ? (
                  upcomingRides.map((ride) => (
                    <div
                      key={ride._id}
                      className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
                      onClick={() => toggleRideExpand(ride._id)}
                    >
                      {/* Mobile layout (stacked) */}
                      <div className="block md:hidden">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {ride.direction === "toCollege"
                              ? "To College"
                              : "From College"}
                          </h3>
                          <span
                            className={`px-2 py-1 text-sm font-medium rounded-full ${
                              ride.status === "scheduled"
                                ? "bg-green-100 text-green-800"
                                : ride.status === "in-progress"
                                ? "bg-blue-100 text-blue-800"
                                : ride.status === "completed"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {ride.status === "cancelled"
                              ? (() => {
                                  const acceptedHitchers = countAcceptedHitchers(ride);
                                  return acceptedHitchers > 0 
                                    ? `Cancelled by You (${acceptedHitchers} ${acceptedHitchers === 1 ? 'hitcher' : 'hitchers'})`
                                    : "Cancelled by You";
                                })()
                              : ride.status.charAt(0).toUpperCase() +
                                ride.status.slice(1)}
                          </span>
                        </div>
                        
                        <p className="text-gray-500 mb-3">
                          {format(new Date(ride.date), "EEEE, MMMM d, yyyy")}
                        </p>
                        
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-md text-gray-600">
                            <Clock className="h-5 w-4 inline mr-1" />
                            {ride.direction === "toCollege"
                              ? formatTime(ride.toCollegeTime || "")
                              : formatTime(ride.fromCollegeTime || "")}
                          </p>
                          
                          {ride.totalFare > 0 && (
                            <span className="px-2 py-1 text-sm font-medium bg-green-50 text-green-700 rounded-full">
                              You'll receive ₹{ride.totalFare.toFixed(2)} in Total
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mb-2">
                          {(() => {
                            const acceptedCount = countAcceptedHitchers(ride);
                            return acceptedCount > 0 ? (
                              <p className="text-sm text-green-600">
                                <Users className="h-4 w-4 inline mr-1" />
                                {acceptedCount} {acceptedCount === 1 ? 'Hitcher' : 'Hitchers'} Accepted
                              </p>
                            ) : (
                              <span></span> // Empty span to maintain layout when no hitchers
                            );
                          })()}
                          
                          <button
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRideExpand(ride._id);
                            }}
                          >
                            <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${expandedRides.has(ride._id) ? 'transform rotate-180' : ''}`} />
                          </button>
                        </div>
                        
                        {getRequestsForRide(ride._id).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRequestModal({
                                show: true,
                                rideId: ride._id
                              });
                              setCurrentRequestIndex(0);
                            }}
                            className="w-full mt-2 px-3 py-2 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center justify-center"
                          >
                            <Users className="h-5 w-5 mr-2" />
                            View {getRequestsForRide(ride._id).length} Ride {getRequestsForRide(ride._id).length === 1 ? 'Request' : 'Requests'}
                          </button>
                        )}
                      </div>
                      
                      {/* Desktop layout */}
                      <div className="hidden md:block">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {ride.direction === "toCollege"
                                ? "To College"
                                : "From College"}
                            </h3>
                            <p className="text-gray-500">
                              {format(new Date(ride.date), "EEEE, MMMM d, yyyy")}
                            </p>
                            <p className="text-md text-gray-600 mt-2">
                              <Clock className="h-5 w-4 inline mr-1" />
                              {ride.direction === "toCollege"
                                ? formatTime(ride.toCollegeTime || "")
                                : formatTime(ride.fromCollegeTime || "")}
                            </p>
                            {(() => {
                              const acceptedCount = countAcceptedHitchers(ride);
                              return acceptedCount > 0 && (
                                <p className="text-sm text-green-600 mt-2">
                                  <Users className="h-4 w-4 inline mr-1" />
                                  {acceptedCount} {acceptedCount === 1 ? 'Hitcher' : 'Hitchers'} Accepted
                                </p>
                              );
                            })()}
                            
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <span
                              className={`px-2 py-1 text-sm font-medium rounded-full ${
                                ride.status === "scheduled"
                                  ? "bg-green-100 text-green-800"
                                  : ride.status === "in-progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : ride.status === "completed"
                                  ? "bg-gray-100 text-gray-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {ride.status === "cancelled"
                                ? (() => {
                                    // Count any hitchers that have status "accepted" or had their request accepted before cancellation
                                    const acceptedHitchers = countAcceptedHitchers(ride);
                                    
                                    console.log("DriverDashboard.tsx (upcoming) - Cancelled ride:", ride._id, "Accepted hitchers:", acceptedHitchers, "Hitcher statuses:", ride.hitchers?.map(h => h.status));
                                    
                                    return acceptedHitchers > 0 
                                      ? `Cancelled by You (${acceptedHitchers} ${acceptedHitchers === 1 ? 'hitcher' : 'hitchers'})`
                                      : "Cancelled by You";
                                  })()
                                : ride.status.charAt(0).toUpperCase() +
                                  ride.status.slice(1)}
                            </span>
                            
                            {getRequestsForRide(ride._id).length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRequestModal({
                                    show: true,
                                    rideId: ride._id
                                  });
                                  setCurrentRequestIndex(0);
                                }}
                                className="px-3 py-2 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 flex items-center"
                              >
                                <Users className="h-5 w-5 mr-2" />
                                View {getRequestsForRide(ride._id).length} Ride {getRequestsForRide(ride._id).length === 1 ? 'Request' : 'Requests'}
                              </button>
                            )}
                            {ride.totalFare > 0 && (
                              <span className="px-2 py-1 text-sm font-medium bg-green-50 text-green-700 rounded-full">
                                You'll receive ₹{ride.totalFare.toFixed(2)} in Total
                              </span>
                            )}
                            <button
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRideExpand(ride._id);
                              }}
                            >
                              <ChevronDown className={`h-5 w-5 mt-5 transition-transform duration-200 ${expandedRides.has(ride._id) ? 'transform rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {expandedRides.has(ride._id) && (
                        <div className="mt-4 space-y-3">
                          
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-5 w-5 mr-2" />
                            From: {ride.direction === "toCollege" ? `${ride.from}` : ride.from}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-5 w-5 mr-2" />
                            To: {ride.direction === "fromCollege" ? `${ride.to}` : ride.to}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <Users className="h-5 w-5 mr-2" />
                            <span>Available Seats: {ride.availableSeats}</span>
                            {(() => {
                              const acceptedCount = countAcceptedHitchers(ride);
                              return (
                                acceptedCount > 0 && (
                                  <span className="ml-4 bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                                    {acceptedCount} Accepted
                                  </span>
                                )
                              );
                            })()}
                          </div>
                          
                          <p className="mt-4 text-md text-red-700">
                            Your Current Route:
                          </p>
                          <div className="mt-2 mb-2">
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ride.direction === "toCollege" ? ride.from : ride.from)}&destination=${encodeURIComponent(ride.direction === "fromCollege" ? ride.to : ride.to)}&waypoints=${
                                ride.hitchers
                                  ?.filter(h => h.status === "accepted")
                                  .map(h => ride.direction === "toCollege" ? encodeURIComponent(h.pickupLocation || "") : encodeURIComponent(h.dropoffLocation || ""))
                                  .filter(Boolean)
                                  .join("|")
                              }&travelmode=driving`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              Open in Google Maps
                            </a>
                          </div>
                          <div className="mt-4">
                            <MapPreview
                              startLocation={`${ride.direction === "toCollege" ? `${ride.from} (Your Address)` : ride.from}`}
                              endLocation={`${ride.direction === "fromCollege" ? `${ride.to} (Your Address)` : ride.to}`}
                              userLocation={ride.hitchers
                                ?.filter(h => h.status === "accepted")
                                .map(h => ride.direction === "toCollege" ? h.pickupLocation : h.dropoffLocation)
                                .filter(Boolean)
                                .join("|")}
                              className="rounded-lg shadow-sm"
                              direction={ride.direction}
                              hitcherNames={ride.hitchers
                                ?.filter(h => h.status === "accepted")
                                .map(h => h.user.name)}
                              hitcherPhones={ride.hitchers
                                ?.filter(h => h.status === "accepted")
                                .map(h => h.user.phone)}
                              hitcherFares={ride.hitchers
                                ?.filter(h => h.status === "accepted")
                                .map(h => h.fare || 0)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No upcoming rides
                    </h3>
                    <p className="text-gray-500 mb-4">
                      You don't have any upcoming rides scheduled.
                    </p>
                    <Link
                      to="/rides/create"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create a new ride
                    </Link>
                  </div>
                )
              ) : pastRides.length > 0 ? (
                pastRides.map((ride) => (
                  <div
                    key={ride._id}
                    className="bg-white rounded-lg shadow-md p-6"
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
                      <span
                        className={`px-2 py-1 text-sm font-medium rounded-full ${
                          ride.status === "completed"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ride.status === "cancelled"
                          ? (() => {
                              // Count any hitchers that have status "accepted" or had their request accepted before cancellation
                              const acceptedHitchers = countAcceptedHitchers(ride);
                              
                              console.log("DriverDashboard.tsx (past) - Cancelled ride:", ride._id, "Accepted hitchers:", acceptedHitchers, "Hitcher statuses:", ride.hitchers?.map(h => h.status));
                              
                              return acceptedHitchers > 0 
                                ? <>
                                    Cancelled by You
                                    <div className="text-xs mt-1 text-center">
                                      {acceptedHitchers} {acceptedHitchers === 1 ? 'hitcher affected' : 'hitchers affected'}
                                    </div>
                                  </>
                                : "Cancelled by You";
                            })()
                          : ride.status.charAt(0).toUpperCase() +
                            ride.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2" />
                        {ride.direction === "toCollege"
                          ? formatTime(ride.toCollegeTime || "")
                          : formatTime(ride.fromCollegeTime || "")}
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
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No past rides
                  </h3>
                  <p className="text-gray-500">
                    Your ride history will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Request Modal */}
      {requestModal.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 py-8"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto relative">
            {/* Close button at top right */}
            <div className="bg-white z-10 flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Ride Requests
              </h2>
              <button 
                onClick={closeRequestModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            {(() => {
              // Get the current request and ride
              const requests = getRequestsForRide(requestModal.rideId);
              const ride = upcomingRides.find(r => r._id === requestModal.rideId);
              
              // Automatically close modal if there are no requests
              if (requests.length === 0) {
                // Use setTimeout to avoid state updates during render
                setTimeout(() => {
                  closeRequestModal();
                }, 0);
                
                return (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-700 mb-4">All requests have been processed</p>
                    <button
                      onClick={closeRequestModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                    >
                      Close
                    </button>
                  </div>
                );
              }
              
              if (!ride) {
                return (
                  <div className="text-center py-8">
                    <p className="text-lg text-gray-700 mb-4">Ride not found</p>
                    <button
                      onClick={closeRequestModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                    >
                      Close
                    </button>
                  </div>
                );
              }
              
              const currentRequest = requests[currentRequestIndex];
              
              return (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      {requests.length > 1 && (
                        <p className="text-sm text-gray-500 mb-1">
                          Request {currentRequestIndex + 1} of {requests.length}
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {ride.direction === "toCollege" ? "To College" : "From College"} · 
                      {format(new Date(ride.date), " EEE, MMM d")} · 
                      {ride.direction === "toCollege" 
                        ? formatTime(ride.toCollegeTime || "") 
                        : formatTime(ride.fromCollegeTime || "")}
                    </div>
                  </div>
                  
                  <div
                    key={currentRequest.hitcherId}
                    className="border border-gray-200 rounded-md p-4 mb-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Hitcher Request
                        </h3>
                        <h3 className="font-medium text-gray-900">
                          Fare: ₹{currentRequest.fare}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2">
                          Gender: {currentRequest.hitcherGender ? currentRequest.hitcherGender.charAt(0).toUpperCase() + currentRequest.hitcherGender.slice(1) : 'Not specified'}
                        </p>
                        {currentRequest.hitcherSRN && (
                          <p className="text-sm text-gray-600">
                            SRN: {currentRequest.hitcherSRN}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          Reliability: <span className={`font-medium ${
                            currentRequest.hitcherReliability > 80 ? 'text-green-600' : 
                            currentRequest.hitcherReliability > 60 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {currentRequest.hitcherReliability.toFixed(1)}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 italic mt-2">
                          Hitcher's name and phone number will be visible once you accept the ride request
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm mb-2">
                          Pending
                        </span>
                        <p className="text-xs text-gray-500">
                          Requested {format(new Date(currentRequest.requestTime), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-md text-red-700 mb-3">
                      Your Route after accepting this ride:
                    </p>
                    
                    {/* Google Maps external link for request view */}
                    <div className="mb-2">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentRequest.rideDirection === "fromCollege" ? currentRequest.from : currentRequest.from)}&destination=${encodeURIComponent(currentRequest.rideDirection === "fromCollege" ? currentRequest.to : currentRequest.to)}&waypoints=${
                          [
                            ...currentRequest.acceptedHitchersLocations,
                            currentRequest.rideDirection === "toCollege" ? currentRequest.pickupLocation : currentRequest.dropoffLocation
                          ]
                            .filter(Boolean)
                            .map(location => encodeURIComponent(location || ""))
                            .join("|")
                        }&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Open in Google Maps
                      </a>
                    </div>
                    
                    {/* Map Preview for Ride Request */}
                    <div className="mb-4">
                      <MapPreview
                        startLocation={currentRequest.rideDirection === "fromCollege" ? currentRequest.from : currentRequest.from}
                        endLocation={currentRequest.rideDirection === "fromCollege" ? currentRequest.to : currentRequest.to}
                        userLocation={[
                          ...currentRequest.acceptedHitchersLocations,
                          currentRequest.rideDirection === "toCollege" ? currentRequest.pickupLocation : currentRequest.dropoffLocation
                        ].filter(Boolean).join("|")}
                        direction={currentRequest.rideDirection}
                        isAcceptedLocation={(location) => currentRequest.acceptedHitchersLocations.includes(location)}
                        hitcherNames={[
                          // Names for accepted hitchers - we don't have these in the currentRequest
                          // so we'll just use the current hitcher's name for now
                          // This will be improved when we fetch the additional data
                          currentRequest.hitcherName
                        ]}
                        hitcherPhones={[
                          // Phones for accepted hitchers - same issue as with names
                          currentRequest.hitcherPhone
                        ]}
                        showHitcherDetails={false} // Hide hitcher details in the ride request view
                      />
                    </div>
                    
                    <div className="flex space-x-3 mt-4">
                      <LoadingButton
                        onClick={() => handleAcceptRequest(currentRequest.rideId, currentRequest.hitcherId)}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                        loadingText="Accepting Request..."
                      >
                        Accept Request
                      </LoadingButton>
                      <LoadingButton
                        onClick={() => handleRejectRequest(currentRequest.rideId, currentRequest.hitcherId)}
                        className="flex-1 bg-white text-gray-700 px-3 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        loadingText="Rejecting Request..."
                      >
                        Reject Request
                      </LoadingButton>
                    </div>
                  </div>
                  
                  {requests.length > 1 && (
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => handleRequestNavigation("prev")}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300 focus:outline-none"
                      >
                        Previous Request
                      </button>
                      
                      <button
                        onClick={() => handleRequestNavigation("next")}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300 focus:outline-none"
                      >
                        Next Request
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default DriverDashboard;
