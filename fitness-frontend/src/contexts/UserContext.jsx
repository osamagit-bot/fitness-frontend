import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

// Create the context
const UserContext = createContext();

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// UserProvider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading for fallback UX
  const [userType, setUserType] = useState(null);

  const fetchUserData = async (token) => {
    try {
      const response = await api.get("auth-test/check/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("🔍 UserContext - Full response:", response.data);

      const userData = response.data;

      const athleteId =
        userData.athlete_id ||
        userData.member_id ||
        localStorage.getItem("memberId") ||
        localStorage.getItem("memberID");

      const enrichedUserData = {
        ...userData,
        athlete_id: athleteId,
      };

      console.log("🔍 UserContext - Enriched user data:", enrichedUserData);

      setUser(enrichedUserData);
      setUserType(enrichedUserData.userType);
      return enrichedUserData;
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      const cachedUser = localStorage.getItem("user");

      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          setUserType(parsedUser.userType || localStorage.getItem("userType"));
          setLoading(false);
        } catch (error) {
          console.error("Error parsing user data:", error);
          setLoading(false);
        }
      } else {
        fetchUserData(token);
      }
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const isAuthenticated = !!user;

  const value = {
    user,
    setUser,
    isAuthenticated,
    userType,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
