import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminNavbar from '../components/AdminNavbar';
import api from '../utils/api'; // Import API utility
import { Navigate, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';

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

// Add interface for AdminBugReport
interface AdminBugReport {
  _id: string;
  type: string;
  title: string;
  description: string;
  reporter: {
    name: string;
    email: string;
    phone: string;
  };
  browser?: string;
  device?: string;
  screenshot?: string;
  createdAt: string;
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
  const [notification, setNotification] = useState<{ 
    show: boolean; 
    message: string; 
    type: 'success' | 'error'  
  }>({ show: false, message: '', type: 'success' });
  const [bugReports, setBugReports] = useState<AdminBugReport[]>([]);
  const [filteredBugReports, setFilteredBugReports] = useState<AdminBugReport[]>([]);
  const [bugReportSearchTerm, setBugReportSearchTerm] = useState<string>('');
  const [bugReportTypeFilter, setBugReportTypeFilter] = useState<string>('all');
  const [selectedBugReport, setSelectedBugReport] = useState<AdminBugReport | null>(null);
  const [showBugReportModal, setShowBugReportModal] = useState<boolean>(false);
  const [loadingIssue, setLoadingIssue] = useState<string | null>(null);
  const [loadingBugReport, setLoadingBugReport] = useState<string | null>(null);

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

  // Filter bug reports based on search term and type filter
  useEffect(() => {
    let filtered = bugReports;
    
    // Apply search filter
    if (bugReportSearchTerm.trim() !== '') {
      const lowercaseSearch = bugReportSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.title.toLowerCase().includes(lowercaseSearch) ||
          report.reporter.name.toLowerCase().includes(lowercaseSearch) ||
          report.description.toLowerCase().includes(lowercaseSearch)
      );
    }
    
    // Apply type filter
    if (bugReportTypeFilter !== 'all') {
      filtered = filtered.filter(report => report.type === bugReportTypeFilter);
    }
    
    setFilteredBugReports(filtered);
  }, [bugReportSearchTerm, bugReportTypeFilter, bugReports]);

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
      } else if (activeTab === 'bug-reports') {
        const response = await api.get('/api/bug-reports');
        setBugReports(response.data.data);
        setFilteredBugReports(response.data.data);
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

  // Function to handle viewing issue details
  const viewIssueDetails = async (issue: AdminIssue) => {
    setLoadingIssue(issue._id);
    try {
      // You could fetch more details here if needed
      setSelectedIssue(issue);
    } finally {
      setLoadingIssue(null);
    }
  };

  // Function to handle viewing bug report details
  const viewBugReportDetails = async (report: AdminBugReport) => {
    setLoadingBugReport(report._id);
    try {
      // You could fetch more details here if needed
      setSelectedBugReport(report);
      setShowBugReportModal(true);
    } finally {
      setLoadingBugReport(null);
    }
  };

  return (
    <>
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            } transition-all duration-300 z-50`}
          >
            {notification.message}
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('users');
                setSearchTerm('');
              }}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => {
                setActiveTab('rides');
                setRideSearchTerm('');
              }}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'rides'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rides
            </button>
            <button
              onClick={() => {
                setActiveTab('issues');
                setIssueSearchTerm('');
                setIssueStatusFilter('all');
                setIssueTypeFilter('all');
              }}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'issues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Issues
            </button>
            <button
              onClick={() => {
                setActiveTab('bug-reports');
                setBugReportSearchTerm('');
                setBugReportTypeFilter('all');
              }}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'bug-reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bug Reports
            </button>
          </nav>
        </div>

        {/* Conditional content based on active tab */}
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
                        <LoadingButton
                          onClick={() => viewIssueDetails(issue)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                          loadingText="Loading..."
                          disabled={loadingIssue === issue._id}
                        >
                          View Details
                        </LoadingButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bug-reports' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title, reporter or description..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10"
                    value={bugReportSearchTerm}
                    onChange={(e) => setBugReportSearchTerm(e.target.value)}
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-1 gap-4 w-full sm:w-auto">
                <select
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white flex-1 sm:flex-none"
                  value={bugReportTypeFilter}
                  onChange={(e) => setBugReportTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="bug">Bug Reports</option>
                  <option value="feature">Feature Requests</option>
                </select>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Reporter
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Reported
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBugReports.length > 0 ? (
                      filteredBugReports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.type === 'bug'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {report.type === 'bug' ? 'Bug' : 'Feature'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {report.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {report.reporter.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {report.reporter.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(report.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <LoadingButton
                              onClick={() => viewBugReportDetails(report)}
                              className="text-blue-600 hover:text-blue-900"
                              loadingText="Loading..."
                              disabled={loadingBugReport === report._id}
                            >
                              Details
                            </LoadingButton>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No bug reports found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bug Report Details Modal */}
      {showBugReportModal && selectedBugReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedBugReport.type === 'bug' ? 'Bug Report' : 'Feature Request'} Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowBugReportModal(false);
                  setSelectedBugReport(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 divide-y divide-gray-200">
              {/* Title and Description */}
              <div className="py-3">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedBugReport.title}
                </h4>
                <div className="flex space-x-3 mb-3">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedBugReport.type === 'bug'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedBugReport.type === 'bug' ? 'Bug' : 'Feature'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedBugReport.description}
                </p>
              </div>

              {/* Reporter Information */}
              <div className="py-3">
                <h4 className="font-medium text-gray-900 mb-2">Reporter</h4>
                <div className="text-sm">
                  <p className="text-gray-700">{selectedBugReport.reporter.name}</p>
                  <p className="text-gray-500">{selectedBugReport.reporter.email}</p>
                  <p className="text-gray-500">{selectedBugReport.reporter.phone}</p>
                </div>
              </div>

              {/* Technical Details (for bug reports) */}
              {selectedBugReport.type === 'bug' && (
                <div className="py-3">
                  <h4 className="font-medium text-gray-900 mb-2">Technical Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Browser</p>
                      <p className="text-gray-700">{selectedBugReport.browser || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Device</p>
                      <p className="text-gray-700">{selectedBugReport.device || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Screenshot if available */}
              {selectedBugReport.screenshot && (
                <div className="py-3">
                  <h4 className="font-medium text-gray-900 mb-2">Screenshot</h4>
                  <img
                    src={selectedBugReport.screenshot}
                    alt="Screenshot"
                    className="max-w-full h-auto rounded-md border border-gray-200"
                  />
                </div>
              )}

              {/* Date Information */}
              <div className="py-3">
                <h4 className="font-medium text-gray-900 mb-2">Date Submitted</h4>
                <p className="text-sm text-gray-700">
                  {formatDateTime(selectedBugReport.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard; 