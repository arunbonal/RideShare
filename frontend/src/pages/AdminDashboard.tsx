import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

// Define interfaces for the data we'll be working with
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  srn?: string;
  isAdmin?: boolean;
  activeRoles?: {
    driver: boolean;
    hitcher: boolean;
  };
  driverProfile?: {
    reliabilityRate: number;
  };
  hitcherProfile?: {
    reliabilityRate: number;
  };
}

interface AdminRide {
  _id: string;
  date: string;
  direction: string;
  driver: {
    name: string;
    email: string;
  };
  status: string;
  hitchers?: {
    status: string;
  }[];
  availableSeats: number;
}

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rides, setRides] = useState<AdminRide[]>([]);
  const [activeTab, setActiveTab] = useState<string>('users');
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [notification, setNotification] = useState<{ 
    show: boolean; 
    message: string; 
    type: 'success' | 'error' 
  }>({ show: false, message: '', type: 'success' });

  // Use useEffect for initialization
  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  // Redirect if not admin - this should be inside a useEffect or component body
  if (!currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchData = async () => {
    try {
      if (activeTab === 'users') {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
          withCredentials: true
        });
        setUsers(response.data);
      } else if (activeTab === 'rides') {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/rides`, {
          withCredentials: true
        });
        setRides(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to fetch data', 'error');
    }
  };

  const addAdmin = async () => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/add-admin`, 
        { email: newAdminEmail },
        { withCredentials: true }
      );
      setNewAdminEmail('');
      showNotification('Admin added successfully', 'success');
      fetchData();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      showNotification(error.response?.data?.error || 'Failed to add admin', 'error');
    }
  };

  const removeAdmin = async (email: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/remove-admin`, 
        { email },
        { withCredentials: true }
      );
      showNotification('Admin removed successfully', 'success');
      fetchData();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      showNotification(error.response?.data?.error || 'Failed to remove admin', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <>
      <AdminNavbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        {/* Tabs */}
        <div className="flex mb-6 border-b">
          <button 
            className={`py-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'rides' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('rides')}
          >
            Rides
          </button>
          <button 
            className={`py-2 px-4 ${activeTab === 'admins' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            Admin Management
          </button>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`p-4 mb-4 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">All Users ({users.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SRN</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver Reliability</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hitcher Reliability</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.srn || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isAdmin ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Admin</span> : null}
                        {user.activeRoles?.driver ? <span className="ml-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Driver</span> : null}
                        {user.activeRoles?.hitcher ? <span className="ml-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Hitcher</span> : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.driverProfile?.reliabilityRate ? `${user.driverProfile.reliabilityRate.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.hitcherProfile?.reliabilityRate ? `${user.hitcherProfile.reliabilityRate.toFixed(1)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rides' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">All Rides ({rides.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hitchers</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Seats</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rides.map(ride => (
                    <tr key={ride._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(ride.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{ride.direction === 'toCollege' ? 'To College' : 'From College'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{ride.driver.name} ({ride.driver.email})</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          ride.status === 'scheduled' ? 'bg-green-100 text-green-800' : 
                          ride.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          ride.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ride.hitchers?.filter(h => h.status === 'accepted').length || 0} accepted 
                        / {ride.hitchers?.filter(h => h.status === 'pending').length || 0} pending
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{ride.availableSeats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Management</h2>
            
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-2">Add New Admin</h3>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow"
                />
                <button 
                  onClick={addAdmin}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Admin
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-2">Current Admins</h3>
            <ul className="divide-y divide-gray-200">
              {users.filter(user => user.isAdmin).map(admin => (
                <li key={admin._id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{admin.name}</p>
                    <p className="text-sm text-gray-500">{admin.email}</p>
                  </div>
                  {admin.email !== currentUser?.email && (
                    <button
                      onClick={() => removeAdmin(admin.email)}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard; 