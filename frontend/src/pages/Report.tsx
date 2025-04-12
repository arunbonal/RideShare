import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Ride } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import api from "../utils/api"; // Import API utility
import { ArrowLeft, X, Bug } from "lucide-react";
import LoadingButton from "../components/LoadingButton";

interface ExtendedRide extends Ride {
  totalFare: number;
  hasIssue?: boolean;
  hitchers?: {
    user: {
      _id: string;
      name: string;
      email: string;
      phone: string;
      gender: string;
      srn?: string;
      hitcherProfile?: {
        reliabilityRate: number;
      };
    };
    status: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    fare?: number;
    requestTime: string;
  }[];
}

interface IssueForm {
  type: string;
  description: string;
}

interface BugReportForm {
  type: "bug" | "feature";
  title: string;
  description: string;
  browser: string;
  device: string;
  screenshot?: string;
}

const Report: React.FC = () => {
  const { currentUser, allRides, fetchAllRides } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reportType = location.state?.type || "ride"; // Default to ride issues
  
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [userRides, setUserRides] = useState<ExtendedRide[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<ExtendedRide[]>([]);
  const [pastRides, setPastRides] = useState<ExtendedRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<ExtendedRide | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    type: "no-show",
    description: ""
  });
  
  // New state for bug reports/feature requests
  const [bugReportForm, setBugReportForm] = useState<BugReportForm>({
    type: reportType === "bug" ? "bug" : "feature",
    title: "",
    description: "",
    browser: getBrowser(),
    device: getDevice(),
    screenshot: ""
  });
  
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({ show: false, message: "", type: "success" });
  const [rideIssues, setRideIssues] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Helper functions to detect browser and device
  function getBrowser() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    
    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = "Chrome";
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = "Firefox";
    } else if (userAgent.match(/safari/i)) {
      browserName = "Safari";
    } else if (userAgent.match(/opr\//i)) {
      browserName = "Opera";
    } else if (userAgent.match(/edg/i)) {
      browserName = "Edge";
    }
    
    return browserName;
  }

  function getDevice() {
    const userAgent = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return "Mobile";
    } else {
      return "Desktop";
    }
  }

  // Fetch all rides when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchAllRides();
    }
  }, [currentUser, fetchAllRides]);

  // Filter rides for the current user and separate into upcoming and past
  useEffect(() => {
    if (currentUser) {
      // Filter rides based on user role
      const currentUserRides = allRides.filter((ride) => {
        if (currentUser.activeRoles.driver) {
          return ride.driver._id === currentUser.id;
        } else if (currentUser.activeRoles.hitcher) {
          return ride.hitchers?.some(h => h.user._id === currentUser.id);
        }
        return false;
      }).map(ride => ({
        ...ride,
        totalFare: ride.totalFare || 0
      })) as ExtendedRide[];
      
      setUserRides(currentUserRides);

      const { upcomingRides, pastRides } = filterRides(currentUserRides);
      setUpcomingRides(upcomingRides);
      setPastRides(pastRides);

      // Check for existing issues for each ride and user combination
      currentUserRides.forEach(ride => {
        if (currentUser.activeRoles.driver) {
          // Driver can report issues for each hitcher
          ride.hitchers?.forEach(hitcher => {
            if (hitcher.status === "accepted") {
              checkExistingIssues(ride._id, hitcher.user._id);
            }
          });
        } else if (currentUser.activeRoles.hitcher) {
          // Hitcher can report issues for the driver
          checkExistingIssues(ride._id, ride.driver._id);
        }
      });
    }
  }, [allRides, currentUser]);

  // When filtering rides into past and upcoming categories
  const filterRides = (rides: ExtendedRide[]): { upcomingRides: ExtendedRide[], pastRides: ExtendedRide[] } => {
    const now = new Date();
    
    const upcomingRides = rides.filter((ride: ExtendedRide) => {
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
      }
      
      return (rideDate >= now || ride.status === "in-progress") && 
             ride.status !== "cancelled" && 
             ride.status !== "completed";
    });
    
    const pastRides = rides.filter((ride: ExtendedRide) => {
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
        
        const twoHoursAfterRide = new Date(rideDate);
        twoHoursAfterRide.setHours(twoHoursAfterRide.getHours() + 2);
        
        return now >= twoHoursAfterRide || 
               ride.status === "cancelled" || 
               ride.status === "completed";
      }
      
      return rideDate < now || 
             ride.status === "cancelled" || 
             ride.status === "completed";
    });
    
    return { upcomingRides, pastRides };
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${period}`;
  };

  const handleReportIssue = async (rideId: string, userId: string) => {
    try {
      setIssueSubmitting(true);
      // Check if an issue already exists for this ride
      const existingIssue = await api.get(
        `/api/issues/ride/${rideId}`
      );

      if (existingIssue.data.length > 0) {
        setNotification({
          show: true,
          message: "An issue has already been reported for this ride",
          type: "error"
        });
        setShowIssueModal(false);
        return;
      }

      await api.post(
        "/api/issues",
        {
          rideId,
          reportedUserId: userId,
          ...issueForm
        }
      );
      
      setNotification({
        show: true,
        message: "Issue reported successfully",
        type: "success"
      });
      
      // Refresh rides data
      await fetchAllRides();
      setShowIssueModal(false);
      setIssueForm({
        type: "no-show",
        description: ""
      });
    } catch (error: any) {
      console.error("Error reporting issue:", error);
      setNotification({
        show: true,
        message: error.response?.data?.message || "Failed to submit report. Please try again.",
        type: "error"
      });
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Auto-dismiss notification after 3 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Update the checkExistingIssues function
  const checkExistingIssues = async (rideId: string, reportedUserId: string) => {
    try {
      const response = await api.get(
        `/api/issues/ride/${rideId}`
      );
      
      // Check if there's an issue from current user to reported user
      const hasIssue = response.data.some(
        (issue: any) => 
          issue.reporter._id === currentUser?.id && 
          issue.reportedUser._id === reportedUserId
      );

      setRideIssues(prev => ({
        ...prev,
        [rideId]: {
          ...prev[rideId],
          [reportedUserId]: hasIssue
        }
      }));
    } catch (error) {
      console.error("Error checking existing issues:", error);
    }
  };

  const canReportIssue = (ride: ExtendedRide, hitcher?: { status: string }) => {
    // Don't allow reporting if ride is cancelled
    if (ride.status === "cancelled") {
      return false;
    }

    // For hitchers, check if their request was rejected
    if (hitcher && hitcher.status === "rejected") {
      return false;
    }

    return true;
  };

  // Modified bug report form submission to not require an event parameter
  const handleBugReportSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // More robust validation
      let errorMessage = "";
      
      if (!bugReportForm.type) {
        errorMessage = "Please select a report type (Bug or Feature)";
      } else if (!bugReportForm.title || bugReportForm.title.trim() === "") {
        errorMessage = "Title is required";
      } else if (!bugReportForm.description || bugReportForm.description.trim() === "") {
        errorMessage = "Description is required";
      }
      
      if (errorMessage) {
        setNotification({
          show: true,
          message: errorMessage,
          type: "error"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare basic report data
      const reportData: {
        type: "bug" | "feature";
        title: string;
        description: string;
        browser: string;
        device: string;
        screenshot?: string;
      } = {
        type: bugReportForm.type,
        title: bugReportForm.title,
        description: bugReportForm.description,
        browser: bugReportForm.browser || "Unknown",
        device: bugReportForm.device || "Unknown"
      };
      
      // Add screenshot if available (use the existing base64 string from the preview)
      if (bugReportForm.screenshot) {
        reportData.screenshot = bugReportForm.screenshot;
      }
      
      // Send the report data as JSON
      
      const response = await api.post("/api/bug-reports", reportData);
      
      if (response.data.success) {
        setNotification({
          show: true,
          message: bugReportForm.type === "bug" 
            ? "Bug report submitted successfully" 
            : "Feature request submitted successfully",
          type: "success"
        });
        
        // Clear form after successful submission
        setBugReportForm({
          type: bugReportForm.type,
          title: "",
          description: "",
          browser: getBrowser(),
          device: getDevice(),
          screenshot: ""
        });
        setSelectedFile(null);
        
        // Redirect back to dashboard after 2 seconds
        setTimeout(() => {
          navigate(currentUser?.activeRoles.driver ? "/driver/dashboard" : "/hitcher/dashboard");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      }
      
      setNotification({
        show: true,
        message: error.response?.data?.message || "Failed to submit report. Please try again.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file upload for screenshots
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if file is an image
      if (!file.type.match('image.*')) {
        setNotification({
          show: true,
          message: "Please select an image file",
          type: "error"
        });
        return;
      }
      
      // Check if file size is less than 500KB (not 5MB)
      if (file.size > 500 * 1024) {
        setNotification({
          show: true,
          message: "Image size should be less than 500KB",
          type: "error"
        });
        return;
      }
      
      // Store the file object for later FormData submission
      setSelectedFile(file);
      
      // Also display a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBugReportForm({
            ...bugReportForm,
            screenshot: e.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission via the traditional form submit event
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBugReportSubmit();
  };

  if (!currentUser) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-600">Please log in to report issues.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300 z-50 flex items-center`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-3 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-8">
          <button
            onClick={() => navigate(currentUser?.activeRoles.driver ? "/driver/dashboard" : "/hitcher/dashboard")}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all mb-6 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {reportType === "ride" ? "Report a Ride Issue" : reportType === "bug" ? "Report a Bug" : "Request a Feature"}
          </h1>
          <p className="text-gray-600">
            {reportType === "ride" 
              ? "Select a ride to report an issue" 
              : reportType === "bug" 
                ? "Help us improve by reporting any bugs you encounter" 
                : "Suggest a new feature that would improve your experience"}
          </p>
        </div>

        {/* Show different content based on report type */}
        {reportType === "ride" ? (
          // Ride issue reporting UI - existing code
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`py-4 px-6 font-medium text-sm border-b-2 ${
                    activeTab === "upcoming"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Upcoming Rides ({upcomingRides.length})
                </button>
                <button
                  onClick={() => setActiveTab("past")}
                  className={`py-4 px-6 font-medium text-sm border-b-2 ${
                    activeTab === "past"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Past Rides ({pastRides.length})
                </button>
              </nav>
            </div>

            {/* Ride listings */}
            <div className="space-y-6">
              {activeTab === "upcoming" ? (
                upcomingRides.length > 0 ? (
                  upcomingRides.map((ride) => (
                    <div
                      key={ride._id}
                      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedRide(ride)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {ride.direction === "toCollege"
                              ? "To College"
                              : "From College"}
                          </h3>
                          <p className="text-gray-500">
                            {format(new Date(ride.date), "EEEE, MMMM d, yyyy")}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-sm font-medium rounded-full ${
                            ride.status === "scheduled"
                              ? "bg-green-100 text-green-800"
                              : ride.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">Time:</span>
                          <span className="ml-2">
                            {ride.direction === "toCollege"
                              ? formatTime(ride.toCollegeTime || "")
                              : formatTime(ride.fromCollegeTime || "")}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">From:</span>
                          <span className="ml-2">{ride.from}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <span className="font-medium">To:</span>
                          <span className="ml-2">{ride.to}</span>
                        </div>
                      </div>

                      {/* Driver-specific content */}
                      {currentUser.activeRoles.driver && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 mb-2">Accepted Hitchers:</h4>
                          <div className="space-y-2">
                            {ride.hitchers
                              ?.filter((h) => h.status === "accepted")
                              .map((hitcher) => (
                                <div
                                  key={hitcher.user._id}
                                  className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                                >
                                  <div>
                                    <p className="font-medium">{hitcher.user.name}</p>
                                    <p className="text-sm text-gray-600">
                                      Fare: ₹{hitcher.fare}
                                    </p>
                                  </div>
                                  {!rideIssues[ride._id]?.[hitcher.user._id] && canReportIssue(ride) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRide(ride);
                                        setShowIssueModal(true);
                                      }}
                                      className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                    >
                                      Report Issue
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Hitcher-specific content */}
                      {currentUser.activeRoles.hitcher && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <div>
                              <p className="font-medium">Driver: {ride.driver.name}</p>
                              <p className="text-sm text-gray-600">
                                Fare: ₹{ride.hitchers?.find(h => h.user._id === currentUser.id)?.fare}
                              </p>
                            </div>
                            {!rideIssues[ride._id]?.[ride.driver._id] && canReportIssue(ride, ride.hitchers?.find(h => h.user._id === currentUser.id)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRide(ride);
                                  setShowIssueModal(true);
                                }}
                                className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              >
                                Report Issue
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      No upcoming rides
                    </h3>
                    <p className="text-gray-500">
                      You don't have any upcoming rides to report issues for.
                    </p>
                  </div>
                )
              ) : pastRides.length > 0 ? (
                pastRides.map((ride) => (
                  <div
                    key={ride._id}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRide(ride)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {ride.direction === "toCollege"
                            ? "To College"
                            : "From College"}
                        </h3>
                        <p className="text-gray-500">
                          {format(new Date(ride.date), "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-sm font-medium rounded-full ${
                          ride.status === "completed"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium">Time:</span>
                        <span className="ml-2">
                          {ride.direction === "toCollege"
                            ? formatTime(ride.toCollegeTime || "")
                            : formatTime(ride.fromCollegeTime || "")}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium">From:</span>
                        <span className="ml-2">{ride.from}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium">To:</span>
                        <span className="ml-2">{ride.to}</span>
                      </div>
                    </div>

                    {/* Driver-specific content */}
                    {currentUser.activeRoles.driver && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Accepted Hitchers:</h4>
                        <div className="space-y-2">
                          {ride.hitchers
                            ?.filter((h) => h.status === "accepted")
                            .map((hitcher) => (
                              <div
                                key={hitcher.user._id}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                              >
                                <div>
                                  <p className="font-medium">{hitcher.user.name}</p>
                                  <p className="text-sm text-gray-600">
                                    Fare: ₹{hitcher.fare}
                                  </p>
                                </div>
                                {!rideIssues[ride._id]?.[hitcher.user._id] && canReportIssue(ride) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRide(ride);
                                      setShowIssueModal(true);
                                    }}
                                    className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    Report Issue
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Hitcher-specific content */}
                    {currentUser.activeRoles.hitcher && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                          <div>
                            <p className="font-medium">Driver: {ride.driver.name}</p>
                            <p className="text-sm text-gray-600">
                              Fare: ₹{ride.hitchers?.find(h => h.user._id === currentUser.id)?.fare}
                            </p>
                          </div>
                          {!rideIssues[ride._id]?.[ride.driver._id] && canReportIssue(ride, ride.hitchers?.find(h => h.user._id === currentUser.id)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRide(ride);
                                setShowIssueModal(true);
                              }}
                              className="px-3 py-1 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                              Report Issue
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    No past rides
                  </h3>
                  <p className="text-gray-500">
                    You don't have any past rides to report issues for.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          // Bug report/Feature request UI
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleFormSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      value="bug"
                      checked={bugReportForm.type === "bug"}
                      onChange={() => setBugReportForm({ ...bugReportForm, type: "bug" })}
                    />
                    <span className="ml-2 flex items-center">
                      <Bug className="h-4 w-4 mr-1 text-red-500" />
                      Bug Report
                    </span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-blue-600"
                      value="feature"
                      checked={bugReportForm.type === "feature"}
                      onChange={() => setBugReportForm({ ...bugReportForm, type: "feature" })}
                    />
                    <span className="ml-2">Feature Request</span>
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={bugReportForm.type === "bug" ? "Brief description of the bug" : "Feature name or short description"}
                  value={bugReportForm.title}
                  onChange={(e) => setBugReportForm({ ...bugReportForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={bugReportForm.type === "bug" 
                    ? "Please describe the bug in as much detail as possible." 
                    : "Please describe the feature you'd like to see."}
                  value={bugReportForm.description}
                  onChange={(e) => setBugReportForm({ ...bugReportForm, description: e.target.value })}
                  required
                ></textarea>
              </div>

              {bugReportForm.type === "bug" && (
                <>
                  <div className="mb-6">
                    <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
                      Screenshot (optional)
                    </label>
                    <input
                      type="file"
                      id="screenshot"
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={handleScreenshotUpload}
                    />
                    {bugReportForm.screenshot && (
                      <div className="mt-2 relative">
                        <img 
                          src={bugReportForm.screenshot} 
                          alt="Screenshot preview" 
                          className="max-h-40 rounded-md border border-gray-300"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                          onClick={() => setBugReportForm({ ...bugReportForm, screenshot: "" })}
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label htmlFor="browser" className="block text-sm font-medium text-gray-700 mb-2">
                        Browser
                      </label>
                      <input
                        type="text"
                        id="browser"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={bugReportForm.browser}
                        onChange={(e) => setBugReportForm({ ...bugReportForm, browser: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-2">
                        Device
                      </label>
                      <input
                        type="text"
                        id="device"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={bugReportForm.device}
                        onChange={(e) => setBugReportForm({ ...bugReportForm, device: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(currentUser?.activeRoles.driver ? "/driver/dashboard" : "/hitcher/dashboard")}
                  className="mr-4 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={handleBugReportSubmit}
                  loadingText="Submitting..."
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  Submit
                </LoadingButton>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Issue Report Modal */}
      {showIssueModal && selectedRide && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Report an Issue</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Issue Type</label>
                <select
                  value={issueForm.type}
                  onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="no-show">No Show</option>
                  <option value="safety">Safety</option>
                  <option value="payment">Payment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="Please describe the issue in detail..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowIssueModal(false);
                    setIssueForm({
                      type: "no-show",
                      description: ""
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={issueSubmitting}
                >
                  Cancel
                </button>
                <LoadingButton
                  onClick={() => handleReportIssue(
                    selectedRide._id,
                    currentUser.activeRoles.driver
                      ? selectedRide.hitchers?.find(h => h.status === "accepted")?.user._id || ""
                      : selectedRide.driver._id
                  )}
                  disabled={!issueForm.description.trim() || issueSubmitting}
                  loadingText="Submitting..."
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Report
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Report; 