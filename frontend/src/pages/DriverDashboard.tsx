import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Car, Plus, Calendar, Clock, Users, MapPin, List, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { Ride } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import MapPreview from "../components/MapPreview";
import { format } from "date-fns";
import axios from "axios";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  srn: string;
  hitcherProfile?: {
    rating: number;
  };
}

// Define the User interface for hitchers
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  srn?: string;
  hitcherProfile?: {
    rating: number;
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
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  
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
            .map(n => ({ 
              _id: n._id,
              message: n.message,
              rideId: ride._id
            }))
        );
      
      // Show the first unread notification if any
      if (unreadNotifications.length > 0) {
        setNotification({
          show: true,
          message: unreadNotifications[0].message,
          type: "error"
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
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/notifications/read`,
        {
          rideId,
          notificationId
        },
        { withCredentials: true }
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

      const now = new Date();

      // Separate into upcoming and past rides
      const upcoming = currentDriverRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          // First check if the ride is not cancelled
          if (ride.status === "cancelled") {
            return false;
          }
          // Then check the date and status
          return (
            rideDate > now ||
            (rideDate.toDateString() === now.toDateString() &&
              ride.status === "scheduled")
          );
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      const past = currentDriverRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          return (
            ride.status === "cancelled" ||  // Show cancelled rides in past
            rideDate < now ||
            ride.status === "completed"
          );
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setUpcomingRides(upcoming);
      setPastRides(past);
    }
  }, [allRides, currentUser]);

  const handleAcceptRequest = async (rideId: string, hitcherId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/accept`,
        {
          rideId,
          hitcherId
        },
        { withCredentials: true }
      );
      // Fetch fresh data to update the UI
      await fetchAllRides();
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (rideId: string, hitcherId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/reject`,
        {
          rideId,
          hitcherId
        },
        { withCredentials: true }
      );
      // Fetch fresh data to update the UI
      await fetchAllRides();
    } catch (error) {
      console.error("Error rejecting request:", error);
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
        hitcherGender: hitcher.user.gender || "Not specified",
        hitcherSRN: hitcher.user.srn ? `${hitcher.user.srn.slice(0, -3)}XXX` : undefined,
        hitcherRating: hitcher.user.hitcherProfile?.rating || 0,
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
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Driver Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your rides and hitcher requests
            </p>
          </div>
          <div className="mt-4 md:mt-0 space-x-4">
            <Link
              to="/rides/manage"
              className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <List className="h-5 w-5 mr-1" />
              Manage Rides
            </Link>
            <Link
              to="/rides/create"
              className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-5 w-5 mr-1" />
              Create New Ride
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
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
                        <div className="flex gap-2">
                          {/* Ride status */}
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
                              ? "Cancelled by You"
                              : ride.status.charAt(0).toUpperCase() +
                                ride.status.slice(1)}
                          </span>
                          <br />
                          {ride.totalFare > 0 && (
                            <span className="px-2 py-1 text-sm font-medium bg-green-50 text-green-700 rounded-full">
                              You'll receive ₹{ride.totalFare.toFixed(2)} in Total
                            </span>
                          )}
                        </div>
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
                        <div className="flex items-center text-gray-600">
                          <Users className="h-5 w-5 mr-2" />
                          <span>Available Seats: {ride.availableSeats}</span>
                          {(() => {
                            const acceptedCount =
                              ride.hitchers?.filter(
                                (h) => h.status === "accepted"
                              ).length || 0;
                            return (
                              acceptedCount > 0 && (
                                <span className="ml-4 bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                                  {acceptedCount} Accepted
                                </span>
                              )
                            );
                          })()}
                        </div>
                      </div>
                      {ride.note && (
                        <p className="mt-4 text-sm text-gray-500 italic">
                          Note: {ride.note}
                        </p>
                      )}
                      
                      {/* Accepted Hitchers Section */}
                      {ride.hitchers && ride.hitchers.filter(h => h.status === "accepted").length > 0 && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Accepted Hitchers:</h4>
                          <div className="space-y-3">
                            {ride.hitchers
                              .filter(h => h.status === "accepted")
                              .map((hitcher, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md">
                                  <div className="flex justify-between">
                                    <div>
                                      <p className="font-medium">{hitcher.user.name}</p>
                                      <p className="text-sm text-gray-600">{hitcher.user.phone.replace(/^(\+91)(\d+)$/, '$1 $2')}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">
                                        {ride.direction === "toCollege" 
                                          ? `Pickup: ${hitcher.pickupLocation}` 
                                          : `Dropoff: ${hitcher.dropoffLocation}`}
                                      </p>
                                      <p className="text-sm font-medium text-green-600">₹{hitcher.fare}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="mt-4 text-md text-red-700">
                          Your Current Route :
                        </p>
                      {/* Map Preview for Current Route */}
                      <div className="mt-4">
                        <MapPreview
                          startLocation={ride.direction === "fromCollege" ? ride.from : ride.from}
                          endLocation={ride.direction === "fromCollege" ? ride.to : ride.to}
                          userLocation={ride.hitchers
                            ?.filter(h => h.status === "accepted")
                            .map(h => ride.direction === "toCollege" ? h.pickupLocation : h.dropoffLocation)
                            .filter(Boolean)
                            .join("|")}
                          className="rounded-lg shadow-sm"
                          direction={ride.direction}
                        />
                      </div>
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
                          ? "Cancelled by You"
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

          {/* Sidebar */}
          <div>
            {/* Ride requests - only show for upcoming rides */}
            {activeTab === "upcoming" && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Ride Requests ({pendingRequests.length})
                </h2>

                {pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.hitcherId}
                        className="border border-gray-200 rounded-md p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              Hitcher Request
                            </h3>
                            <h3 className="font-medium text-gray-900">
                            Fare : ₹ {request.fare}
                            <br />
                            </h3>
                            <p className="text-sm text-gray-600">
                              Gender: {request.hitcherGender ? request.hitcherGender.charAt(0).toUpperCase() + request.hitcherGender.slice(1) : 'Not specified'}
                            </p>
                            {request.hitcherSRN && (
                              <p className="text-sm text-gray-600">
                                SRN: {request.hitcherSRN}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              Rating: {request.hitcherRating.toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500 italic mt-2">
                              Hitcher's name and phone number will be visible once you accept the ride request
                            </p>
                          </div>
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                            Pending
                          </span>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-start">
                            <Clock className="h-4 w-4 text-gray-500 mr-1 mt-0.5" />
                            <p className="text-sm text-gray-600">
                              Requested{" "}
                              {format(
                                new Date(request.requestTime),
                                "MMM d, h:mm a"
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="text-md text-red-700 mb-3">
                          Your Route after accepting this ride :      
                        </p>
                        {/* Map Preview for Ride Requests */}
                        <div className="mb-4">
                          <MapPreview
                            startLocation={request.rideDirection === "fromCollege" ? request.from : request.from}
                            endLocation={request.rideDirection === "fromCollege" ? request.to : request.to}
                            userLocation={[
                              ...request.acceptedHitchersLocations,
                              request.rideDirection === "toCollege" ? request.pickupLocation : request.dropoffLocation
                            ].filter(Boolean).join("|")}
                            direction={request.rideDirection}
                            isAcceptedLocation={(location) => request.acceptedHitchersLocations.includes(location)}
                          />
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleAcceptRequest(
                                request.rideId,
                                request.hitcherId
                              )
                            }
                            className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              handleRejectRequest(
                                request.rideId,
                                request.hitcherId
                              )
                            }
                            className="flex-1 bg-white text-gray-700 px-3 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No pending ride requests
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverDashboard;
