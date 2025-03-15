import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface MapPreviewProps {
  startLocation: string;
  endLocation: string;
  userLocation?: string; // Optional user's home address or multiple addresses separated by |
  className?: string;
  direction?: "toCollege" | "fromCollege"; // Add direction prop
  onRouteCalculated?: (route: google.maps.DirectionsResult) => void;
  isAcceptedLocation?: (location: string) => boolean; // New prop to check if a location is already accepted
}

const MapPreview: React.FC<MapPreviewProps> = ({
  startLocation,
  endLocation,
  userLocation,
  direction,
  className = "",
  onRouteCalculated,
  isAcceptedLocation = () => false, // Default to false if not provided
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const newMap = new google.maps.Map(mapRef.current, {
      zoom: 6,
      center: { lat: 41.85, lng: -87.65 },
      mapTypeControl: false,
      streetViewControl: false,
    });

    const renderer = new google.maps.DirectionsRenderer();
    renderer.setMap(newMap);

    setMap(newMap);
    setDirectionsRenderer(renderer);
  }, []);

  useEffect(() => {
    if (!map || !directionsRenderer || !startLocation || !endLocation) return;

    const directionsService = new google.maps.DirectionsService();

    const calculateAndDisplayRoute = () => {
      // Split userLocation into multiple waypoints if it contains |
      const waypts: google.maps.DirectionsWaypoint[] = userLocation
        ? userLocation.split("|").map(location => ({
            location,
            stopover: true
          }))
        : [];

      directionsService
        .route({
          origin: startLocation,
          destination: endLocation,
          waypoints: waypts,
          optimizeWaypoints: true,
          travelMode: google.maps.TravelMode.DRIVING,
        })
        .then((response) => {
          directionsRenderer.setDirections(response);
          map.fitBounds(response.routes[0].bounds);
          onRouteCalculated?.(response);
        })
        .catch((e) =>
          window.alert("Directions request failed due to " + e.message)
        );
    };

    calculateAndDisplayRoute();
  }, [map, directionsRenderer, startLocation, endLocation, userLocation]);

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {/* Google Map */}
      <div ref={mapRef} className="h-48 w-full" />

      {/* Location details panel */}
      <div className="p-3 bg-white">
        <div className="flex items-start mb-2">
          <MapPin className="h-4 w-4 text-red-500 mr-1 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium">From</p>
            <p className="text-sm text-gray-700">{startLocation}</p>
          </div>
        </div>

        {userLocation && userLocation.split("|").map((location, index) => (
  <div key={index} className="flex items-start mb-2">
    <MapPin className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
    <div className="flex-grow">
      <div className="flex items-center">
        <p className="text-xs font-medium">
          {direction === "fromCollege" ? "Drop Point" : "Pickup Point"} {userLocation.split("|").length > 1 ? `#${index + 1}` : ""}
        </p>
        {isAcceptedLocation(location) && (
          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
            Accepted
          </span>
        )}
      </div>
      <p className="text-sm text-gray-700">{location}</p>
    </div>
  </div>
))}


        <div className="flex items-start mb-2">
          <MapPin className="h-4 w-4 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium">To</p>
            <p className="text-sm text-gray-700">{endLocation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPreview;
