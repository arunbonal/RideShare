import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import axios from 'axios';
import api from '../utils/api'; // Import API utility
import { Navigate, Link } from 'react-router-dom';
import { Search } from 'lucide-react';

// Define interfaces for the data we'll be working with
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  srn?: string;
  isAdmin?: boolean;
  activeRoles?: {
    driver: boolean;
    hitcher: boolean;
  };
}

interface AdminRide {
  _id: string;
  date: string;
  direction: string;
  driver: {
    name: string;
    email: string;
    srn: string;
    phone: string;
  };
  status: string;
  hitchers?: {
    status: string;
  }[];
  availableSeats: number;
}

interface AdminIssue {
  _id: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  ride: {
    date: string;
    direction: string;
    from: string;
    to: string;
  };
  reporter: {
    name: string;
    email: string;
    phone: string;
    activeRoles?: {
      driver: boolean;
      hitcher: boolean;
    };
  };
  reportedUser: {
    name: string;
    email: string;
    phone: string;
    activeRoles?: {
      driver: boolean;
      hitcher: boolean;
    };
  };
  resolvedBy?: {
    name: string;
    email: string;
  };
  resolution?: string;
}

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [rides, setRides] = useState<AdminRide[]>([]);
  const [filteredRides, setFilteredRides] = useState<AdminRide[]>([]);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<AdminIssue[]>([]);
  const [activeTab, setActiveTab] = useState<string>('users');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rideSearchTerm, setRideSearchTerm] = useState<string>('');
  const [issueSearchTerm, setIssueSearchTerm] = useState<string>('');
  const [issueStatusFilter, setIssueStatusFilter] = useState<string>('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<AdminIssue | null>(null);
  const [resolution, setResolution] = useState<string>('');
  const [notification, setNotification] = useState<{ 
    show: boolean; 
    message: string; 
    type: 'success' | 'error' 
  }>({ show: false, message: '', type: 'success' });

  // Format name to show only first 3 words, but exclude PESU if it appears in the third position
  const formatName = (name: string) => {
    const words = name.split(' ');
    // Check if the third word is PESU and remove it
    if (words.length >= 3 && words[2].toUpperCase().startsWith('PESU')) {
      return words.slice(0, 2).join(' ');
    }
    return words.slice(0, 3).join(' ');
  };

  // Get just the first name
  const getFirstName = (name: string) => {
    return name.split(' ')[0];
  };

  // Use useEffect for initialization
  useEffect(() => {
    if (currentUser?.isAdmin) {
      fetchData();
    }
  }, [currentUser, activeTab]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(lowercaseSearch) ||
            (user.srn && user.srn.toLowerCase().includes(lowercaseSearch))
        )
      );
    }
  }, [searchTerm, users]);

  // Filter rides based on search term
  useEffect(() => {
    if (rideSearchTerm.trim() === '') {
      setFilteredRides(rides);
    } else {
      const lowercaseSearch = rideSearchTerm.toLowerCase();
      setFilteredRides(
        rides.filter(
          (ride) =>
            ride.driver.name.toLowerCase().includes(lowercaseSearch) ||
            (ride.driver.srn && ride.driver.srn.toLowerCase().includes(lowercaseSearch))
        )
      );
    }
  }, [rideSearchTerm, rides]);

  // Filter issues based on search term and filters
  useEffect(() => {
    let filtered = issues;
    
    // Apply search filter
    if (issueSearchTerm.trim() !== '') {
      const lowercaseSearch = issueSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (issue) =>
          issue.reporter.name.toLowerCase().includes(lowercaseSearch) ||
          issue.reportedUser.name.toLowerCase().includes(lowercaseSearch) ||
          issue.description.toLowerCase().includes(lowercaseSearch)
      );
    }
    
    // Apply status filter
    if (issueStatusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === issueStatusFilter);
    }
    
    // Apply type filter
    if (issueTypeFilter !== 'all') {
      filtered = filtered.filter(issue => issue.type === issueTypeFilter);
    }
    
    setFilteredIssues(filtered);
  }, [issueSearchTerm, issueStatusFilter, issueTypeFilter, issues]);

  // Redirect if not admin - this should be inside a useEffect or component body
  if (!currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchData = async () => {
    try {
      if (activeTab === 'users') {
        const response = await api.get('/api/admin/users');
        setUsers(response.data);
        setFilteredUsers(response.data);
      } else if (activeTab === 'rides') {
        const response = await api.get('/api/admin/rides');
        setRides(response.data);
        setFilteredRides(response.data);
      } else if (activeTab === 'issues') {
        const response = await api.get('/api/issues');
        setIssues(response.data);
        setFilteredIssues(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Failed to fetch data', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Add this helper function to format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // This will format as dd/mm/yyyy
  };

  // Add a function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
           ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const handleUpdateIssueStatus = async (issueId: string, status: string) => {
    try {
      await api.patch(
        `/api/issues/${issueId}/status`,
        { status, resolution }
      );
      
      showNotification('Issue status updated successfully', 'success');
      fetchData(); // Refresh issues data
      setSelectedIssue(null);
      setResolution('');
    } catch (error) {
      console.error('Error updating issue status:', error);
      showNotification('Failed to update issue status', 'error');
    }
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
            className={`py-2 px-4 ${activeTab === 'issues' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            Issues
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Users ({filteredUsers.length})</h2>
              
              {/* Search Bar */}
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search by name or SRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SRN</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">{formatName(user.name)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.srn || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isAdmin ? <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Admin</span> : null}
                        {user.activeRoles?.driver ? <span className="ml-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Driver</span> : null}
                        {user.activeRoles?.hitcher ? <span className="ml-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Hitcher</span> : null}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!user.isAdmin && (
                          <Link 
                            to={`/admin/users/${user._id}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                          >
                            View Details
                          </Link>
                        )}
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Rides ({filteredRides.length})</h2>
              
              {/* Ride Search Bar */}
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search by driver name or SRN..."
                  value={rideSearchTerm}
                  onChange={(e) => setRideSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SRN</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRides.map(ride => (
                    <tr key={ride._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(ride.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ride.direction === 'toCollege' ? 'To College' : 'From College'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getFirstName(ride.driver.name)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ride.driver.srn || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ride.driver.phone}
                      </td>
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
                        <Link 
                          to={`/admin/rides/${ride._id}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Issues ({filteredIssues.length})</h2>
              
              {/* Issue Search Bar */}
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={issueSearchTerm}
                  onChange={(e) => setIssueSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Issue Filters */}
            <div className="flex gap-4 mb-6">
              <select
                value={issueStatusFilter}
                onChange={(e) => setIssueStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="no-show">No Show</option>
                <option value="safety">Safety</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ride Date</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporter</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported User</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIssues.map(issue => (
                    <tr key={issue._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(issue.ride.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          issue.type === 'no-show' ? 'bg-red-100 text-red-800' :
                          issue.type === 'safety' ? 'bg-yellow-100 text-yellow-800' :
                          issue.type === 'payment' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`} title={issue.description}>
                          {issue.type.charAt(0).toUpperCase() + issue.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {getFirstName(issue.reporter.name)}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className={`inline-block px-2 py-0.5 rounded ${
                            issue.reporter.activeRoles?.driver ? 'bg-blue-100 text-blue-800' :
                            issue.reporter.activeRoles?.hitcher ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {issue.reporter.activeRoles?.driver ? 'Driver' :
                            issue.reporter.activeRoles?.hitcher ? 'Hitcher' : 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {issue.reporter.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {getFirstName(issue.reportedUser.name)}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className={`inline-block px-2 py-0.5 rounded ${
                            issue.reportedUser.activeRoles?.driver ? 'bg-blue-100 text-blue-800' :
                            issue.reportedUser.activeRoles?.hitcher ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {issue.reportedUser.activeRoles?.driver ? 'Driver' :
                            issue.reportedUser.activeRoles?.hitcher ? 'Hitcher' : 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {issue.reportedUser.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          issue.status === 'open' ? 'bg-red-100 text-red-800' :
                          issue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                          issue.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Issue Details Modal */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium">Issue Details</h3>
                <button
                  onClick={() => {
                    setSelectedIssue(null);
                    setResolution('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Issue Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Issue Type</h4>
                    <div className="mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        selectedIssue.type === 'no-show' ? 'bg-red-100 text-red-800' :
                        selectedIssue.type === 'safety' ? 'bg-yellow-100 text-yellow-800' :
                        selectedIssue.type === 'payment' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedIssue.type.charAt(0).toUpperCase() + selectedIssue.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="mt-1">
                      <select
                        value={selectedIssue.status}
                        onChange={(e) => setSelectedIssue({ ...selectedIssue, status: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Date Reported</h4>
                    <p className="mt-1 text-sm text-gray-900">{formatDateTime(selectedIssue.createdAt)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <div className="mt-1 text-sm text-gray-900 border p-3 rounded bg-gray-50 max-h-32 overflow-y-auto">
                      {selectedIssue.description || 'No description provided'}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Resolution Notes</h4>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                      placeholder="Add resolution notes..."
                    />
                  </div>
                </div>
                
                {/* Right Column - User and Ride Details */}
                <div className="space-y-4">
                  <div className="p-3 border rounded-md bg-blue-50">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Reporter</h4>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{selectedIssue.reporter.name}</p>
                      <p className="text-sm text-gray-600">{selectedIssue.reporter.phone || 'No phone number'}</p>
                      <p className="text-sm text-gray-600">{selectedIssue.reporter.email}</p>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedIssue.reporter.activeRoles?.driver ? 'bg-blue-100 text-blue-800' :
                          selectedIssue.reporter.activeRoles?.hitcher ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedIssue.reporter.activeRoles?.driver ? 'Driver' :
                          selectedIssue.reporter.activeRoles?.hitcher ? 'Hitcher' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-md bg-red-50">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Reported User</h4>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{selectedIssue.reportedUser.name}</p>
                      <p className="text-sm text-gray-600">{selectedIssue.reportedUser.phone || 'No phone number'}</p>
                      <p className="text-sm text-gray-600">{selectedIssue.reportedUser.email}</p>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedIssue.reportedUser.activeRoles?.driver ? 'bg-blue-100 text-blue-800' :
                          selectedIssue.reportedUser.activeRoles?.hitcher ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedIssue.reportedUser.activeRoles?.driver ? 'Driver' :
                          selectedIssue.reportedUser.activeRoles?.hitcher ? 'Hitcher' : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-md bg-green-50">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Ride Details</h4>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(selectedIssue.ride.date)}</p>
                      <p className="text-sm"><span className="font-medium">Direction:</span> {selectedIssue.ride.direction === 'toCollege' ? 'To College' : 'From College'}</p>
                      <p className="text-sm"><span className="font-medium">From:</span> {selectedIssue.ride.from}</p>
                      <p className="text-sm"><span className="font-medium">To:</span> {selectedIssue.ride.to}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedIssue(null);
                    setResolution('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={() => handleUpdateIssueStatus(selectedIssue._id, selectedIssue.status)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard; 