import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { UserCircle, X } from "lucide-react";

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
  const [selectedHitcherIndex, setSelectedHitcherIndex] = useState<number | null>(null);

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

  // Function to close the profile modal
  const closeProfileModal = () => {
    setSelectedHitcherIndex(null);
  };

  // Add click handler for the profile button
  const handleProfileButtonClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedHitcherIndex(index);
  };

  // Add an effect to handle clicks outside the modal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Only run this if the modal is open
      if (selectedHitcherIndex !== null) {
        // Check if the click was outside the modal content
        const modal = document.querySelector('.profile-modal-content');
        if (modal && !modal.contains(e.target as Node)) {
          setSelectedHitcherIndex(null);
        }
      }
    };

    // Add the click event listener to the document
    document.addEventListener('mousedown', handleOutsideClick);

    // Clean up the event listener when component unmounts or dependencies change
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedHitcherIndex]); // Only re-run if selectedHitcherIndex changes

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
                    
                    {/* Profile button - smaller and click-based */}
                    {showHitcherDetails && hitcherNames && hitcherNames.length > index && hitcherNames[index] && (
                      <div className="relative">
                        <button 
                          className="flex items-center text-blue-500 text-xs border border-blue-500 rounded px-1 py-0.5"
                          onClick={(e) => handleProfileButtonClick(e, index)}
                        >
                          <UserCircle className="h-3 w-3 mr-1" />
                          Profile
                        </button>
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

      {/* Profile Modal - displays when a profile is clicked */}
      {selectedHitcherIndex !== null && hitcherNames && hitcherNames.length > selectedHitcherIndex && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="profile-modal-content bg-white rounded-lg p-4 max-w-xs w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-gray-900 pointer-events-none">Hitcher Profile</h3>
              <button 
                onClick={closeProfileModal} 
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 pointer-events-none">
              <p className="text-base font-medium text-gray-900">{getFirstName(hitcherNames[selectedHitcherIndex])}</p>
              {hitcherPhones && hitcherPhones.length > selectedHitcherIndex && (
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Phone:</span>
                  <span className="text-gray-900">+91 {hitcherPhones[selectedHitcherIndex].substring(3)}</span>
                </div>
              )}
              {hitcherFares && hitcherFares.length > selectedHitcherIndex && (
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Fare:</span>
                  <span className="font-medium text-green-600">₹{hitcherFares[selectedHitcherIndex]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPreview;
