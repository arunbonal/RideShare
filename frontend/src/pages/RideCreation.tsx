import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, MessageSquare, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
interface RideSchedule {
  driver: string;
  passengers?: Array<{
    user: string;
    status: "pending" | "accepted" | "rejected" | "cancelled";
    pickupLocation?: string;
    dropoffLocation?: string;
    fare?: number;
    rating?: number;
    review?: string;
  }>;
  note?: string;
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

const RideCreation: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, ride, setRide, resetRide } = useAuth();

  useEffect(() => {
    if (currentUser) {
      setRide((prev) => ({
        ...prev,
        driver: {
          _id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
        },
        from: currentUser.homeAddress || "",
        availableSeats: currentUser.driverProfile?.vehicle.seats || 4,
        pricePerKm: currentUser.driverProfile?.pricePerKm || 0,
      }));
    }
  }, [currentUser, setRide]);

  // Get min and max dates (today to 1 week from now)
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateString = maxDate.toISOString().split("T")[0];

  const convertTo24Hour = (time12: string): string => {
    const [time, period] = time12.split(" ");
    let [hours, minutes] = time.split(":");
    let hour = parseInt(hours);

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minutes}`;
  };

  const isTimeValid = (date: string, time12: string): boolean => {
    const now = new Date();
    const time24 = convertTo24Hour(time12);
    const [hours, minutes] = time24.split(":").map(Number);
    const scheduleDateTime = new Date(date);
    scheduleDateTime.setHours(hours, minutes, 0, 0);
    return scheduleDateTime > now;
  };

  const formatTimeForDisplay = (
    time24: string
  ): { time: string; period: "AM" | "PM" } => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return {
      time: `${hour12.toString().padStart(2, "0")}:${minutes}`,
      period,
    };
  };

  const handleCreateSchedule = async () => {
    if (!ride.date) {
      alert("Please select a date");
      return;
    }

    const selectedDate = new Date(ride.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate < todayDate) {
      alert("Cannot schedule rides for past dates");
      return;
    }

    if (selectedDate.getTime() === todayDate.getTime()) {
      const timeToCheck =
        ride.direction === "toCollege"
          ? ride.toCollegeTime
          : ride.fromCollegeTime;

      if (!isTimeValid(ride.date, timeToCheck!)) {
        alert(
          "Cannot schedule rides for past times. Please select a future time."
        );
        return;
      }
    }

    if (ride.pricePerKm === undefined) {
      alert("Please enter a price per kilometer");
      return;
    }

    try {
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
        note: ride.note || "",
        passengers: [],
        pricePerKm: Number(ride.pricePerKm),
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rides/create`,
        rideData,
        { withCredentials: true }
      );

      resetRide();
      navigate("/rides/manage");
    } catch (error: any) {
      console.error("Error creating ride:", error);
      // Show more specific error message
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to create ride. Please try again.";
      alert(errorMessage);
    }
  };

  // // MapPreview component remains the same
  // const MapPreview: React.FC<{ direction: RideSchedule["direction"] }> = ({
  //   direction,
  // }) => {
  //   // ... existing MapPreview code ...
  // };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="text-gray-600 hover:text-gray-800 mb-4"
        >
          ← Back to Dashboard
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
                Available Seats
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={ride.availableSeats}
                onChange={(e) =>
                  setRide({
                    ...ride,
                    availableSeats: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline-block w-4 h-4 mr-2" />
                Date
              </label>
              <input
                type="date"
                min={today}
                max={maxDateString}
                value={ride.date}
                onChange={(e) =>
                  setRide({
                    ...ride,
                    date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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
                        : "PES University Electronic City Campus",
                    to:
                      newDirection === "toCollege"
                        ? "PES University Electronic City Campus"
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
                Price Per Kilometer
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={ride.pricePerKm === undefined ? "" : ride.pricePerKm}
                  onChange={(e) =>
                    setRide({
                      ...ride,
                      pricePerKm:
                        e.target.value === ""
                          ? undefined
                          : parseFloat(e.target.value),
                    })
                  }
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`${currentUser?.driverProfile?.pricePerKm || 0}`}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Default price from your profile: ₹
                {currentUser?.driverProfile?.pricePerKm || 0}/km
                <br />
                {ride.pricePerKm !== undefined && ride.availableSeats > 0 && (
                  <>
                    At full capacity ({ride.availableSeats} seats), you'll earn
                    up to ₹{(ride.pricePerKm * ride.availableSeats).toFixed(0)}
                    /km
                  </>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageSquare className="inline-block w-4 h-4 mr-2" />
                Additional Notes (optional)
              </label>
              <textarea
                value={ride.note}
                onChange={(e) =>
                  setRide({
                    ...ride,
                    note: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Be there at the pickup point in time...
                "
              />
            </div>

            <button
              onClick={handleCreateSchedule}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Ride
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RideCreation;
