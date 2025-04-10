import React, { useState } from 'react';

interface LoadingButtonProps {
  onClick: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  onClick,
  className = "px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  disabled = false,
  children,
  loadingText = "Processing..."
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`${className} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''} 
                 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} 
                 transition-all duration-200 relative`}
    >
      {isLoading ? (
        <>
          <span className="inline-block opacity-0">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {loadingText}
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton; 