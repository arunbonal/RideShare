import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-lg shadow-xl">
        <img 
          src="/logo.svg"  
          alt="RideShare Logo" 
          className="h-20 w-20 mx-auto mb-4" 
        />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:opacity-90"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;