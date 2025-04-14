import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Ride } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import api from "../utils/api"; // Import API utility
import { ArrowLeft, X, Bug } from "lucide-react";
import LoadingButton from "../components/LoadingButton";
import heic2any from "heic2any"; // Import heic2any library for HEIC conversion
import LoadingSpinner from "../components/LoadingSpinner";

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
  const [redirecting, setRedirecting] = useState(false);
  const [dailyBugReportsCount, setDailyBugReportsCount] = useState<number>(0);

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
      // Filter out cancelled and completed rides from upcoming
      if (ride.status === "cancelled" || ride.status === "completed") {
        return false;
      }
      
      // For hitchers, filter out rides where they've cancelled or been rejected
      if (currentUser?.activeRoles.hitcher) {
        const hitcherInfo = ride.hitchers?.find(h => h.user._id === currentUser.id);
        if (hitcherInfo && 
           (hitcherInfo.status === "cancelled" || 
            hitcherInfo.status === "rejected" || 
            hitcherInfo.status === "cancelled-by-driver")) {
          return false;
        }
      }
      
      // For drivers, filter out rides they've cancelled
      if (currentUser?.activeRoles.driver && ride.driver._id === currentUser.id && ride.status === "cancelled") {
        return false;
      }
      
      // Check if the ride is in the future or currently in progress
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
      }
      
      return rideDate >= now || ride.status === "in-progress";
    });
    
    const pastRides = rides.filter((ride: ExtendedRide) => {
      // Consider all cancelled, rejected, or completed rides as past
      if (ride.status === "cancelled" || ride.status === "completed") {
        return true;
      }
      
      // For hitchers, include rides where they've cancelled or been rejected
      if (currentUser?.activeRoles.hitcher) {
        const hitcherInfo = ride.hitchers?.find(h => h.user._id === currentUser.id);
        if (hitcherInfo && 
           (hitcherInfo.status === "cancelled" || 
            hitcherInfo.status === "rejected" || 
            hitcherInfo.status === "cancelled-by-driver")) {
          return true;
        }
      }
      
      // For drivers, include rides they've cancelled
      if (currentUser?.activeRoles.driver && ride.driver._id === currentUser.id && ride.status === "cancelled") {
        return true;
      }
      
      // For other rides, check if they are in the past
      const rideDate = new Date(ride.date);
      const timeString = ride.direction === "toCollege" 
        ? ride.toCollegeTime 
        : ride.fromCollegeTime;
      
      if (timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        rideDate.setHours(hours, minutes, 0, 0);
        
        // If more than 2 hours have passed since the ride time, consider it past
        const twoHoursAfterRide = new Date(rideDate);
        twoHoursAfterRide.setHours(twoHoursAfterRide.getHours() + 2);
        
        return now >= twoHoursAfterRide;
      }
      
      return rideDate < now;
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
    // For hitchers, check if their request was rejected
    if (hitcher && hitcher.status === "rejected") {
      return false;
    }

    if (!currentUser) {
      return true;
    }

    // Check if the current user is a hitcher for this ride
    if (currentUser.activeRoles.hitcher && hitcher) {
      // Only prevent reporting if the hitcher cancelled the ride themselves
      // Allow hitcher to report if the driver cancelled the ride
      if (hitcher.status === "cancelled" && ride.status !== "cancelled") {
        return false;
      }

      // Allow reporting if the hitcher was previously accepted and then the ride was cancelled
      // This covers the case when a driver cancels a ride with accepted hitchers
      if (hitcher.status === "cancelled-by-driver" || hitcher.status === "accepted-then-cancelled") {
        return true;
      }
    }

    // Check if the current user is the driver for this ride
    if (currentUser.activeRoles.driver && ride.driver._id === currentUser.id) {
      // Prevent driver from reporting if they cancelled the ride themselves
      if (ride.status === "cancelled") {
        return false;
      }
      
      // Check if any hitcher cancelled after being accepted 
      // (this would be for completed or in-progress rides)
      const hasHitchersCancelled = ride.hitchers?.some(h => h.status === "cancelled") || false;
      if (hasHitchersCancelled) {
        return true;
      }
    }

    return true;
  };

  // Handle file upload for screenshots
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      let file = files[0];
      
      try {
        // Check if file is an image
        if (!file.type.match('image.*') && !file.name.match(/\.(jpg|jpeg|png|gif|heic|heif)$/i)) {
          setNotification({
            show: true,
            message: "Please select an image file",
            type: "error"
          });
          return;
        }
        
        // Check if file size is less than 1.5MB
        if (file.size > 1536 * 1024) {
          setNotification({
            show: true,
            message: "Image size should be less than 1.5MB. Please compress the image or select a smaller one.",
            type: "error"
          });
          return;
        }
        
        // Check if the file is in HEIC format
        if (file.type === "image/heic" || file.type === "image/heif" || 
            file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
          try {
            setNotification({
              show: true,
              message: "Converting image format...",
              type: "success"
            });
            
            // Convert HEIC to PNG using heic2any
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/png",
              quality: 0.8
            });
            
            // If it's an array, take the first item
            const pngBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            
            // Create a new File object from the blob
            file = new File([pngBlob], 
                      file.name.replace(/\.(heic|heif)$/i, '.png'), 
                      { type: 'image/png' });
            
            setNotification({
              show: true,
              message: "Image converted successfully",
              type: "success"
            });
          } catch (conversionError) {
            console.error("Error converting HEIC image:", conversionError);
            setNotification({
              show: true,
              message: "Failed to convert image format. Please try a different image.",
              type: "error"
            });
            return;
          }
        }
        
        // Compress the image before storing it
        const compressedFile = await compressImage(file);
        
        // Store the file object for later FormData submission
        setSelectedFile(compressedFile);
        
        // Also display a preview using FileReader
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setBugReportForm({
              ...bugReportForm,
              screenshot: reader.result as string
            });
          }
        };
        reader.onerror = () => {
          console.error("Error reading file:", reader.error);
          setNotification({
            show: true,
            message: "Error reading image file. Please try again.",
            type: "error"
          });
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error processing file:", error);
        setNotification({
          show: true,
          message: "Error processing image. Please try again.",
          type: "error"
        });
      }
    }
  };

  // Add a function to compress images
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Create an image element and load the file
      const img = new Image();
      img.onload = () => {
        // Set a target max dimension (width or height) for the compressed image
        const MAX_DIMENSION = 1200; // Adjust this value as needed
        
        // Calculate the new dimensions while preserving aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        
        // Resize the canvas to the new dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image on the canvas with the new dimensions
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert the canvas to a blob with reduced quality
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }

          // Check if we compressed enough - if not, compress more
          if (blob.size > 800 * 1024) { // If still more than 800KB
            // Try with even lower quality
            canvas.toBlob((smallerBlob) => {
              if (!smallerBlob) {
                reject(new Error('Failed to create smaller blob'));
                return;
              }
              
              // Create a new file from the blob
              const compressedFile = new File([smallerBlob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              
              console.log(`Compressed image size: ${compressedFile.size / 1024} KB`);
              resolve(compressedFile);
            }, 'image/jpeg', 0.5); // Very aggressive compression
          } else {
            // Create a new file from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            console.log(`Compressed image size: ${compressedFile.size / 1024} KB`);
            resolve(compressedFile);
          }
        }, 'image/jpeg', 0.7); // Medium compression
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Create a URL for the file
      img.src = URL.createObjectURL(file);
    });
  };

  // Add this function to check daily report limit
  const checkDailyReportLimit = async (): Promise<boolean> => {
    try {
      const response = await api.get('/api/bug-reports/daily-count');
      const count = response.data.count || 0;
      setDailyBugReportsCount(count);
      
      // If count is already 2 or more, return false (limit reached)
      return count < 2;
    } catch (error) {
      console.error("Error checking daily report limit:", error);
      // Show error notification to user
      setNotification({
        show: true,
        message: "Couldn't verify your daily report count. Please try again.",
        type: "error"
      });
      // Fail closed if we can't verify the count (don't allow more reports)
      return false;
    }
  };

  // Fetch the daily count on component mount and when switching to bug/feature tab
  useEffect(() => {
    if (reportType === "bug" || reportType === "feature") {
      checkDailyReportLimit();
    }
  }, [reportType]);

  // Modified bug report form submission to include limit check
  const handleBugReportSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Always check daily limit first and get fresh count
      const underLimit = await checkDailyReportLimit();
      
      if (!underLimit) {
        setNotification({
          show: true,
          message: "You've reached the limit of 2 reports per day. Please try again tomorrow.",
          type: "error"
        });
        setIsSubmitting(false);
        return;
      }
      
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
      
      // Prepare basic report data without screenshot
      const reportData: any = {
        type: bugReportForm.type,
        title: bugReportForm.title,
        description: bugReportForm.description,
        browser: bugReportForm.browser || "Unknown",
        device: bugReportForm.device || "Unknown"
      };
      
      // If we have a screenshot, apply extreme compression
      let screenshotData = null;
      if (bugReportForm.screenshot) {
        try {
          // Apply extreme compression 
          screenshotData = await applyExtremeCompression(bugReportForm.screenshot);
          
          // Log the size for debugging (can keep some console.logs)
          const finalSize = Math.ceil((screenshotData.length * 3) / 4) / 1024;
          console.log(`Original: ${Math.ceil((bugReportForm.screenshot.length * 3) / 4) / 1024} KB, Compressed: ${finalSize} KB`);
          
          // If still over 150KB (increased from 100KB), don't include it
          if (finalSize > 150) {
            setNotification({
              show: true,
              message: "Screenshot is still too large after compression. Submitting report without image.",
              type: "error"
            });
            screenshotData = null;
          }
        } catch (error) {
          console.error("Error compressing screenshot:", error);
          screenshotData = null;
        }
      }
      
      // First try to submit with the screenshot if we have it
      if (screenshotData) {
        try {
          reportData.screenshot = screenshotData;
          const response = await api.post("/api/bug-reports", reportData);
          
          if (response.data.success) {
            handleSubmissionSuccess();
            return;
          }
        } catch (error: any) {
          // If we get a payload too large error, try without the screenshot
          if (error.response && error.response.status === 413) {
            // Wait a moment before trying again
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            // For other errors, just throw to be caught by the outer catch
            throw error;
          }
        }
      }
      
      // If we get here, either we had no screenshot or the submission with screenshot failed
      // Try submitting without the screenshot
      delete reportData.screenshot;
      
      try {
        const response = await api.post("/api/bug-reports", reportData);
        
        if (response.data.success) {
          // If this succeeded but we had a screenshot that we couldn't send,
          // notify the user that their report was submitted without the image
          if (bugReportForm.screenshot && !reportData.screenshot) {
            setNotification({
              show: true,
              message: "Report submitted successfully, but without the screenshot due to size limitations.",
              type: "success"
            });
          } else {
            handleSubmissionSuccess();
          }
        }
      } catch (error) {
        // If even this fails, then throw to be caught by the outer catch
        throw error;
      }
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      } else if (error.request) {
        // Request was made but no response received
        console.error("Request made but no response:", error.request);
      } else {
        // Error setting up the request
        console.error("Error setting up request:", error.message);
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

  // Helper to handle successful submission
  const handleSubmissionSuccess = () => {
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
    
    // Show loading spinner while redirecting
    setRedirecting(true);
    
    // Redirect back to dashboard after 2 seconds
    setTimeout(() => {
      navigate(currentUser?.activeRoles.driver ? "/driver/dashboard" : "/hitcher/dashboard");
    }, 2000);
  };

  // Function for extreme image compression with better quality
  const applyExtremeCompression = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Calculate new dimensions - bigger than before for better readability
          let width = img.width;
          let height = img.height;
          
          // Less aggressive resizing (600px instead of 400px)
          const MAX_DIM = 600;
          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
          
          // Set canvas size
          canvas.width = width;
          canvas.height = height;
          
          // Apply some pre-processing with better quality
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to medium quality JPEG (0.5 instead of 0.3)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
          
          // Check if we need to go lower
          const currentSize = Math.ceil((compressedDataUrl.length * 3) / 4) / 1024;
          
          // If still too big, apply stronger compression but maintain readability
          if (currentSize > 150) {
            // Try with slightly reduced quality but keep colors
            canvas.width = Math.min(500, width);
            canvas.height = Math.min(500, height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Medium-low quality
            resolve(canvas.toDataURL('image/jpeg', 0.4));
          } else {
            resolve(compressedDataUrl);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image for compression'));
        };
        
        img.src = dataUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  // Handle form submission via the traditional form submit event
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleBugReportSubmit();
  };

  // Helper function to count accepted hitchers in a ride
  const countAcceptedHitchers = (ride: ExtendedRide): number => {
    if (!ride.hitchers || ride.hitchers.length === 0) {
      return 0;
    }
    
    // Look for hitchers with accepted status or any status indicating they were accepted before cancellation
    return ride.hitchers.filter(h => 
      h.status === "accepted" || 
      h.status === "accepted-then-cancelled" || 
      h.status === "cancelled-by-driver"
    ).length;
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
      
      {/* Loading Spinner when redirecting */}
      {redirecting && <LoadingSpinner fullScreen />}
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Notification Toast */}
        {notification.show && (
          <div
            className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            } transition-all duration-300 z-50`}
          >
            <span>{notification.message}</span>
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
                            ride.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : ride.status === "scheduled"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ride.status === "in-progress" 
                            ? "In Progress"
                            : ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
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
                      {currentUser.activeRoles.hitcher ? (
                        // For hitchers, show specific status detail for their ride
                        (() => {
                          const hitcherInfo = ride.hitchers?.find(h => h.user._id === currentUser.id);
                          const displayStatus = hitcherInfo 
                            ? (hitcherInfo.status === "cancelled-by-driver"
                               ? "Cancelled by Driver"
                               : hitcherInfo.status === "cancelled"
                               ? "Cancelled by You"
                               : hitcherInfo.status === "rejected"
                               ? "Rejected by Driver"
                               : ride.status === "completed"
                               ? "Completed"
                               : ride.status.charAt(0).toUpperCase() + ride.status.slice(1)) 
                            : (ride.status.charAt(0).toUpperCase() + ride.status.slice(1));
                          
                          return (
                            <span
                              className={`px-2 py-1 text-sm font-medium rounded-full ${
                                ride.status === "completed"
                                ? "bg-gray-100 text-gray-800"
                                : hitcherInfo?.status === "cancelled-by-driver" || hitcherInfo?.status === "cancelled" || hitcherInfo?.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {displayStatus}
                            </span>
                          );
                        })()
                      ) : (
                        // For drivers, show overall ride status
                        <span
                          className={`px-2 py-1 text-sm font-medium rounded-full ${
                            ride.status === "completed"
                              ? "bg-gray-100 text-gray-800"
                              : ride.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ride.status === "cancelled"
                            ? (() => {
                                // Count any hitchers that were accepted before cancellation
                                const acceptedHitchers = countAcceptedHitchers(ride);
                                
                                console.log("Report.tsx - Cancelled ride:", ride._id, "Accepted hitchers:", acceptedHitchers, "Hitcher statuses:", ride.hitchers?.map(h => h.status));
                                
                                return acceptedHitchers > 0 
                                  ? <>
                                      Cancelled by You
                                      <div className="text-xs mt-1 text-center">
                                        {acceptedHitchers} {acceptedHitchers === 1 ? 'hitcher affected' : 'hitchers affected'}
                                      </div>
                                    </>
                                  : "Cancelled by You";
                              })()
                            : ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </span>
                      )}
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
                        {/* Render only the Report Issue button directly for drivers */}
                        <div className="flex justify-end">
                          {!rideIssues[ride._id] && canReportIssue(ride) && (
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
                      accept="image/jpeg,image/png,image/gif,image/heic,image/heif"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      onChange={handleScreenshotUpload}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum file size: 1.5MB. Supported formats: JPEG, PNG, GIF, HEIC.
                    </p>
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

              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Daily reports: <span className={dailyBugReportsCount >= 2 ? 'text-red-600 font-bold' : 'font-medium'}>{dailyBugReportsCount}/2</span>
                </p>
                {dailyBugReportsCount >= 2 && (
                  <p className="text-sm text-red-600">Daily limit reached</p>
                )}
              </div>

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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-2 py-2"
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