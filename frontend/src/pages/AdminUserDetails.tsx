import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api'; // Import API utility
import { ArrowLeft, Save, Trash2, AlertTriangle } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  srn?: string;
  gender?: string;
  college?: string;
  homeAddress?: string;
  isAdmin?: boolean;
  activeRoles?: {
    driver: boolean;
    hitcher: boolean;
  };
  driverProfile?: {
    reliabilityRate: number;
    completedRides: number;
  };
  hitcherProfile?: {
    reliabilityRate: number;
    completedRides: number;
  };
}

const AdminUserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    srn: string;
    gender: string;
    college: string;
    homeAddress: string;
  }>({
    name: '',
    phone: '',
    srn: '',
    gender: '',
    college: '',
    homeAddress: '',
  });

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/admin/users/${id}`);
        setUser(response.data);
        setFormData({
          name: response.data.name || '',
          phone: response.data.phone || '',
          srn: response.data.srn || '',
          gender: response.data.gender || 'male',
          college: response.data.college || '',
          homeAddress: response.data.homeAddress || '',
        });
        setLoading(false);
      } catch (err: any) {
        setError('Failed to fetch user details');
        setLoading(false);
        console.error('Error fetching user details:', err);
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate gender field
    if (formData.gender !== 'male' && formData.gender !== 'female') {
      showNotification('Gender must be either Male or Female', 'error');
      return;
    }
    
    try {
      // Only send editable fields
      const editableData = {
        phone: formData.phone,
        gender: formData.gender,
        homeAddress: formData.homeAddress
      };
      
      await api.put(
        `/api/admin/users/${id}`,
        editableData
      );
      showNotification('User updated successfully', 'success');
    } catch (err: any) {
      console.error('Error updating user:', err);
      showNotification(err.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(
        `/api/admin/users/${id}`
      );
      showNotification('User deleted successfully', 'success');
      // Navigate back to admin dashboard after a short delay
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showNotification(
        err.response?.data?.error || 'Failed to delete user', 
        'error'
      );
      setShowDeleteModal(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  if (loading) {
    return (
      <>
        <AdminNavbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <AdminNavbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 text-red-800 p-4 rounded-md">
            <p>{error || 'User not found'}</p>
            <button
              onClick={() => navigate('/admin')}
              className="mt-2 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Notification */}
        {notification.show && (
          <div className={`p-4 mb-4 rounded ${notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {notification.message}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </button>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 focus:outline-none"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete User
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">User Details</h1>

          {/* User information section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">User Information</h2>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      readOnly
                      className="w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SRN
                    </label>
                    <input
                      type="text"
                      name="srn"
                      value={formData.srn}
                      readOnly
                      className="w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      College
                    </label>
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      readOnly
                      className="w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Home Address
                    </label>
                    <input
                      type="text"
                      name="homeAddress"
                      value={formData.homeAddress}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Email Address</p>
                  <p className="text-base">{user.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Active Roles</p>
                  <div className="flex gap-2 mt-1">
                    {user.activeRoles?.driver && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Driver
                      </span>
                    )}
                    {user.activeRoles?.hitcher && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        Hitcher
                      </span>
                    )}
                    {(!user.activeRoles?.driver && !user.activeRoles?.hitcher) && (
                      <span className="text-gray-500">No active roles</span>
                    )}
                  </div>
                </div>

                {user.driverProfile && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Driver Statistics</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm">Reliability: {user.driverProfile.reliabilityRate.toFixed(1)}%</p>
                      <p className="text-sm">Completed Rides: {user.driverProfile.completedRides}</p>
                    </div>
                  </div>
                )}

                {user.hitcherProfile && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hitcher Statistics</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm">Reliability: {user.hitcherProfile.reliabilityRate.toFixed(1)}%</p>
                      <p className="text-sm">Completed Rides: {user.hitcherProfile.completedRides}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center mb-4 text-red-600">
                <AlertTriangle className="h-6 w-6 mr-2" />
                <h2 className="text-xl font-bold">Confirm Deletion</h2>
              </div>
              
              <p className="mb-6">
                Are you sure you want to delete {user?.name}? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminUserDetails; 