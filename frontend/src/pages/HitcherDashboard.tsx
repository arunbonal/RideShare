import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Plus, Calendar, Clock, MapPin, X } from "lucide-react";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import { Ride } from "../contexts/AuthContext";

interface Hitcher {
  user: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  status: "pending" | "accepted" | "rejected" | "cancelled";
  pickupLocation?: string;
  dropoffLocation?: string;
  fare?: number;
  requestTime: Date;
}

const HitcherDashboard: React.FC = () => {
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [hitcherRides, setHitcherRides] = useState<Ride[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<Ride[]>([]);
  const [pastRides, setPastRides] = useState<Ride[]>([]);
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
    if (currentUser?.hitcherProfileComplete) {
      fetchAllRides();
    }
  }, [currentUser, fetchAllRides]);

  // Filter rides for the current hitcher and separate into upcoming and past
  useEffect(() => {
    if (currentUser) {
      // Filter rides where the current user is a hitcher
      const currentHitcherRides = allRides.filter((ride) =>
        ride.hitchers?.some(
          (hitcher: Hitcher) => hitcher.user?._id === currentUser?.id
        )
      );
      setHitcherRides(currentHitcherRides);

      const now = new Date();

      // Separate into upcoming and past rides
      const upcoming = currentHitcherRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          return (
            rideDate > now ||
            (rideDate.toDateString() === now.toDateString() &&
              ride.status !== "completed" &&
              ride.status !== "cancelled")
          );
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      const past = currentHitcherRides
        .filter((ride) => {
          const rideDate = new Date(ride.date);
          return (
            rideDate < now ||
            ride.status === "completed" ||
            ride.status === "cancelled"
          );
        })
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setUpcomingRides(upcoming);
      setPastRides(past);
    }
  }, [allRides, currentUser]);

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
              {(activeTab === "upcoming" ? upcomingRides : pastRides).map(
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
                          {hitcherInfo.status.charAt(0).toUpperCase() +
                            hitcherInfo.status.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-5 w-5 mr-2" />
                          {ride.direction === "toCollege"
                            ? ride.toCollegeTime
                            : ride.fromCollegeTime}
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
                  );
                }
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HitcherDashboard;
