import React, { useEffect, useRef, useState } from "react";
import { UserCircle } from "lucide-react";

interface MapPreviewProps {
  startLocation: string;
  endLocation: string;
  userLocation?: string; // Optional user's home address or multiple addresses separated by |
  className?: string;
  direction?: "toCollege" | "fromCollege"; // Add direction prop
  onRouteCalculated?: (route: google.maps.DirectionsResult) => void;
  isAcceptedLocation?: (location: string) => boolean; // New prop to check if a location is already accepted
  hitcherNames?: string[]; // Array of hitcher names matching the locations
  hitcherPhones?: string[]; // Array of hitcher phone numbers matching the locations
  hitcherFares?: number[]; // Array of fares for each hitcher
  showHitcherDetails?: boolean; // Whether to show hitcher details (name/phone) on hover
  showAddressLabels?: boolean; // Whether to show clarifying labels for addresses (for RideSearch)
}

const MapPreview: React.FC<MapPreviewProps> = ({
  startLocation,
  endLocation,
  userLocation,
  direction,
  className = "",
  onRouteCalculated,
  isAcceptedLocation = () => false, // Default to false if not provided
  hitcherNames = [],
  hitcherPhones = [],
  hitcherFares = [],
  showHitcherDetails = true, // Default to true to maintain backwards compatibility
  showAddressLabels = false, // Default to false to maintain backwards compatibility
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

  // Parse user locations
  const userLocations = userLocation ? userLocation.split("|") : [];

  // Get first name only for display
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {/* Google Map */}
      <div ref={mapRef} className="h-48 w-full" />

      {/* Location details panel - increased padding and margin to prevent overlay */}
      <div className="p-4 bg-white border-t border-gray-100 mb-8">
        <div className="space-y-4">
          {/* Start Location */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                Start
                {showAddressLabels && direction === "toCollege" && (
                  <span className="ml-1 text-xs text-gray-500">(Driver's address)</span>
                )}
              </p>
              <p className="text-sm text-gray-500 break-words">
                {startLocation}
              </p>
            </div>
          </div>
          
          

          {/* User location(s) */}
          {userLocations.map((location, index) => (
            <React.Fragment key={index}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {direction === "toCollege" ? "Pickup Point" : "Dropoff Point"} {userLocations.length > 1 ? `#${index + 1}` : ""}
                      {showAddressLabels && (
                        (direction === "toCollege" || direction === "fromCollege") ? (
                          <span className="ml-1 text-xs text-gray-500">(Your address)</span>
                        ) : null
                      )}
                    </p>
                    {isAcceptedLocation(location) && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
                        Accepted
                      </span>
                    )}
                    
                    {/* Profile icon with user details on hover - only show if showHitcherDetails is true */}
                    {showHitcherDetails && hitcherNames && hitcherNames.length > index && hitcherNames[index] && (
                      <div className="relative group">
                        <UserCircle className="h-4 w-4 text-blue-500 cursor-pointer" />
                        
                        {/* Hover tooltip - positioned on the left to stay within container */}
                        <div className="absolute z-10 left-0 mt-2 w-48 p-2 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{getFirstName(hitcherNames[index])}</p>
                          {hitcherPhones && hitcherPhones.length > index && (
                            <p className="text-sm text-gray-600">{hitcherPhones[index].substring(3)}</p>
                          )}
                          {hitcherFares && hitcherFares.length > index && (
                            <p className="text-sm font-medium text-green-600">₹{hitcherFares[index]}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 break-words">
                    {location}
                  </p>
                </div>
              </div>
              
              
            </React.Fragment>
          ))}

          

          {/* End Location */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                Destination
                {showAddressLabels && direction === "fromCollege" && (
                  <span className="ml-1 text-xs text-gray-500">(Driver's address)</span>
                )}
              </p>
              <p className="text-sm text-gray-500 break-words">
                {endLocation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPreview;
