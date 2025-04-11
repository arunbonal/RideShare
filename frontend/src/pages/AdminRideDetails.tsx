import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import api from '../utils/api';
import { ArrowLeft } from 'lucide-react';

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
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Ride Details</h1>
        </div>
        
        {/* Basic Ride Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Date: <span className="font-medium text-gray-900">{new Date(ride.date).toLocaleDateString('en-GB')}</span></p>
              <p className="text-gray-600">Direction: <span className="font-medium text-gray-900">{ride.direction === 'toCollege' ? 'To College' : 'From College'}</span></p>
              <p className="text-gray-600">Time: <span className="font-medium text-gray-900">{formatTime(ride.direction === 'toCollege' ? ride.toCollegeTime : ride.fromCollegeTime)}</span></p>
              <p className="text-gray-600">Status: 
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                  ride.status === 'scheduled' ? 'bg-green-100 text-green-800' : 
                  ride.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  ride.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-gray-600">From: <span className="font-medium text-gray-900">{ride.from}</span></p>
              <p className="text-gray-600">To: <span className="font-medium text-gray-900">{ride.to}</span></p>
              <p className="text-gray-600">Available Seats: <span className="font-medium text-gray-900">{ride.availableSeats}</span></p>
            </div>
          </div>
        </div>

        {/* Driver Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Driver Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <p className="text-gray-600">Name: <span className="font-medium text-gray-900">{ride.driver.name}</span></p>
            <p className="text-gray-600">SRN: <span className="font-medium text-gray-900">{ride.driver.srn}</span></p>
            <p className="text-gray-600">Phone: <span className="font-medium text-gray-900">{ride.driver.phone}</span></p>
            <p className="text-gray-600">Gender: <span className="font-medium text-gray-900">{ride.driver.gender}</span></p>
          </div>
        </div>

        {/* Hitchers Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Hitchers</h2>
          {ride.hitchers.length > 0 ? (
            ride.hitchers.map((hitcher, index) => (
              <div key={index} className="border-b last:border-0 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Name: <span className="font-medium text-gray-900">{hitcher.user.name}</span></p>
                    <p className="text-gray-600">SRN: <span className="font-medium text-gray-900">{hitcher.user.srn}</span></p>
                    <p className="text-gray-600">Phone: <span className="font-medium text-gray-900">{hitcher.user.phone}</span></p>
                    <p className="text-gray-600">Gender: <span className="font-medium text-gray-900">{hitcher.user.gender}</span></p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status: 
                      <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                        hitcher.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                        hitcher.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        hitcher.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {hitcher.status.charAt(0).toUpperCase() + hitcher.status.slice(1)}
                      </span>
                    </p>
                    <p className="text-gray-600">Pickup: <span className="font-medium text-gray-900">{hitcher.pickupLocation}</span></p>
                    <p className="text-gray-600">Dropoff: <span className="font-medium text-gray-900">{hitcher.dropoffLocation}</span></p>
                    <p className="text-gray-600">Fare: <span className="font-medium text-green-600">₹{hitcher.fare}</span></p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No hitchers for this ride</p>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminRideDetails; 