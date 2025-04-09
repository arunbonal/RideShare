import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import api from "../utils/api";

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
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
    };

    handleCallback();
  }, [location, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm max-w-md w-full mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:text-blue-800"
        >
          Return to login page
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner />
      <p className="text-gray-600 mt-4">Completing authentication...</p>
    </div>
  );
};

export default AuthCallback; 