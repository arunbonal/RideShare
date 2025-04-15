import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Ride } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { Plus, ArrowLeft, Edit } from "lucide-react";
import api from "../utils/api"; // Import API utility
import LoadingButton from "../components/LoadingButton"; // Import LoadingButton

const RideManagement: React.FC = () => {
  const { currentUser, allRides, setAllRides, fetchAllRides, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<{
    index: number;
    id: string;
  } | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [reliabilityImpact, setReliabilityImpact] = useState<{
    currentRate: number | null;
    newRate: number | null;
  }>({ currentRate: null, newRate: null });
  const [loading, setLoading] = useState(false);

  // Fetch all rides when component mounts
  useEffect(() => {
    if (currentUser?.driverProfileComplete) {
      fetchAllRides();
    }
  }, [currentUser, fetchAllRides]);

  // Filter rides for current driver whenever allRides changes
  useEffect(() => {
    if (currentUser) {
      const driverRides = allRides.filter(
        (ride) => ride.driver._id === currentUser.id
      );
      
      // Split rides into upcoming and past
      const now = new Date();
      const upcomingRides = driverRides.filter(ride => {
        // Create a datetime by combining the date with the appropriate time
        const rideDate = new Date(ride.date);
        const timeString = ride.direction === "toCollege" 
          ? ride.toCollegeTime 
          : ride.fromCollegeTime;
        
        if (timeString) {
          const [hours, minutes] = timeString.split(":").map(Number);
          rideDate.setHours(hours, minutes, 0, 0);
        }
        
        // Consider scheduled and in-progress rides as upcoming
        return (rideDate >= now || ride.status === "in-progress") && 
               ride.status !== "cancelled" && 
               ride.status !== "completed";
      }).sort((a, b) => {
        // Sort upcoming rides by date and time (earliest first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Add time component
        const timeA = a.direction === "toCollege" ? a.toCollegeTime : a.fromCollegeTime;
        const timeB = b.direction === "toCollege" ? b.toCollegeTime : b.fromCollegeTime;
        
        if (timeA) {
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          dateA.setHours(hoursA, minutesA, 0, 0);
        }
        
        if (timeB) {
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          dateB.setHours(hoursB, minutesB, 0, 0);
        }
        
        // Earliest first for upcoming rides
        return dateA.getTime() - dateB.getTime();
      });
      
      const pastRides = driverRides.filter(ride => {
        // Create a datetime by combining the date with the appropriate time
        const rideDate = new Date(ride.date);
        const timeString = ride.direction === "toCollege" 
          ? ride.toCollegeTime 
          : ride.fromCollegeTime;
        
        if (timeString) {
          const [hours, minutes] = timeString.split(":").map(Number);
          rideDate.setHours(hours, minutes, 0, 0);
        }
        
        // Consider cancelled and completed rides as past, or rides with date in the past
        return ride.status === "cancelled" || 
               ride.status === "completed" || 
               rideDate < now;
      }).sort((a, b) => {
        // Sort past rides by date and time (most recent first)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Add time component
        const timeA = a.direction === "toCollege" ? a.toCollegeTime : a.fromCollegeTime;
        const timeB = b.direction === "toCollege" ? b.toCollegeTime : b.fromCollegeTime;
        
        if (timeA) {
          const [hoursA, minutesA] = timeA.split(':').map(Number);
          dateA.setHours(hoursA, minutesA, 0, 0);
        }
        
        if (timeB) {
          const [hoursB, minutesB] = timeB.split(':').map(Number);
          dateB.setHours(hoursB, minutesB, 0, 0);
        }
        
        // Most recent first for past rides
        return dateB.getTime() - dateA.getTime();
      });
      
      // Combine sorted rides: upcoming (earliest first) followed by past (most recent first)
      const sortedRides = [...upcomingRides, ...pastRides];
      
      setRides(sortedRides);
    }
  }, [allRides, currentUser]);

  // Redirect to driver setup if profile is not complete
  if (!currentUser?.driverProfileComplete) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Complete your driver profile to manage rides.
              </p>
              <button
                onClick={() => navigate("/driver/setup")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Complete Driver Profile
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  const handleCancelClick = async (index: number, rideId: string) => {
    try {
      // Get the ride to check if any hitchers are accepted
      const ride = rides[index];
      const hasAcceptedHitchers = ride.hitchers?.some(h => h.status === "accepted");
      
      if (hasAcceptedHitchers) {
        // Calculate reliability impact for rides with accepted hitchers
        const response = await api.post(
          "/api/rides/calculate-reliability-impact",
          { 
            userId: currentUser?.id,
            userType: 'driver',
            actionType: 'CANCEL_ACCEPTED_RIDE'
          }
        );
        
        setReliabilityImpact({
          currentRate: response.data.currentRate,
          newRate: response.data.newRate
        });
      } else {
        // No penalty for rides with no accepted hitchers
        setReliabilityImpact({
          currentRate: currentUser?.driverProfile?.reliabilityRate || 100,
          newRate: currentUser?.driverProfile?.reliabilityRate || 100
        });
      }
      
      // Show the modal
      setRideToCancel({ index, id: rideId });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error calculating reliability impact:', error);
      // Show modal anyway
      setRideToCancel({ index, id: rideId });
      setShowConfirmModal(true);
    }
  };

  const handleCancelRide = async () => {
    if (!rideToCancel) return;

    try {
      setLoading(true);
      const response = await api.post(
        "/api/rides/cancel",
        { rideId: rideToCancel.id, userId: currentUser?.id, userType: 'driver' }
      );

      // Update local user data with the new reliability rate
      if (response.data.user) {
        await refreshUserData(); // Make sure to add refreshUserData to the destructured useAuth()
      }

      // Fetch fresh data to update all components
      await fetchAllRides();

      setNotification({
        show: true,
        message: "Ride cancelled successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Error canceling ride:", error);
      setNotification({
        show: true,
        message: "Failed to cancel ride. Please try again.",
        type: "error",
      });
    } finally {
      setShowConfirmModal(false);
      setRideToCancel(null);
      setReliabilityImpact({ currentRate: null, newRate: null });
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 3000);
      setLoading(false);
    }
  };

  const canEditRide = (ride: Ride): boolean => {
    // A ride can be edited if it's scheduled and has no pending or accepted hitchers
    if (ride.status !== "scheduled") return false;
    
    return !(ride.hitchers?.some(h => h.status === "pending" || h.status === "accepted"));
  };

  const handleEditRide = (rideId: string) => {
    navigate(`/rides/edit/${rideId}`);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300 z-50`}
          >
            {notification.message}
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 w-full">
              <h3 className="text-lg font-semibold mb-4">Cancel Ride</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel this ride? This action cannot be
                undone.
              </p>

              {/* Add reliability impact information */}
              {reliabilityImpact.currentRate !== reliabilityImpact.newRate && (
                <div className="mb-6 p-3 bg-yellow-50 rounded-md">
                  <p className="font-medium text-gray-900 mb-2">Reliability Impact:</p>
                  <div className="flex justify-between items-center">
                    <span>Current Reliability:</span>
                    <span className={`font-medium ${
                      reliabilityImpact.currentRate && reliabilityImpact.currentRate >= 85 ? 'text-green-600' : 
                      reliabilityImpact.currentRate && reliabilityImpact.currentRate >= 70 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {reliabilityImpact.currentRate?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>After Cancellation:</span>
                    <span className={`font-medium ${
                      reliabilityImpact.newRate && reliabilityImpact.newRate >= 85 ? 'text-green-600' : 
                      reliabilityImpact.newRate && reliabilityImpact.newRate >= 70 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {reliabilityImpact.newRate?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setRideToCancel(null);
                    setReliabilityImpact({ currentRate: null, newRate: null });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Keep Ride
                </button>
                <LoadingButton
                  onClick={handleCancelRide}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={loading}
                  loadingText="Cancelling..."
                >
                  Yes, Cancel Ride
                </LoadingButton>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/driver/dashboard")}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold">Manage Your Posted Rides</h1>
            {rides.length > 0 && (
              <button
                onClick={() => navigate("/rides/create")}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Ride
              </button>
            )}
          </div>

          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 w-full">
            {rides.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  You haven't posted any rides yet
                </p>
                <button
                  onClick={() => navigate("/rides/create")}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Ride
                </button>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {rides.map((ride, index) => (
                  <div
                    key={ride._id}
                    className="border border-gray-200 rounded-md p-4 w-full"
                  >
                    {/* Mobile layout (stacked) */}
                    <div className="block sm:hidden">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium text-blue-600">
                          {formatDate(ride.date)}
                        </p>
                        <span
                          className={`capitalize font-medium px-2 py-1 rounded-full text-xs ${
                            ride.status === "scheduled" 
                              ? "bg-green-100 text-green-800" 
                              : ride.status === "in-progress" 
                              ? "bg-blue-100 text-blue-800" 
                              : ride.status === "completed" 
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {ride.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {ride.direction === "toCollege" ? (
                          <>
                            To College ({currentUser?.college}) :{" "}
                            {formatTime(ride.toCollegeTime || "")}
                          </>
                        ) : (
                          <>
                            From College ({currentUser?.college}) :{" "}
                            {formatTime(ride.fromCollegeTime || "")}
                          </>
                        )}
                      </p>
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-gray-600">Available Seats: <span className="font-semibold">{ride.availableSeats}</span></span>
                        {(ride.hitchers?.filter(
                          (h) => h.status === "accepted"
                        ).length || 0) > 0 && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                            {
                              ride.hitchers?.filter(
                                (h) => h.status === "accepted"
                              ).length
                            }{" "}
                            Accepted
                          </span>
                        )}
                      </div>
                      
                      {ride.status === "scheduled" && (
                        <div className="flex justify-center w-full space-x-2">
                          {canEditRide(ride) && (
                            <button
                              onClick={() => handleEditRide(ride._id)}
                              className="flex-1 px-4 py-2 bg-blue-50 border border-blue-300 text-blue-700 text-sm rounded-md hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                          )}
                          <LoadingButton
                            onClick={() => handleCancelClick(index, ride._id)}
                            className={`${canEditRide(ride) ? 'flex-1' : 'w-full'} px-4 py-2 bg-red-50 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2`}
                            loadingText="..."
                          >
                            Cancel Ride
                          </LoadingButton>
                        </div>
                      )}
                    </div>
                    
                    {/* Desktop layout */}
                    <div className="hidden sm:block">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-blue-600">
                            {formatDate(ride.date)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {ride.direction === "toCollege" ? (
                              <>
                                To College ({currentUser?.college}) :{" "}
                                {formatTime(ride.toCollegeTime || "")}
                              </>
                            ) : (
                              <>
                                From College ({currentUser?.college}) :{" "}
                                {formatTime(ride.fromCollegeTime || "")}
                              </>
                            )}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center mt-2">
                            <span>
                              Available Seats: <span className="font-semibold">{ride.availableSeats}</span>
                            </span>
                            {(ride.hitchers?.filter(
                              (h) => h.status === "accepted"
                            ).length || 0) > 0 && (
                              <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                                {
                                  ride.hitchers?.filter(
                                    (h) => h.status === "accepted"
                                  ).length
                                }{" "}
                                Accepted
                              </span>
                            )}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end justify-between">
                          <span
                            className={`capitalize font-medium px-2 py-1 rounded-full text-xs ${
                              ride.status === "scheduled" 
                                ? "bg-green-100 text-green-800" 
                                : ride.status === "in-progress" 
                                ? "bg-blue-100 text-blue-800" 
                                : ride.status === "completed" 
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {ride.status}
                          </span>
                          
                          {ride.status === "scheduled" && (
                            <div className="mt-auto flex space-x-2">
                              {canEditRide(ride) && (
                                <button
                                  onClick={() => handleEditRide(ride._id)}
                                  className="px-4 py-1 bg-blue-50 border border-blue-300 text-blue-700 text-sm rounded-md hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                              )}
                              <LoadingButton
                                onClick={() => handleCancelClick(index, ride._id)}
                                className="px-4 py-1 bg-red-50 border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                loadingText="..."
                              >
                                Cancel Ride
                              </LoadingButton>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RideManagement;
