import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Map, User, Car, Clock, Bell } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../contexts/AuthContext";

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State to track which FAQ sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    features: false,
    driver: false,
    hitcher: false,
  });
  
  // Toggle expanded state for a section
  const toggleSection = (section: string) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section],
    });
  };
  
  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/profile/settings")}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </button>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
            <p className="text-gray-600 mt-2">Find answers to common questions about using our platform</p>
          </div>
          
          <div className="p-6">
            {/* General FAQs */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <button 
                className="w-full flex items-center justify-between text-left"
                onClick={() => toggleSection('general')}
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold">General Questions</h2>
                </div>
                {expandedSections.general ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {expandedSections.general && (
                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-600 mb-1">What is this platform for?</h3>
                    <p className="text-sm text-gray-700">
                      Our platform connects students within the same college campus who want to share rides. Drivers can offer rides, and hitchers can request to join rides, making commuting more affordable and sustainable.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-600 mb-1">How is my reliability score calculated?</h3>
                    <p className="text-sm text-gray-700">
                      Your reliability score is based on your ride history. Showing up for scheduled rides and not canceling once accepted contribute to a higher score. Maintaining above 80% is considered excellent.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Driver FAQs */}
            {currentUser?.activeRoles?.driver && (
              <div className="border-b border-gray-200 pb-4 mb-4">
                <button 
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => toggleSection('driver')}
                >
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold">For Drivers</h2>
                  </div>
                  {expandedSections.driver ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSections.driver && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What is auto-cancellation of hitcher request?</h3>
                      <p className="text-sm text-gray-700">
                        When you/any other driver accept a hitcher's request to join your ride, the system automatically cancels any conflicting ride requests they may have made for the same ride. This prevents double-booking and ensures hitchhikers don't accidentally reserve multiple seats for the same journey. It helps maintain scheduling integrity and provides a better experience for everyone.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">How many rides can I schedule per day?</h3>
                      <p className="text-sm text-gray-700">
                        As a driver, you can schedule a maximum of 2 rides per day - one to college and one from college. This limit helps ensure quality service and prevents scheduling conflicts. Plan your rides accordingly to make the most of your available slots.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What happens if I don't show up for a ride?</h3>
                      <p className="text-sm text-gray-700">
                        Not showing up for a scheduled ride without cancellation badly affects your reliability score. The penalty to your reliability rate is doubled compared to cancelling a ride. This policy encourages users to at least cancel rides they cannot fulfill rather than simply not showing up, which causes more inconvenience to other users.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">How far in advance can I book or offer rides?</h3>
                      <p className="text-sm text-gray-700">
                        You can schedule rides up to 7 days in advance. We recommend posting rides early to increase your chances of finding matches, but you can also create or request rides for the same day if needed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Hitcher FAQs */}
            {currentUser?.activeRoles?.hitcher && (
              <div className="border-b border-gray-200 pb-4 mb-4">
                <button 
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => toggleSection('hitcher')}
                >
                  <div className="flex items-center">
                    <Bell className="h-5 w-5 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold">For Hitchers</h2>
                  </div>
                  {expandedSections.hitcher ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSections.hitcher && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What is auto-cancellation of ride requests?</h3>
                      <p className="text-sm text-gray-700">
                        When a driver accepts your request to join their ride, the system automatically cancels any other pending ride requests you may have made for the same day and direction. This prevents you from accidentally being assigned to multiple rides at once and helps ensure you don't miss rides you've committed to.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What happens if I don't show up for a ride?</h3>
                      <p className="text-sm text-gray-700">
                        Not showing up for a scheduled ride without cancellation badly affects your reliability score. The penalty to your reliability rate is doubled compared to cancelling a ride. This policy encourages users to at least cancel rides they cannot fulfill rather than simply not showing up, which causes more inconvenience to other users.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What do the different reliability scores mean?</h3>
                      <p className="text-sm text-gray-700">
                        When browsing rides, you'll see drivers' reliability scores. Green (<span className="text-green-600">&gt;80%</span>) indicates highly reliable drivers, yellow (<span className="text-yellow-600">60-80%</span>) means moderate reliability, and red (<span className="text-red-600">&lt;60%</span>) suggests caution. Choose drivers with higher scores for a better experience.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-600 mb-1">What if I need to cancel my ride request?</h3>
                      <p className="text-sm text-gray-700">
                        You can cancel a requested or approved ride from your dashboard. Frequent cancellations of accepted rides will lower your score and may affect your ability to join rides in the future.
                      </p>
                    </div>
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

export default FAQ; 