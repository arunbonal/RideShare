import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";

// Updated User interface to match the new schema
interface User {
  id: string;
  email: string;
  name: string;
  srn: string;
  gender: string;
  phone: string;
  homeAddress: string;
  distanceToCollege: number;
  activeRoles: {
    driver: boolean;
    hitcher: boolean;
  };
  driverProfileComplete: boolean;
  hitcherProfileComplete: boolean;
  driverProfile: {
    isActive: boolean;
    completedTripsAsDriver: number;
    rating: number;
    licenseImage: string;
    vehicle: {
      model: string;
      color: string;
      registrationNumber: string;
      seats: number;
    };
    pricePerKm: number;
    ratingCount: number;
  } | null;
  hitcherProfile: {
    isActive: boolean;
    completedTripsAsHitcher: number;
    rating: number;
    ratingCount: number;
  } | null;
}

// Updated Ride interface to match the backend schema
export interface Ride {
  _id: string;
  driver: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
  };
  hitchers?: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      phone: string;
      gender: string;
      hitcherProfile?: {
        rating: number;
        ratingCount: number;
      };
    };
    status: "pending" | "accepted" | "rejected" | "cancelled";
    pickupLocation?: string;
    dropoffLocation?: string;
    fare?: number;
    requestTime: Date;
    // hitcherFeedback: {
    //   rating: number;
    //   review: string;
    //   createdAt: Date;
    // };
    // driverFeedback: {
    //   rating: number;
    //   review: string;
    //   createdAt: Date;
    // };
  }>;
  from: string;
  to: string;
  date: string;
  toCollegeTime?: string;
  fromCollegeTime?: string;
  availableSeats: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  direction: "toCollege" | "fromCollege";
  note?: string;
  pricePerKm: number | undefined;
  totalFare: number;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateActiveRoles: (roles: {
    driver?: boolean;
    hitcher?: boolean;
  }) => Promise<void>;
  switchRole: (role: "driver" | "hitcher") => Promise<void>;
  updateDriverProfileComplete: (status: boolean) => Promise<void>;
  updateHitcherProfileComplete: (status: boolean) => Promise<void>;
  getCurrentRole: () => "driver" | "hitcher" | null;
  ride: Ride;
  setRide: React.Dispatch<React.SetStateAction<Ride>>;
  resetRide: () => void;
  allRides: Ride[];
  setAllRides: React.Dispatch<React.SetStateAction<Ride[]>>;
  fetchAllRides: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allRides, setAllRides] = useState<Ride[]>([]);

  // Rename the state variables
  const [ride, setRide] = useState<Ride>({
    _id: "",
    driver: {
      _id: currentUser?.id || "",
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      gender: currentUser?.gender || "",
    },
    from: "",
    to: "PES University Electronic City Campus",
    date: "",
    direction: "toCollege",
    toCollegeTime: "08:00",
    fromCollegeTime: "17:00",
    availableSeats: 4,
    status: "scheduled",
    note: "",
    hitchers: [],
    pricePerKm: undefined,
    totalFare: 0,
  });

  // Fetch current user data from the backend
  const fetchUserData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/profile`,
        {
          withCredentials: true,
        }
      );
      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching user data:", error);
      setCurrentUser(null);
      return null;
    }
  }, []);

  // Check authentication status on component mount
  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      setLoading(true);
      try {
        if (isMounted) {
          await fetchUserData();
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuthStatus();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [fetchUserData]);

  // Google login function
  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      // The actual redirect happens in the Login component
      // This function is mainly for state management
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        withCredentials: true,
      });
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current active role
  const getCurrentRole = useCallback(() => {
    if (!currentUser) return null;
    if (currentUser.activeRoles.driver) return "driver";
    if (currentUser.activeRoles.hitcher) return "hitcher";
    return null;
  }, [currentUser]);

  // Switch to a specific role (only one role can be active at a time)
  const switchRole = useCallback(
    async (role: "driver" | "hitcher") => {
      try {
        // Check if profile is complete for the selected role
        if (
          (role === "driver" && !currentUser?.driverProfileComplete) ||
          (role === "hitcher" && !currentUser?.hitcherProfileComplete)
        ) {
          throw new Error(`${role} profile is not complete`);
        }

        // Set the selected role as active and deactivate the other
        const roles = {
          driver: role === "driver",
          hitcher: role === "hitcher",
        };

        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/auth/active-roles`,
          roles,
          { withCredentials: true }
        );

        // Fetch fresh user data
        await fetchUserData();
      } catch (error) {
        console.error("Error switching role:", error);
        throw error;
      }
    },
    [currentUser, fetchUserData]
  );

  // Update active roles (used during initial setup)
  const updateActiveRoles = useCallback(
    async (roles: { driver?: boolean; hitcher?: boolean }) => {
      try {
        // Ensure only one role is active at a time
        const updatedRoles = {
          driver: false,
          hitcher: false,
          ...(roles.driver ? { driver: true, hitcher: false } : {}),
          ...(roles.hitcher ? { hitcher: true, driver: false } : {}),
        };

        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/auth/active-roles`,
          updatedRoles,
          { withCredentials: true }
        );

        // Fetch fresh user data
        await fetchUserData();
      } catch (error) {
        console.error("Error updating active roles:", error);
        throw error;
      }
    },
    [fetchUserData]
  );

  // Update driver profile completion status
  const updateDriverProfileComplete = useCallback(
    async (complete: boolean) => {
      try {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/auth/driver-profile-complete`,
          { complete },
          { withCredentials: true }
        );

        // Fetch fresh user data
        await fetchUserData();
      } catch (error) {
        console.error("Error updating driver profile status:", error);
        throw error;
      }
    },
    [fetchUserData]
  );

  // Update hitcher profile completion status
  const updateHitcherProfileComplete = useCallback(
    async (complete: boolean) => {
      try {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/auth/hitcher-profile-complete`,
          { complete },
          { withCredentials: true }
        );

        // Fetch fresh user data
        await fetchUserData();
      } catch (error) {
        console.error("Error updating hitcher profile status:", error);
        throw error;
      }
    },
    [fetchUserData]
  );

  const resetRide = useCallback(() => {
    setRide({
      _id: "",
      driver: {
        _id: currentUser?.id || "",
        name: currentUser?.name || "",
        email: currentUser?.email || "",
        phone: currentUser?.phone || "",
        gender: currentUser?.gender || "",
      },
      from: currentUser?.homeAddress || "",
      to: "PES University Electronic City Campus",
      date: "",
      direction: "toCollege",
      toCollegeTime: "08:00",
      fromCollegeTime: "17:00",
      availableSeats: currentUser?.driverProfile?.vehicle.seats || 4,
      status: "scheduled",
      note: "",
      hitchers: [],
      pricePerKm: undefined,
      totalFare: 0,
    });
  }, [currentUser]);

  const fetchAllRides = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/rides`,
        {
          withCredentials: true,
        }
      );
      setAllRides(response.data.rides);
    } catch (error) {
      console.error("Error fetching rides:", error);
      throw error;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentUser,
      loading,
      isAuthenticated: !!currentUser,
      loginWithGoogle,
      logout,
      updateActiveRoles,
      switchRole,
      updateDriverProfileComplete,
      updateHitcherProfileComplete,
      getCurrentRole,
      ride,
      setRide,
      resetRide,
      allRides,
      setAllRides,
      fetchAllRides,
    }),
    [
      currentUser,
      loading,
      loginWithGoogle,
      logout,
      updateActiveRoles,
      switchRole,
      updateDriverProfileComplete,
      updateHitcherProfileComplete,
      getCurrentRole,
      ride,
      setRide,
      resetRide,
      allRides,
      fetchAllRides,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
