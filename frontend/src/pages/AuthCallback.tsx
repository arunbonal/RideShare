import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import React from "react";
import { ArrowLeft } from "lucide-react";

// Use React.memo to prevent unnecessary rerenders of this component
const AuthCallback = React.memo(() => {
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Memoize the callback handler to avoid recreation on each render
  const handleCallback = useCallback(async () => {
    try {
      // Check if we already have a token directly in the URL (from Google redirect)
      const searchParams = new URLSearchParams(location.search);
      const token = searchParams.get("token");
      
      if (token) {
        // Store token in localStorage
        localStorage.setItem("authToken", token);
        
        // Redirect to home page, the Auth context will handle further redirection
        navigate("/", { replace: true });
        return;
      }
      
      // If we get here, there's no token in the URL
      setError("Authentication failed. Please try again.");
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
    } catch (err) {
      console.error("Error during auth callback:", err);
      setError("Authentication failed. Please try again.");
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 3000);
    }
  }, [location.search, navigate]);

  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm max-w-md w-full mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md shadow-sm hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return to login page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <LoadingSpinner />
    </div>
  );
});

export default AuthCallback; 