import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import api from '../utils/api';
import { ArrowLeft, Calendar, Clock, MapPin, User, Users, Car, CreditCard, AlertTriangle } from 'lucide-react';

interface DetailedRide {
  _id: string;
  date: string;
  direction: string;
  from: string;
  to: string;
  toCollegeTime?: string;
  fromCollegeTime?: string;
  driver: {
    name: string;
    email: string;
    phone: string;
    srn: string;
    gender: string;
  };
  status: string;
  availableSeats: number;
  hitchers: {
    user: {
      name: string;
      email: string;
      phone: string;
      srn: string;
      gender: string;
    };
    status: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    fare: number;
  }[];
}

const AdminRideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const [ride, setRide] = useState<DetailedRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/admin/rides/${id}`);
        setRide(response.data);
      } catch (error: any) {
        console.error('Error fetching ride details:', error);
        setError(error.response?.data?.message || 'Failed to fetch ride details');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?.isAdmin) {
      fetchRideDetails();
    }
  }, [id, currentUser]);

  // Helper function to format time to AM/PM
  const formatTime = (time24: string | undefined): string => {
    if (!time24) return "Not specified";
    
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  // Format the date in a more readable format
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (!currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminNavbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-red-800 text-lg font-medium mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!ride) {
    return (
      <>
        <AdminNavbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-yellow-800 text-lg font-medium mb-2">Ride Not Found</h2>
            <p className="text-yellow-600">The requested ride could not be found.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
            aria-label="Back to admin dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Ride Details</h1>
          <div className="ml-auto">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              ride.status === 'scheduled' ? 'bg-green-100 text-green-800' : 
              ride.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
              ride.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Ride Info */}
          <div className="lg:col-span-2">
            {/* Ride Overview Card */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
              <div className="border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
                <h2 className="text-xl font-semibold text-white mb-1">Ride Overview</h2>
                <p className="text-blue-50">ID: {ride._id}</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date & Time */}
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Date</h3>
                      <p className="text-gray-900 font-medium">{formatDate(ride.date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Time</h3>
                      <p className="text-gray-900 font-medium">
                        {formatTime(ride.direction === 'toCollege' ? ride.toCollegeTime : ride.fromCollegeTime)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Direction & Seats */}
                  <div className="flex items-start">
                    <Car className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Direction</h3>
                      <p className="text-gray-900 font-medium">
                        {ride.direction === 'toCollege' ? 'To College' : 'From College'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Users className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Accepted Hitchers</h3>
                      <p className="text-gray-900 font-medium">{ride.hitchers.filter(h => h.status === 'accepted').length}</p>
                    </div>
                  </div>
                </div>
                
                {/* Locations */}
                <div className="mt-6 space-y-4">
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-0.5 h-full bg-gray-300"></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Pick-up Location</h3>
                      <p className="text-gray-900 font-medium">{ride.from}</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Drop-off Location</h3>
                      <p className="text-gray-900 font-medium">{ride.to}</p>
                    </div>
                  </div>
                </div>
                
                {/* Total Fare */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-500">Total Ride Fare</h3>
                    <p className="text-xl font-bold text-green-600">
                      ₹{ride.hitchers.reduce((total, hitcher) => {
                        return hitcher.status === 'accepted' ? total + hitcher.fare : total;
                      }, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Hitchers Card */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 p-6">
                <h2 className="text-xl font-semibold text-gray-900">Hitchers</h2>
                <p className="text-gray-500 text-sm">
                  {ride.hitchers.length} hitcher{ride.hitchers.length !== 1 ? 's' : ''} for this ride
                </p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {ride.hitchers.length > 0 ? (
                  ride.hitchers.map((hitcher, index) => (
                    <div key={index} className="p-6">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
                        <div className="flex items-center mb-3 md:mb-0">
                          <div className="bg-blue-100 p-2 rounded-full mr-3">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{hitcher.user.name}</h3>
                            <p className="text-sm text-gray-500">{hitcher.user.phone}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          hitcher.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          hitcher.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {hitcher.status.charAt(0).toUpperCase() + hitcher.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <p className="text-gray-500">Pickup:</p>
                            <p className="text-gray-900">{hitcher.pickupLocation || 'Not specified'}</p>
                          </div>
                        </div>
                        {ride.direction !== 'toCollege' && (
                          <div className="flex items-start">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                            <div>
                              <p className="text-gray-500">Dropoff:</p>
                              <p className="text-gray-900">{hitcher.dropoffLocation || 'Not specified'}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center md:col-span-2">
                          <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="flex items-baseline gap-1">
                            <p className="text-gray-500">Fare:</p>
                            <p className="text-lg font-semibold text-green-600">₹{hitcher.fare}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No hitchers for this ride</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Driver Info */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded-lg overflow-hidden sticky top-20">
              <div className="border-b border-gray-200 bg-gray-50 p-6">
                <h2 className="text-xl font-semibold text-gray-900">Driver</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-500 h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {ride.driver.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">{ride.driver.name}</h3>
                    <p className="text-sm text-gray-500">{ride.driver.gender}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="bg-white p-2 rounded-full mr-3">
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{ride.driver.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminRideDetails; 