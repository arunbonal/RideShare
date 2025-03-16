import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Calendar, Clock, MapPin, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import { Ride } from "../contexts/AuthContext";
import axios from "axios";

interface Hitcher {
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  status: "pending" | "accepted" | "rejected" | "cancelled" | "cancelled-by-driver";
  pickupLocation?: string;
  dropoffLocation?: string;
  fare?: number;
  requestTime: Date;
}

// Extend the driver interface to include driverProfile
interface ExtendedRide extends Ride {
  driver: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    driverProfile?: {
      vehicle?: {
        model: string;
        color: string;
        registrationNumber: string;
        seats: number;
      };
    };
  };
}

const HitcherDashboard: React.FC = () => {
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [hitcherRides, setHitcherRides] = useState<ExtendedRide[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<ExtendedRide[]>([]);
  const [pastRides, setPastRides] = useState<ExtendedRide[]>([]);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  
  // Add modal state
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    rideId: string;
    hitcherId: string;
  }>({
    show: false,
    rideId: "",
    hitcherId: ""
  });

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
    if (currentUser?.hitcherProfileComplete) {
      fetchAllRides();
    }
  }, [currentUser, fetchAllRides]);

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

  // Filter rides for the current hitcher and separate into upcoming and past
  useEffect(() => {
    if (currentUser) {
      // Filter rides where the current user is a hitcher
      const currentHitcherRides = allRides.filter((ride) =>
        ride.hitchers?.some(
          (hitcher) => hitcher.user?._id === currentUser?.id
        )
      ) as ExtendedRide[];
      setHitcherRides(currentHitcherRides);

      const now = new Date();

      // Check for newly cancelled rides by driver
      // Get already notified ride IDs from localStorage
      const notifiedCancelledRides = JSON.parse(localStorage.getItem('notifiedCancelledRides') || '[]');
      
      const newlyCancelledRides = currentHitcherRides.filter(ride => {
        const hitcherInfo = ride.hitchers?.find(h => h.user?._id === currentUser?.id);
        return (hitcherInfo?.status as string) === "cancelled-by-driver" && 
               !notifiedCancelledRides.includes(ride._id);
      });

      // Show notification for newly cancelled rides
      if (newlyCancelledRides.length > 0) {
        setNotification({
          show: true,
          message: "Ride was cancelled by the driver",
          type: "error"
        });
        
        // Add these ride IDs to the notified list
        const updatedNotifiedRides = [
          ...notifiedCancelledRides,
          ...newlyCancelledRides.map(ride => ride._id)
        ];
        localStorage.setItem('notifiedCancelledRides', JSON.stringify(updatedNotifiedRides));
      }

      // Check for unread notifications
      const seenNotifications = JSON.parse(localStorage.getItem('seenHitcherNotifications') || '[]');
      
      // Check for unread notifications in all rides
      const unreadNotifications = currentHitcherRides
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
          'seenHitcherNotifications', 
          JSON.stringify([...seenNotifications, unreadNotifications[0]._id])
        );
        
        // Mark notification as read in the backend
        markNotificationAsRead(unreadNotifications[0].rideId, unreadNotifications[0]._id);
      }

      // Separate into upcoming and past rides
      const upcoming = currentHitcherRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          
          // Find the current user's hitcher info
          const hitcherInfo = ride.hitchers?.find(
            (h) => h.user?._id === currentUser?.id
          );
          
          // Exclude rides that are cancelled, rejected, or where the hitcher status is cancelled/cancelled-by-driver
          if (
            ride.status === "cancelled" || 
            hitcherInfo?.status === "cancelled" || 
            hitcherInfo?.status === "rejected" ||
            (hitcherInfo?.status as string) === "cancelled-by-driver"
          ) {
            return false;
          }
          
          return (
            rideDate > now ||
            (rideDate.toDateString() === now.toDateString() &&
              ride.status !== "completed")
          );
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      const past = currentHitcherRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          
          // Find the current user's hitcher info
          const hitcherInfo = ride.hitchers?.find(
            (h) => h.user?._id === currentUser?.id
          );
          
          return (
            rideDate < now ||
            ride.status === "completed" ||
            ride.status === "cancelled" ||
            hitcherInfo?.status === "cancelled" ||
            hitcherInfo?.status === "rejected" ||
            (hitcherInfo?.status as string) === "cancelled-by-driver"
          );
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setUpcomingRides(upcoming);
      setPastRides(past);
    }
  }, [allRides, currentUser]);

  const handleCancelClick = (rideId: string, hitcherId: string) => {
    setConfirmModal({
      show: true,
      rideId,
      hitcherId
    });
  };

  const handleConfirmCancel = async () => {
    const { rideId, hitcherId } = confirmModal;
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/cancel`,
        { 
          rideId,
          hitcherId 
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Refresh rides data
        await fetchAllRides();
        
        setNotification({
          show: true,
          message: "Ride cancelled successfully",
          type: "success"
        });
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      setNotification({
        show: true,
        message: "Failed to cancel ride. Please try again.",
        type: "error"
      });
    } finally {
      // Close the modal
      setConfirmModal({ show: false, rideId: "", hitcherId: "" });
    }
  };

  // Add formatTime function
  const formatTime = (time24: string | undefined) => {
    if (!time24) return "";
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
        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cancel Ride
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel this ride? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmModal({ show: false, rideId: "", hitcherId: "" })}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  No, Keep Ride
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Yes, Cancel Ride
                </button>
              </div>
            </div>
          </div>
        )}

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
              Hitcher Dashboard
            </h1>
            <p className="text-gray-600">
              View your ride requests and bookings
            </p>
          </div>
        </div>

        {hitcherRides.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No rides found
            </h3>
            <p className="text-gray-500 mb-4">
              You haven't requested or booked any rides yet.
            </p>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => navigate("/rides/search")}
                className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="h-5 w-5 mr-1" />
                Find Rides
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
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
            <div className="space-y-4">
              {activeTab === "upcoming" && upcomingRides.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No upcoming rides
                  </h3>
                  <p className="text-gray-500 mb-4">
                    You haven't requested or booked any upcoming rides yet.
                  </p>
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={() => navigate("/rides/search")}
                      className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Plus className="h-5 w-5 mr-1" />
                      Find Rides
                    </button>
                  </div>
                </div>
              ) : (
                (activeTab === "upcoming" ? upcomingRides : pastRides).map(
                  (ride) => {
                    const hitcherInfo = ride.hitchers?.find(
                      (h) => h.user?._id === currentUser?.id
                    );
                    if (!hitcherInfo) return null;

                    return (
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
                              hitcherInfo.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : hitcherInfo.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {(hitcherInfo.status as string) === "cancelled-by-driver" 
                              ? "Cancelled by Driver" 
                              : hitcherInfo.status === "cancelled"
                              ? "Cancelled by You"
                              : hitcherInfo.status === "rejected"
                              ? "Rejected by Driver"
                              : hitcherInfo.status.charAt(0).toUpperCase() +
                                hitcherInfo.status.slice(1)}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center text-gray-600">
                            <Clock className="h-5 w-5 mr-2" />
                            {ride.direction === "toCollege"
                              ? formatTime(ride.toCollegeTime)
                              : formatTime(ride.fromCollegeTime)}
                          </div>
                          {activeTab === "past" ? (
                            <>
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-5 w-5 mr-2" />
                                Your Address: {hitcherInfo.pickupLocation || hitcherInfo.dropoffLocation || "Not specified"}
                              </div>
                              {ride.direction === "toCollege" && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-5 w-5 mr-2" />
                                  To: {ride.to}
                                </div>
                              )}
                              {ride.direction === "fromCollege" && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-5 w-5 mr-2" />
                                  From: {ride.from}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {ride.direction === "fromCollege" && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-5 w-5 mr-2" />
                                  From: {ride.from}
                                </div>
                              )}
                              {ride.direction === "toCollege" && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="h-5 w-5 mr-2" />
                                  To: {ride.to}
                                </div>
                              )}
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-5 w-5 mr-2" />
                                {ride.direction === "toCollege" 
                                  ? `Your Pickup Point: ${hitcherInfo.pickupLocation || "Not specified"}`
                                  : `Your Drop-off Point: ${hitcherInfo.dropoffLocation || "Not specified"}`}
                              </div>
                            </>
                          )}
                        </div>
                        {ride.note && (
                          <p className="mt-4 text-sm text-gray-500 italic">
                            Note: {ride.note}
                          </p>
                        )}
                        <br />
                        
                        {/* Driver Details Section - Only show when ride is accepted */}
                        {hitcherInfo.status === 'accepted' && (
                          <div className="mt-2 mb-4 bg-blue-50 p-3 rounded-md">
                            <h4 className="font-medium text-gray-900 mb-2">Driver Details:</h4>
                            <div className="space-y-2">
                              <p className="text-sm">
                                <span className="font-medium">Name:</span> {ride.driver.name}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Phone:</span> {ride.driver.phone}
                              </p>
                              {ride.driver.driverProfile?.vehicle && (
                                <p className="text-sm">
                                  <span className="font-medium">Vehicle Registration:</span> {ride.driver.driverProfile.vehicle.registrationNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {hitcherInfo.status === 'accepted' && (
                          <button
                            onClick={() => handleCancelClick(ride._id, hitcherInfo.user._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Cancel Ride
                          </button>
                        )}
                        
                        {hitcherInfo.status === 'pending' && (
                          <button
                            onClick={() => handleCancelClick(ride._id, hitcherInfo.user._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HitcherDashboard;
