import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, Settings } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  if (!currentUser) return null;

  // Determine which dashboard links to show based on active roles
  const showDriverDashboard =
    currentUser.activeRoles?.driver && currentUser.driverProfileComplete;
  const showHitcherDashboard =
    currentUser.activeRoles?.hitcher && currentUser.hitcherProfileComplete;

  // Determine home route based on user's active role
  const getHomeRoute = () => {
    if (showDriverDashboard) return "/driver/dashboard";
    if (showHitcherDashboard) return "/hitcher/dashboard";
    return "/role-selection";
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to={getHomeRoute()} className="flex items-center">
              <span className="font-bold text-xl">RideShare</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            {showDriverDashboard && (
              <Link
                to="/driver/dashboard"
                className="px-3 py-2 rounded-md hover:bg-blue-700/50 transition-colors"
              >
                Driver Dashboard
              </Link>
            )}
            {showHitcherDashboard && (
              <>
                <Link
                  to="/hitcher/dashboard"
                  className="px-3 py-2 rounded-md hover:bg-blue-700/50 transition-colors"
                >
                  Hitcher Dashboard
                </Link>
                <Link
                  to="/rides/search"
                  className="px-3 py-2 rounded-md hover:bg-blue-700/50 transition-colors"
                >
                  Find Rides
                </Link>
              </>
            )}
            <Link
              to="/profile/settings"
              className="flex items-center px-3 py-2 rounded-md hover:bg-blue-700/50 transition-colors"
            >
              <Settings className="h-5 w-5 mr-1" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-md hover:bg-blue-700/50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-1" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md hover:bg-blue-700 focus:outline-none"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {showDriverDashboard && (
              <Link
                to="/driver/dashboard"
                className="block px-3 py-2 rounded-md hover:bg-blue-700"
                onClick={() => setIsMenuOpen(false)}
              >
                Driver Dashboard
              </Link>
            )}
            {showHitcherDashboard && (
              <>
                <Link
                  to="/hitcher/dashboard"
                  className="block px-3 py-2 rounded-md hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Hitcher Dashboard
                </Link>
                <Link
                  to="/rides/search"
                  className="block px-3 py-2 rounded-md hover:bg-blue-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Find Rides
                </Link>
              </>
            )}
            <Link
              to="/profile/settings"
              className="flex items-center px-3 py-2 rounded-md hover:bg-blue-700"
              onClick={() => setIsMenuOpen(false)}
            >
              <Settings className="h-5 w-5 mr-1" />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="flex items-center w-full text-left px-3 py-2 rounded-md hover:bg-blue-700"
            >
              <LogOut className="h-5 w-5 mr-1" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
