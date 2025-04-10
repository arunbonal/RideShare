import React from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Users, CreditCard, Star } from "lucide-react";
import { format } from "date-fns";

interface RideCardProps {
  ride: {
    id: string;
    driverId: string;
    driverName: string;
    driverReliability: number;
    direction: "toCollege" | "fromCollege";
    departureTime: string;
    departureLocation: string;
    destinationLocation: string;
    availableSeats: number;
    pricePerKm: number;
    vehicleModel: string;
  };
  onRequestRide?: (rideId: string) => void;
  showRequestButton?: boolean;
}

const RideCard: React.FC<RideCardProps> = ({
  ride,
  onRequestRide,
  showRequestButton = false,
}) => {
  const formattedTime = format(new Date(ride.departureTime), "h:mm a");
  const formattedDate = format(new Date(ride.departureTime), "EEE, MMM d");

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold">
              {ride.direction === "toCollege" ? "To College" : "From College"}
            </h3>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>
                {formattedTime} · {formattedDate}
              </span>
            </div>
          </div>
          <div className="flex items-center bg-blue-50 px-2 py-1 rounded text-blue-700">
            <Star className="h-4 w-4 mr-1 text-yellow-500" />
            <span>{ride.driverReliability}%</span>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium">From</p>
              <p className="text-sm text-gray-600">{ride.departureLocation}</p>
            </div>
          </div>
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium">To</p>
              <p className="text-sm text-gray-600">
                {ride.destinationLocation}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center text-gray-700">
            <Users className="h-5 w-5 mr-1" />
            <span>{ride.availableSeats} seats available</span>
          </div>
          <div className="flex items-center text-gray-700">
            <CreditCard className="h-5 w-5 mr-1" />
            <span>₹{ride.pricePerKm} per seat</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{ride.driverName}</p>
              <p className="text-xs text-gray-500">
                {ride.vehicleModel}
              </p>
            </div>
            {showRequestButton ? (
              <button
                onClick={() => onRequestRide && onRequestRide(ride.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Request Ride
              </button>
            ) : (
              <Link
                to={`/rides/${ride.id}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Details
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideCard;
